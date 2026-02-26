<?php

namespace App\Http\Controllers;

use App\Models\ContenaReceivingNote;
use App\Models\CrnItem;
use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CrnController extends Controller
{
    public function index(Request $request): Response
    {
        $notes = ContenaReceivingNote::query()
            ->with(['creator:id,name', 'procurementOrder:id,code'])
            ->latest()
            ->get();

        $pendingProcurements = ProcurementOrder::query()
            ->whereIn('status', ['draft', 'partial'])
            ->with([
                'lines.item:id,sku,name,unit',
            ])
            ->latest('id')
            ->get(['id', 'code', 'status', 'created_at'])
            ->map(function ($order) {
                $lines = $order->lines
                    ->map(function ($line) {
                        $remaining = max((int) $line->ordered_quantity - (int) $line->received_quantity - (int) $line->rejected_quantity, 0);
                        if ($remaining <= 0 || ! $line->item) {
                            return null;
                        }

                        return [
                            'line_id' => $line->id,
                            'item_id' => $line->item_id,
                            'sku' => $line->item->sku,
                            'name' => $line->item->name,
                            'unit' => $line->item->unit,
                            'remaining_qty' => $remaining,
                        ];
                    })
                    ->filter()
                    ->values();

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'status' => $order->status,
                    'created_at' => optional($order->created_at)->toDateString(),
                    'lines' => $lines,
                ];
            })
            ->filter(fn ($order) => $order['lines']->isNotEmpty())
            ->values();

        return Inertia::render('Warehouse/Crn/Index', [
            'notes' => $notes,
            'pendingProcurements' => $pendingProcurements,
            'canManage' => in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_SUPER_ADMIN], true),
        ]);
    }

    public function receiveProcurement(Request $request, ProcurementOrder $order): JsonResponse
    {
        if (! in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_SUPER_ADMIN], true)) {
            abort(403, 'Unauthorized role.');
        }

        if (! in_array($order->status, ['draft', 'partial'], true)) {
            return response()->json([
                'message' => 'Procurement order is already processed.',
            ], 422);
        }

        $validated = $request->validate([
            'remarks' => 'nullable|string|max:500',
            'lines' => 'required|array|min:1',
            'lines.*.line_id' => 'required|integer|distinct',
            'lines.*.received_qty' => 'required|integer|min:0',
            'lines.*.rejected_qty' => 'required|integer|min:0',
            'lines.*.rejection_reason' => 'nullable|string|max:255',
        ]);

        $lineInput = collect($validated['lines'])->keyBy(fn ($line) => (int) $line['line_id']);

        $order->load('lines.item');

        DB::transaction(function () use ($request, $order, $lineInput, $validated) {
            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'created_by' => $request->user()->id,
                'notes' => "Direct receive from PO: {$order->code}",
            ]);

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
                if (! $input) {
                    continue;
                }

                $remaining = max((int) $line->ordered_quantity - (int) $line->received_quantity - (int) $line->rejected_quantity, 0);
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

                $crn->items()->create([
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $remaining,
                    'received_qty' => $receivedQty,
                    'rejected_qty' => $rejectedQty,
                    'rejection_reason' => $input['rejection_reason'] ?? null,
                ]);

                if ($receivedQty > 0) {
                    $transaction->lines()->create([
                        'item_id' => $line->item_id,
                        'item_variant_id' => $variant->id,
                        'quantity' => $receivedQty,
                    ]);

                    $variant->increment('stock_initial', $receivedQty);
                    $variant->increment('stock_current', $receivedQty);
                }

                $line->increment('received_quantity', $receivedQty);
                $line->increment('rejected_quantity', $rejectedQty);
            }

            $this->updateProcurementOrderStatus($order->id);
        });

        return response()->json([
            'message' => 'Procurement checklist submitted. Stock and rejection updated.',
        ]);
    }

    public function safeProcurementLine(Request $request, ProcurementOrder $order, ProcurementOrderLine $line): JsonResponse
    {
        if (! in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_SUPER_ADMIN], true)) {
            abort(403, 'Unauthorized role.');
        }

        if ((int) $line->procurement_order_id !== (int) $order->id) {
            return response()->json([
                'message' => 'Line does not belong to this procurement order.',
            ], 422);
        }

        if (! in_array($order->status, ['draft', 'partial'], true)) {
            return response()->json([
                'message' => 'Procurement order is already processed.',
            ], 422);
        }

        $remaining = max((int) $line->ordered_quantity - (int) $line->received_quantity - (int) $line->rejected_quantity, 0);
        if ($remaining <= 0) {
            return response()->json([
                'message' => 'This SKU line is already processed.',
            ], 422);
        }

        DB::transaction(function () use ($request, $order, $line, $remaining) {
            $variant = $this->findOrCreateDefaultVariant((int) $line->item_id);

            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'created_by' => $request->user()->id,
                'notes' => "Safe receive from PO: {$order->code}",
            ]);

            $transaction->lines()->create([
                'item_id' => $line->item_id,
                'item_variant_id' => $variant->id,
                'quantity' => $remaining,
            ]);

            $variant->increment('stock_initial', $remaining);
            $variant->increment('stock_current', $remaining);

            $line->increment('received_quantity', $remaining);

            $this->updateProcurementOrderStatus($order->id);
        });

        return response()->json([
            'message' => 'Safe line received and stock updated.',
        ]);
    }

    public function create(): Response
    {
        $items = Item::query()
            ->with(['variants' => function ($query) {
                $query->whereNull('color')->orWhere('color', '');
            }])
            ->orderBy('sku')
            ->get(['id', 'sku', 'name', 'unit']);

        $defaultVariantByItemId = $items
            ->mapWithKeys(function ($item) {
                return [$item->id => $item->variants->first()?->id];
            });

        $procurementOrders = ProcurementOrder::query()
            ->whereIn('status', ['draft', 'partial'])
            ->with([
                'lines' => function ($query) {
                    $query->with([
                        'item:id,sku,name,unit',
                    ])->orderBy('id');
                },
            ])
            ->get(['id', 'code'])
            ->map(function ($order) {
                $lines = $order->lines
                    ->map(function ($line) {
                        $remaining = max(
                            (int) $line->ordered_quantity - (int) $line->received_quantity - (int) $line->rejected_quantity,
                            0
                        );

                        if ($remaining <= 0 || ! $line->item) {
                            return null;
                        }

                        return [
                            'line_id' => $line->id,
                            'item_id' => $line->item_id,
                            'item_variant_id' => $defaultVariantByItemId[$line->item_id] ?? null,
                            'sku' => $line->item->sku,
                            'name' => $line->item->name,
                            'unit' => $line->item->unit,
                            'remaining_qty' => $remaining,
                        ];
                    })
                    ->filter()
                    ->values();

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'lines' => $lines,
                ];
            })
            ->filter(fn ($order) => $order['lines']->isNotEmpty())
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

        $crn = DB::transaction(function () use ($request, $validated) {
            $crn = ContenaReceivingNote::create([
                'crn_number' => $this->generateCrnNumber(),
                'procurement_order_id' => $validated['procurement_order_id'],
                'received_at' => $validated['received_at'],
                'remarks' => $validated['remarks'],
                'created_by' => $request->user()->id,
                'status' => 'draft',
            ]);

            foreach ($validated['items'] as $item) {
                $crn->items()->create($item);
            }

            return $crn;
        });

        return response()->json([
            'message' => 'CRN created successfully.',
            'data' => $crn->load('items.itemVariant.item'),
        ], 201);
    }

    public function transfer(Request $request, $crn): JsonResponse
    {
        if (!($crn instanceof ContenaReceivingNote)) {
            $crn = ContenaReceivingNote::findOrFail($crn);
        }

        if ($crn->status === 'transferred') {
            return response()->json(['message' => 'CRN already transferred.'], 422);
        }

        DB::transaction(function () use ($request, $crn) {
            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'created_by' => $request->user()->id,
                'notes' => "Transfer from CRN: {$crn->crn_number}",
            ]);

            $crn->load('items.itemVariant');

            foreach ($crn->items as $item) {
                if ($item->received_qty > 0) {
                    $transaction->lines()->create([
                        'item_id' => $item->itemVariant->item_id,
                        'item_variant_id' => $item->item_variant_id,
                        'quantity' => $item->received_qty,
                    ]);

                    // Update stock
                    $item->itemVariant->increment('stock_initial', $item->received_qty);
                    $item->itemVariant->increment('stock_current', $item->received_qty);
                }

                // If linked to PO, update PO lines
                if ($crn->procurement_order_id) {
                    $poLine = ProcurementOrderLine::where('procurement_order_id', $crn->procurement_order_id)
                        ->where('item_id', $item->itemVariant->item_id)
                        ->first();

                    if ($poLine) {
                        $poLine->increment('received_quantity', $item->received_qty);
                        $poLine->increment('rejected_quantity', $item->rejected_qty);
                    }
                }
            }

            $crn->update(['status' => 'transferred']);

            // Update PO status if linked
            if ($crn->procurement_order_id) {
                $this->updateProcurementOrderStatus($crn->procurement_order_id);
            }
        });

        return response()->json([
            'message' => 'CRN transferred to stock and rejections successfully.',
        ]);
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
        if (!$po) return;

        $status = 'received';
        foreach ($po->lines as $line) {
            if ($line->received_quantity === 0 && $line->ordered_quantity > 0) {
                $status = 'partial'; // Or keep as is if no items received at all
            }
            if ($line->received_quantity < $line->ordered_quantity) {
                $status = 'partial';
            }
        }

        // Check if all lines are fully received or rejected
        $allProcessed = true;
        foreach ($po->lines as $line) {
            if (($line->received_quantity + $line->rejected_quantity) < $line->ordered_quantity) {
                $allProcessed = false;
                break;
            }
        }

        if ($allProcessed) {
            $status = 'received';
        }

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
