<?php

namespace App\Http\Controllers;

use App\Models\ContenaReceivingNote;
use App\Models\CrnItem;
use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\TransactionLog;
use App\Models\RejectedItem;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CrnController extends Controller
{
    private const OPEN_PROCUREMENT_STATUSES = ['draft', 'submitted', 'partial'];

    public function index(Request $request): Response
    {
        $notes = ContenaReceivingNote::query()
            ->where('status', 'transferred')
            ->with(['creator:id,name', 'procurementOrder:id,code', 'items.itemVariant.item'])
            ->latest()
            ->get();

        $activeCrns = ContenaReceivingNote::query()
            ->whereIn('status', ['awaiting_shipping', 'shipping', 'arrived'])
            ->with(['procurementOrder:id,code', 'items.itemVariant.item'])
            ->latest()
            ->get();

        return Inertia::render('Warehouse/Crn/Index', [
            'notes' => $notes,
            'activeCrns' => $activeCrns,
            'pendingProcurements' => $this->buildPendingProcurementPayload(),
            'canManage' => in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_SUPER_ADMIN], true),
        ]);
    }

    public function updateEta(Request $request, ContenaReceivingNote $crn): JsonResponse
    {
        $this->authorizeManage($request);

        if (!$this->hasStatus($crn, 'awaiting_shipping')) {
            return response()->json([
                'message' => 'ETA can only be updated for CRN awaiting shipping.',
            ], 422);
        }

        $validated = $request->validate([
            'eta' => 'required|date|after_or_equal:today',
        ]);

        $crn->update([
            'eta' => $validated['eta'],
            'status' => 'shipping',
        ]);

        TransactionLog::record('crn_eta_updated', [
            'id' => $crn->id,
            'crn_number' => $crn->crn_number,
            'eta' => $crn->eta,
        ]);

        return response()->json([
            'message' => 'ETA updated and status set to Shipping.',
            'crn' => $crn,
        ]);
    }

    public function markAsArrived(Request $request, ContenaReceivingNote $crn): JsonResponse
    {
        $this->authorizeManage($request);

        // Allow 'shipping' or 'awaiting_shipping' to be marked as arrived for flexibility
        if (!in_array($crn->status, ['shipping', 'awaiting_shipping'], true)) {
            return response()->json([
                'message' => 'Only CRN in shipping or awaiting status can be marked as arrived.',
            ], 422);
        }

        $crn->update(['status' => 'arrived']);

        TransactionLog::record('crn_arrived', [
            'id' => $crn->id,
            'crn_number' => $crn->crn_number,
        ]);

        return response()->json([
            'message' => 'Shipment marked as Arrived. You can now process the stock checklist.',
            'crn' => $crn,
        ]);
    }

    public function downloadPdf(ContenaReceivingNote $crn): \Symfony\Component\HttpFoundation\Response
    {
        $crn->load(['procurementOrder', 'creator', 'items.itemVariant.item']);

        return Pdf::loadView('warehouse.crn-pdf', [
            'crn' => $crn,
            'generatedAt' => now(),
        ])->download("CRN-{$crn->crn_number}.pdf");
    }

    public function receiveProcurement(Request $request, ProcurementOrder $order): JsonResponse
    {
        if ($response = $this->ensureProcurementOrderOpen($order)) {
            return $response;
        }

        $validated = $request->validate([
            'remarks' => 'nullable|string|max:500',
            'lines' => 'required|array|min:1',
            'lines.*.line_id' => 'required|integer|distinct',
            'lines.*.received_qty' => 'required|integer|min:0',
            'lines.*.rejected_qty' => 'required|integer|min:0',
            'lines.*.rejection_reason' => 'nullable|string|max:255',
        ]);

        $lineInput = collect($validated['lines'])->keyBy(fn(array $line) => (int) $line['line_id']);

        $order->load('lines.item');

        // Pre-validate processable lines to avoid empty CRN/transaction
        $validLineCount = 0;
        foreach ($order->lines as $line) {
            $input = $lineInput->get($line->id);
            if (!$input) {
                continue;
            }

            $remaining = $this->remainingQuantity($line);
            if ($remaining <= 0) {
                continue;
            }

            $receivedQty = (int) $input['received_qty'];
            $rejectedQty = (int) $input['rejected_qty'];

            if (($receivedQty + $rejectedQty) > $remaining) {
                throw ValidationException::withMessages([
                    'lines' => ["Total received + rejected exceeds remaining quantity for SKU {$line->item?->sku}."],
                ]);
            }

            $validLineCount++;
        }

        if ($validLineCount === 0) {
            return response()->json([
                'message' => 'No valid lines to process. All lines are already fully received or rejected.',
            ], 422);
        }

        DB::transaction(function () use ($request, $order, $lineInput, $validated) {
            $transaction = $this->createInventoryTransaction(
                $request->user()->id,
                "Direct receive from PO: {$order->code}"
            );

            $crn = ContenaReceivingNote::create([
                'crn_number' => $this->generateCrnNumber(),
                'procurement_order_id' => $order->id,
                'received_at' => now(),
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $request->user()->id,
                'status' => 'transferred',
            ]);

            foreach ($order->lines as $line) {
                $input = $lineInput->get($line->id);
                if (!$input) {
                    continue;
                }

                $remaining = $this->remainingQuantity($line);
                if ($remaining <= 0) {
                    continue;
                }

                $receivedQty = (int) $input['received_qty'];
                $rejectedQty = (int) $input['rejected_qty'];

                if (($receivedQty + $rejectedQty) > $remaining) {
                    throw ValidationException::withMessages([
                        'lines' => ["Total received + rejected exceeds remaining quantity for SKU {$line->item?->sku}."],
                    ]);
                }

                $variant = $this->findOrCreateDefaultVariant((int) $line->item_id);

                $crnItem = $crn->items()->create([
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $remaining,
                    'received_qty' => $receivedQty,
                    'rejected_qty' => $rejectedQty,
                    'rejection_reason' => $input['rejection_reason'] ?? null,
                ]);

                $this->recordRejectionFromCrnItem(
                    $crnItem,
                    $crn,
                    (int) $line->item_id,
                    $request->user()->id
                );

                $this->applyReceivedStock($transaction, $variant, (int) $line->item_id, $receivedQty);

                $line->increment('received_quantity', $receivedQty);
                $line->increment('rejected_quantity', $rejectedQty);
            }

            $this->updateProcurementOrderStatus($order->id);

            TransactionLog::record('crn_po_received', [
                'crn_number' => $crn->crn_number,
                'po_code' => $order->code,
                'lines_count' => count($validated['lines']),
            ]);
        });

        return response()->json([
            'message' => 'Procurement checklist submitted. Stock and rejection updated.',
        ]);
    }

    public function safeProcurementLine(Request $request, ProcurementOrder $order, ProcurementOrderLine $line): JsonResponse
    {
        if ((int) $line->procurement_order_id !== (int) $order->id) {
            return response()->json([
                'message' => 'Line does not belong to this procurement order.',
            ], 422);
        }

        if ($response = $this->ensureProcurementOrderOpen($order)) {
            return $response;
        }

        $remaining = $this->remainingQuantity($line);
        if ($remaining <= 0) {
            return response()->json([
                'message' => 'This SKU line is already processed.',
            ], 422);
        }

        DB::transaction(function () use ($request, $order, $line, $remaining) {
            $variant = $this->findOrCreateDefaultVariant((int) $line->item_id);
            $transaction = $this->createInventoryTransaction(
                $request->user()->id,
                "Safe receive from PO: {$order->code}"
            );

            $this->applyReceivedStock($transaction, $variant, (int) $line->item_id, $remaining);

            $line->increment('received_quantity', $remaining);

            $this->updateProcurementOrderStatus($order->id);

            TransactionLog::record('crn_po_safe_receive', [
                'po_code' => $order->code,
                'sku' => $line->item?->sku,
                'quantity' => $remaining,
            ]);
        });

        return response()->json([
            'message' => 'Safe line received and stock updated.',
        ]);
    }

    public function create(): Response
    {
        $items = Item::query()
            ->with([
                'variants' => function ($query) {
                    $query->whereNull('color')->orWhere('color', '');
                }
            ])
            ->orderBy('sku')
            ->get(['id', 'sku', 'name', 'unit']);

        $defaultVariantByItemId = $items
            ->mapWithKeys(fn($item) => [$item->id => $item->variants->first()?->id]);

        $procurementOrders = ProcurementOrder::query()
            ->whereIn('status', self::OPEN_PROCUREMENT_STATUSES)
            ->with([
                'lines' => function ($query) {
                    $query->with([
                        'item:id,sku,name,unit',
                    ])->orderBy('id');
                },
            ])
            ->get(['id', 'code'])
            ->map(function ($order) use ($defaultVariantByItemId) {
                $lines = $this->mapPendingProcurementLines($order->lines, $defaultVariantByItemId);

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'lines' => $lines,
                ];
            })
            ->filter(fn(array $order) => $order['lines']->isNotEmpty())
            ->values();

        return Inertia::render('Warehouse/Crn/Create', [
            'procurementOrders' => $procurementOrders,
            'items' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'procurement_order_id' => 'nullable|exists:procurement_orders,id',
            'received_at' => 'required|date',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|exists:item_variants,id',
            'items.*.expected_qty' => 'required|integer|min:1',
            'items.*.received_qty' => 'required|integer|min:0',
            'items.*.rejected_qty' => 'required|integer|min:0',
            'items.*.rejection_reason' => 'nullable|string',
        ]);

        foreach ($validated['items'] as $index => $item) {
            if (((int) $item['received_qty'] + (int) $item['rejected_qty']) > (int) $item['expected_qty']) {
                throw ValidationException::withMessages([
                    "items.$index.received_qty" => 'Received and rejected quantities cannot exceed expected quantity.',
                ]);
            }
        }

        $crn = DB::transaction(function () use ($request, $validated) {
            $variantItemIds = ItemVariant::query()
                ->whereIn('id', collect($validated['items'])->pluck('item_variant_id')->unique()->values())
                ->pluck('item_id', 'id');

            $crn = ContenaReceivingNote::create([
                'crn_number' => $this->generateCrnNumber(),
                'procurement_order_id' => $validated['procurement_order_id'] ?? null,
                'received_at' => $validated['received_at'],
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $request->user()->id,
                'status' => 'draft',
            ]);

            foreach ($validated['items'] as $item) {
                $crnItem = $crn->items()->create($item);

                if (!$crn->procurement_order_id) {
                    $itemId = (int) ($variantItemIds[$crnItem->item_variant_id] ?? 0);
                    $this->recordRejectionFromCrnItem(
                        $crnItem,
                        $crn,
                        $itemId,
                        $request->user()->id
                    );
                }
            }

            return $crn;
        });

        TransactionLog::record('crn_created', [
            'id' => $crn->id,
            'crn_number' => $crn->crn_number,
            'items_count' => count($validated['items']),
        ]);

        return response()->json([
            'message' => 'CRN created successfully.',
            'data' => $crn->load('items.itemVariant.item'),
        ], 201);
    }

    public function transfer(Request $request, ContenaReceivingNote|int $crn): JsonResponse
    {
        if (!$crn instanceof ContenaReceivingNote) {
            $crn = ContenaReceivingNote::findOrFail($crn);
        }

        if ($crn->status === 'transferred') {
            return response()->json(['message' => 'CRN already transferred.'], 422);
        }

        DB::transaction(function () use ($request, $crn) {
            $transaction = $this->createInventoryTransaction(
                $request->user()->id,
                "Transfer from CRN: {$crn->crn_number}"
            );

            $crn->load('items.itemVariant');

            foreach ($crn->items as $item) {
                if (!$item->itemVariant) {
                    continue;
                }

                $this->applyReceivedStock(
                    $transaction,
                    $item->itemVariant,
                    (int) $item->itemVariant->item_id,
                    (int) $item->received_qty
                );

                $this->recordRejectionFromCrnItem(
                    $item,
                    $crn,
                    (int) $item->itemVariant->item_id,
                    $request->user()->id
                );

                if ($crn->procurement_order_id) {
                    $poLine = ProcurementOrderLine::query()
                        ->where('procurement_order_id', $crn->procurement_order_id)
                        ->where('item_id', $item->itemVariant->item_id)
                        ->first();

                    if ($poLine) {
                        $poLine->increment('received_quantity', (int) $item->received_qty);
                        $poLine->increment('rejected_quantity', (int) $item->rejected_qty);
                    }
                }
            }

            $crn->update(['status' => 'transferred']);

            if ($crn->procurement_order_id) {
                $this->updateProcurementOrderStatus($crn->procurement_order_id);
            }

            TransactionLog::record('crn_transferred', [
                'id' => $crn->id,
                'crn_number' => $crn->crn_number,
                'items_count' => $crn->items->count(),
            ]);
        });

        return response()->json([
            'message' => 'CRN transferred to stock and rejections successfully.',
        ]);
    }

    private function buildPendingProcurementPayload(): Collection
    {
        return ProcurementOrder::query()
            ->whereIn('status', self::OPEN_PROCUREMENT_STATUSES)
            ->whereHas('crns', function ($q) {
                $q->where('status', 'arrived');
            })
            ->with([
                'lines.item:id,sku,name,unit',
            ])
            ->latest('id')
            ->get(['id', 'code', 'status', 'created_at'])
            ->map(function ($order) {
                $lines = $this->mapPendingProcurementLines($order->lines);

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'status' => $order->status,
                    'created_at' => optional($order->created_at)->toDateString(),
                    'lines' => $lines,
                ];
            })
            ->filter(fn(array $order) => $order['lines']->isNotEmpty())
            ->values();
    }

    private function authorizeManage(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_SUPER_ADMIN], true),
            403
        );
    }

    private function hasStatus(ContenaReceivingNote $crn, string $expected): bool
    {
        if ((string) $crn->status === $expected) {
            return true;
        }

        return ContenaReceivingNote::query()
            ->whereKey($crn->getKey())
            ->where('status', $expected)
            ->exists();
    }

    private function ensureProcurementOrderOpen(ProcurementOrder $order): ?JsonResponse
    {
        if (in_array($order->status, self::OPEN_PROCUREMENT_STATUSES, true)) {
            return null;
        }

        // Backward compatibility for legacy status values used before CRN flow was normalized.
        if (!in_array($order->status, ['received', 'fulfilled', 'closed', 'cancelled'], true)) {
            return null;
        }

        return response()->json([
            'message' => 'Procurement order is already processed.',
        ], 422);
    }

    private function mapPendingProcurementLines(
        Collection $lines,
        ?Collection $defaultVariantByItemId = null
    ): Collection {
        return $lines
            ->map(function ($line) use ($defaultVariantByItemId) {
                $remaining = $this->remainingQuantity($line);

                if ($remaining <= 0 || !$line->item) {
                    return null;
                }

                return [
                    'line_id' => $line->id,
                    'item_id' => $line->item_id,
                    'item_variant_id' => $defaultVariantByItemId?->get($line->item_id),
                    'sku' => $line->item->sku,
                    'name' => $line->item->name,
                    'unit' => $line->item->unit,
                    'remaining_qty' => $remaining,
                ];
            })
            ->filter()
            ->values();
    }

    private function createInventoryTransaction(int $userId, string $notes): InventoryTransaction
    {
        return InventoryTransaction::create([
            'type' => 'in',
            'mode' => 'alacarte',
            'created_by' => $userId,
            'notes' => $notes,
        ]);
    }

    private function recordRejectionFromCrnItem(
        CrnItem $crnItem,
        ContenaReceivingNote $crn,
        int $itemId,
        int $userId
    ): void {
        if ((int) $crnItem->rejected_qty <= 0 || $itemId <= 0) {
            return;
        }

        RejectedItem::query()->firstOrCreate(
            [
                'rejectable_type' => CrnItem::class,
                'rejectable_id' => $crnItem->id,
            ],
            [
                'procurement_order_id' => $crn->procurement_order_id,
                'crn_id' => $crn->id,
                'item_id' => $itemId,
                'item_variant_id' => $crnItem->item_variant_id,
                'quantity' => (int) $crnItem->rejected_qty,
                'reason' => $crnItem->rejection_reason,
                'rejected_at' => $crn->received_at ?? $crnItem->updated_at ?? now(),
                'created_by' => $userId,
            ]
        );
    }

    private function applyReceivedStock(
        InventoryTransaction $transaction,
        ItemVariant $variant,
        int $itemId,
        int $receivedQty
    ): void {
        if ($receivedQty <= 0) {
            return;
        }

        $transaction->lines()->create([
            'item_id' => $itemId,
            'item_variant_id' => $variant->id,
            'quantity' => $receivedQty,
        ]);

        $variant->increment('stock_initial', $receivedQty);
        $variant->increment('stock_current', $receivedQty);
    }

    private function remainingQuantity(ProcurementOrderLine $line): int
    {
        return max(
            (int) $line->ordered_quantity - (int) $line->received_quantity - (int) $line->rejected_quantity,
            0
        );
    }

    private function generateCrnNumber(): string
    {
        $prefix = 'CRN-' . now()->format('Ymd');

        do {
            $number = $prefix . '-' . Str::upper(Str::random(4));
        } while (ContenaReceivingNote::where('crn_number', $number)->exists());

        return $number;
    }

    private function updateProcurementOrderStatus(int $poId): void
    {
        $po = ProcurementOrder::with('lines')->find($poId);
        if (!$po) {
            return;
        }

        $lines = $po->lines;
        $allProcessed = $lines->every(function ($line) {
            return ((int) $line->received_quantity + (int) $line->rejected_quantity) >= (int) $line->ordered_quantity;
        });

        $status = $allProcessed ? 'received' : 'partial';

        $po->update(['status' => $status]);
    }

    private function findOrCreateDefaultVariant(int $itemId): ItemVariant
    {
        $variant = ItemVariant::query()
            ->where('item_id', $itemId)
            ->where(function ($query) {
                $query->whereNull('color')->orWhere('color', '');
            })
            ->first();

        if ($variant) {
            return $variant;
        }

        return ItemVariant::create([
            'item_id' => $itemId,
            'color' => null,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);
    }
}
