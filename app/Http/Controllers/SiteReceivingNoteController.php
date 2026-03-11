<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\InventoryTransaction;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\RejectedItem;
use App\Models\SiteReceivingNote;
use App\Models\SiteReceivingNoteItem;
use App\Models\TransactionLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SiteReceivingNoteController extends Controller
{
    private const OPEN_PROCUREMENT_STATUSES = ['draft', 'submitted', 'partial'];
    private const NOTE_ITEM_RELATIONS = ['procurementOrder:id,code', 'creator:id,name', 'items.itemVariant.item'];

    public function index(Request $request): Response
    {
        $notes = SiteReceivingNote::query()
            ->where('status', 'transferred')
            ->with(self::NOTE_ITEM_RELATIONS)
            ->latest()
            ->get();

        $activeNotes = SiteReceivingNote::query()
            ->whereIn('status', ['awaiting_shipping', 'shipping', 'arrived'])
            ->with(['procurementOrder:id,code', 'items.itemVariant.item'])
            ->latest()
            ->get();

        return Inertia::render('Warehouse/Crn/Index', [
            'notes' => $notes,
            'activeSrns' => $activeNotes,
            'activeCrns' => $activeNotes,
            'pendingProcurements' => $this->buildPendingProcurementPayload(),
            'canManage' => $request->user()?->hasModuleAccess('srn') ?? false,
            'pageTitle' => 'Site Receiving Note (SRN)',
            'headTitle' => 'Site Receiving Note',
            'noteCodeKey' => 'srn_number',
            'noteCodeLabel' => 'SRN Number',
            'etaEndpointBase' => '/warehouse/srn',
            'arrivedEndpointBase' => '/warehouse/srn',
            'receiveEndpointBase' => '/warehouse/srn/procurement',
            'notePdfBase' => '/warehouse/srn',
            'poPdfBase' => '/procurement/hardware-site/orders',
            'noteHistoryLabel' => 'SRN',
            'showIncomingShipments' => false,
        ]);
    }

    public function updateEta(Request $request, SiteReceivingNote $srn): JsonResponse
    {
        $this->authorizeManage($request);

        if (! $this->hasStatus($srn, 'awaiting_shipping')) {
            return response()->json([
                'message' => 'ETA can only be updated for SRN awaiting shipping.',
            ], 422);
        }

        $validated = $request->validate([
            'eta' => 'required|date|after_or_equal:today',
        ]);

        $srn->update([
            'eta' => $validated['eta'],
            'status' => 'shipping',
        ]);

        TransactionLog::record('srn_eta_updated', [
            'id' => $srn->id,
            'srn_number' => $srn->srn_number,
            'eta' => $srn->eta,
        ]);

        return response()->json([
            'message' => 'ETA updated and status set to Shipping.',
            'srn' => $srn,
        ]);
    }

    public function markAsArrived(Request $request, SiteReceivingNote $srn): JsonResponse
    {
        $this->authorizeManage($request);

        if (! in_array($srn->status, ['shipping', 'awaiting_shipping'], true)) {
            return response()->json([
                'message' => 'Only SRN in shipping or awaiting status can be marked as arrived.',
            ], 422);
        }

        $srn->update(['status' => 'arrived']);

        TransactionLog::record('srn_arrived', [
            'id' => $srn->id,
            'srn_number' => $srn->srn_number,
        ]);

        return response()->json([
            'message' => 'Shipment marked as Arrived. You can now process the stock checklist.',
            'srn' => $srn,
        ]);
    }

    public function downloadPdf(SiteReceivingNote $srn)
    {
        $srn->load(self::NOTE_ITEM_RELATIONS);

        return Pdf::loadView('warehouse.receiving-note-pdf', [
            'title' => 'Site Receiving Note',
            'numberLabel' => 'SRN Number',
            'number' => $srn->srn_number,
            'note' => $srn,
            'generatedAt' => now(),
        ])->stream("SRN-{$srn->srn_number}.pdf");
    }

    public function receiveProcurement(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->ensureHardwareSiteOrder($order);

        if ($response = $this->ensureProcurementOrderOpen($order)) {
            return $response;
        }

        $validated = $request->validate([
            'remarks' => 'nullable|string|max:500',
            'lines' => 'required|array|min:1',
            'lines.*.line_id' => 'required|integer|distinct',
            'lines.*.received_qty' => $this->decimalQuantityRules(true),
            'lines.*.rejected_qty' => $this->decimalQuantityRules(true),
            'lines.*.rejection_reason' => 'nullable|string|max:255',
        ]);

        $order->load('lines.item');
        $processableLines = $this->buildProcessableReceiptLines($order, collect($validated['lines']));

        if ($processableLines->isEmpty()) {
            return response()->json([
                'message' => 'No valid lines to process. All lines are already fully received or rejected.',
            ], 422);
        }

        DB::transaction(function () use ($request, $order, $processableLines, $validated) {
            $transaction = $this->createInventoryTransaction(
                $request->user()->id,
                "Transfer from SRN PO: {$order->code}"
            );

            $srn = SiteReceivingNote::create([
                'srn_number' => $this->generateNumber(),
                'procurement_order_id' => $order->id,
                'received_at' => now(),
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $request->user()->id,
                'status' => 'transferred',
            ]);

            foreach ($processableLines as $entry) {
                $line = $entry['line'];
                $receivedQty = $entry['received_qty'];
                $rejectedQty = $entry['rejected_qty'];
                $variant = $this->findOrCreateDefaultVariant((int) $line->item_id);

                $noteItem = $srn->items()->create([
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $entry['remaining_qty'],
                    'received_qty' => $receivedQty,
                    'rejected_qty' => $rejectedQty,
                    'rejection_reason' => $entry['rejection_reason'],
                ]);

                $this->recordRejectionFromNoteItem(
                    $noteItem,
                    $srn,
                    (int) $line->item_id,
                    $request->user()->id
                );

                $this->applyReceivedStock($transaction, $variant, (int) $line->item_id, $receivedQty);

                $line->increment('received_quantity', $receivedQty);
                $line->increment('rejected_quantity', $rejectedQty);
            }

            $this->updateProcurementOrderStatus($order->id);

            TransactionLog::record('srn_po_received', [
                'srn_number' => $srn->srn_number,
                'po_code' => $order->code,
                'lines_count' => count($validated['lines']),
            ]);
        });

        return response()->json([
            'message' => 'Site receiving checklist submitted. Stock and rejection updated.',
        ]);
    }

    private function buildPendingProcurementPayload(): Collection
    {
        return ProcurementOrder::query()
            ->whereIn('status', self::OPEN_PROCUREMENT_STATUSES)
            ->whereHas('srns', function ($query) {
                $query->where('status', 'arrived');
            })
            ->with(['lines.item:id,sku,name,unit,bom_scope'])
            ->latest('id')
            ->get(['id', 'code', 'status', 'created_at'])
            ->filter(fn (ProcurementOrder $order) => $order->matchesBomScope(Bom::TYPE_HARDWARE_SITE))
            ->map(function (ProcurementOrder $order) {
                $lines = $this->mapPendingProcurementLines($order->lines);

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'status' => $order->status,
                    'created_at' => optional($order->created_at)->toDateString(),
                    'lines' => $lines,
                ];
            })
            ->filter(fn (array $order) => $order['lines']->isNotEmpty())
            ->values();
    }

    private function ensureHardwareSiteOrder(ProcurementOrder $order): void
    {
        abort_unless($order->matchesBomScope(Bom::TYPE_HARDWARE_SITE), 404);
    }

    private function authorizeManage(Request $request): void
    {
        abort_unless($request->user()?->hasModuleAccess('srn'), 403);
    }

    private function hasStatus(SiteReceivingNote $srn, string $expected): bool
    {
        if ((string) $srn->status === $expected) {
            return true;
        }

        return SiteReceivingNote::query()
            ->whereKey($srn->getKey())
            ->where('status', $expected)
            ->exists();
    }

    private function ensureProcurementOrderOpen(ProcurementOrder $order): ?JsonResponse
    {
        if (in_array($order->status, self::OPEN_PROCUREMENT_STATUSES, true)) {
            return null;
        }

        if (! in_array($order->status, ['received', 'fulfilled', 'closed', 'cancelled'], true)) {
            return null;
        }

        return response()->json([
            'message' => 'Procurement order is already processed.',
        ], 422);
    }

    private function mapPendingProcurementLines(Collection $lines): Collection
    {
        return $lines
            ->map(function ($line) {
                $remaining = $this->remainingQuantity($line);

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
    }

    private function buildProcessableReceiptLines(ProcurementOrder $order, Collection $validatedLines): Collection
    {
        $lineInput = $validatedLines->keyBy(fn (array $line) => (int) $line['line_id']);

        return $order->lines
            ->map(function (ProcurementOrderLine $line) use ($lineInput) {
                $input = $lineInput->get($line->id);
                if (! $input) {
                    return null;
                }

                $remaining = $this->remainingQuantity($line);
                if ($remaining <= 0) {
                    return null;
                }

                $receivedQty = $this->normalizeQuantity($input['received_qty']);
                $rejectedQty = $this->normalizeQuantity($input['rejected_qty']);

                if ($this->normalizeQuantity($receivedQty + $rejectedQty) > $remaining) {
                    throw ValidationException::withMessages([
                        'lines' => ["Total received + rejected exceeds remaining quantity for SKU {$line->item?->sku}."],
                    ]);
                }

                return [
                    'line' => $line,
                    'remaining_qty' => $remaining,
                    'received_qty' => $receivedQty,
                    'rejected_qty' => $rejectedQty,
                    'rejection_reason' => $input['rejection_reason'] ?? null,
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

    private function recordRejectionFromNoteItem(
        SiteReceivingNoteItem $noteItem,
        SiteReceivingNote $srn,
        int $itemId,
        int $userId
    ): void {
        if ($this->normalizeQuantity($noteItem->rejected_qty) <= 0 || $itemId <= 0) {
            return;
        }

        RejectedItem::query()->firstOrCreate(
            [
                'rejectable_type' => SiteReceivingNoteItem::class,
                'rejectable_id' => $noteItem->id,
            ],
            [
                'procurement_order_id' => $srn->procurement_order_id,
                'srn_id' => $srn->id,
                'item_id' => $itemId,
                'item_variant_id' => $noteItem->item_variant_id,
                'quantity' => $this->normalizeQuantity($noteItem->rejected_qty),
                'reason' => $noteItem->rejection_reason,
                'rejected_at' => $srn->received_at ?? $noteItem->updated_at ?? now(),
                'created_by' => $userId,
            ]
        );
    }

    private function applyReceivedStock(
        InventoryTransaction $transaction,
        ItemVariant $variant,
        int $itemId,
        float $receivedQty
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

    private function remainingQuantity(ProcurementOrderLine $line): float
    {
        return max(
            $this->normalizeQuantity($line->ordered_quantity - $line->received_quantity - $line->rejected_quantity),
            0
        );
    }

    private function generateNumber(): string
    {
        $prefix = 'SRN-' . now()->format('Ymd');

        do {
            $number = $prefix . '-' . Str::upper(Str::random(4));
        } while (SiteReceivingNote::where('srn_number', $number)->exists());

        return $number;
    }

    private function updateProcurementOrderStatus(int $poId): void
    {
        $po = ProcurementOrder::with('lines')->find($poId);
        if (! $po) {
            return;
        }

        $allProcessed = $po->lines->every(function ($line) {
            return $this->normalizeQuantity($line->received_quantity + $line->rejected_quantity) >= $line->ordered_quantity;
        });

        $po->update([
            'status' => $allProcessed ? 'received' : 'partial',
        ]);
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
