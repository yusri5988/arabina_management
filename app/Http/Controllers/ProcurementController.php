<?php

namespace App\Http\Controllers;

use App\Models\ItemVariant;
use App\Models\Item;
use App\Models\Package;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\ContenaReceivingNote;
use App\Models\CrnItem;
use App\Models\RejectedItem;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProcurementController extends Controller
{
    private const ORDER_RELATIONS = [
        'packageLines.package:id,code,name',
        'lines.item:id,sku,name,unit',
    ];

    public function index(Request $request): Response
    {
        $databaseReady = Schema::hasTable('sales_orders')
            && Schema::hasTable('sales_order_lines')
            && Schema::hasTable('procurement_orders')
            && Schema::hasTable('procurement_order_lines')
            && Schema::hasTable('procurement_order_package_lines');

        $suggestion = [
            'package_lines' => [],
            'sku_lines' => [],
            'source_orders' => [],
        ];

        $orders = collect();
        $items = collect();

        if ($databaseReady) {
            $orders = ProcurementOrder::query()
                ->with(self::ORDER_RELATIONS)
                ->latest()
                ->limit(30)
                ->get(['id', 'code', 'status', 'notes', 'created_at']);

            if (Schema::hasTable('items')) {
                $items = Item::query()
                    ->orderBy('sku')
                    ->get(['id', 'sku', 'name', 'unit']);
            }

            if (Schema::hasTable('packages')) {
                $packages = Package::query()
                    ->orderBy('code')
                    ->get(['id', 'code', 'name']);
            } else {
                $packages = collect();
            }
        }

        return Inertia::render('Procurement/Index', [
            'databaseReady' => $databaseReady,
            'canManage' => in_array($request->user()->role, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true),
            'canReceive' => in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true),
            'suggestion' => $suggestion,
            'orders' => $orders,
            'items' => $items,
            'packages' => $packages ?? collect(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        $validated = $request->validate([
            'package_lines' => 'nullable|array',
            'package_lines.*.package_id' => 'required|integer|exists:packages,id|distinct',
            'package_lines.*.quantity' => 'required|integer|min:1',
            'sku_lines' => 'nullable|array',
            'sku_lines.*.item_id' => 'required|integer|exists:items,id|distinct',
            'sku_lines.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        if (empty($validated['package_lines']) && empty($validated['sku_lines'])) {
            return response()->json([
                'message' => 'Please add at least one package or SKU to the order.',
            ], 422);
        }

        $order = DB::transaction(function () use ($request, $validated) {
            $order = ProcurementOrder::create([
                'code' => $this->generateCode(),
                'status' => 'submitted',
                'created_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Track total quantities per SKU to create consolidated order lines
            $skuTotals = [];

            // 1. Process Packages
            foreach ($validated['package_lines'] ?? [] as $pLine) {
                $packageId = (int) $pLine['package_id'];
                $packageQty = (int) $pLine['quantity'];

                $order->packageLines()->create([
                    'package_id' => $packageId,
                    'quantity' => $packageQty,
                ]);

                // Explode package into SKUs
                $package = Package::with('packageItems')->find($packageId);
                if ($package && $package->packageItems) {
                    foreach ($package->packageItems as $pItem) {
                        $itemId = (int) $pItem->item_id;
                        $totalNeeded = $packageQty * (int) $pItem->quantity;
                        $skuTotals[$itemId] = ($skuTotals[$itemId] ?? 0) + $totalNeeded;
                    }
                }
            }

            // 2. Process Individual SKUs
            foreach ($validated['sku_lines'] ?? [] as $sLine) {
                $itemId = (int) $sLine['item_id'];
                $qty = (int) $sLine['quantity'];
                $skuTotals[$itemId] = ($skuTotals[$itemId] ?? 0) + $qty;
            }

            // 3. Create consolidated order lines
            foreach ($skuTotals as $itemId => $totalQty) {
                $order->lines()->create([
                    'item_id' => $itemId,
                    'suggested_quantity' => $totalQty,
                    'ordered_quantity' => $totalQty,
                    'received_quantity' => 0,
                    'rejected_quantity' => 0,
                ]);
            }

            // Create CRN immediately
            $crnNumber = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            while (ContenaReceivingNote::where('crn_number', $crnNumber)->exists()) {
                $crnNumber = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            }

            $crn = ContenaReceivingNote::create([
                'crn_number' => $crnNumber,
                'procurement_order_id' => $order->id,
                'status' => 'pending',
                'created_by' => $request->user()->id,
            ]);

            // Refresh order lines to include all (package items + individual SKUs)
            $order->load('lines');

            // Copy all item lines to CRN items
            foreach ($order->lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line->item_id);
                
                CrnItem::create([
                    'crn_id' => $crn->id,
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $line->ordered_quantity,
                    'received_qty' => 0,
                    'rejected_qty' => 0,
                ]);
            }

            return $order;
        });

        return response()->json([
            'message' => 'Procurement order created and submitted to CRN.',
            'data' => $this->findOrderWithRelations($order->id),
        ], 201);
    }

    public function receive(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_STORE_KEEPER, User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        $validated = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.line_id' => 'required|integer|distinct',
            'lines.*.received_quantity' => 'required|integer|min:0',
        ]);

        $inputByLineId = collect($validated['lines'])->keyBy(fn ($line) => (int) $line['line_id']);

        $order->load('lines');

        DB::transaction(function () use ($order, $inputByLineId) {
            foreach ($order->lines as $line) {
                if (! $inputByLineId->has($line->id)) {
                    continue;
                }

                $receivedQuantity = (int) $inputByLineId->get($line->id)['received_quantity'];
                if ($receivedQuantity > $line->ordered_quantity) {
                    throw ValidationException::withMessages([
                        'lines' => ['Received quantity cannot exceed ordered quantity.'],
                    ]);
                }

                $rejectedQuantity = 0;

                $variant = $this->findOrCreateDefaultVariant($line->item_id);

                $stockIncrease = max($receivedQuantity - $line->received_quantity, 0);
                if ($stockIncrease > 0) {
                    $variant->increment('stock_initial', $stockIncrease);
                    $variant->increment('stock_current', $stockIncrease);
                }

                $line->update([
                    'received_quantity' => $receivedQuantity,
                    'rejected_quantity' => $rejectedQuantity,
                ]);
            }

            $order->refresh()->load('lines');

            $order->update(['status' => $this->determineReceiptStatus($order)]);
        });

        return response()->json([
            'message' => 'Stock receiving recorded successfully.',
            'data' => $this->findOrderWithRelations($order->id),
        ]);
    }

    public function addLine(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'SKU can only be added to draft procurement order.',
            ], 422);
        }

        $validated = $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($order, $validated) {
            $line = $order->lines()
                ->where('item_id', (int) $validated['item_id'])
                ->first();

            if ($line) {
                $addQty = (int) $validated['quantity'];
                $line->update([
                    'suggested_quantity' => (int) ($line->suggested_quantity ?? 0) + $addQty,
                    'ordered_quantity' => (int) ($line->ordered_quantity ?? 0) + $addQty,
                ]);

                return;
            }

            $order->lines()->create([
                'item_id' => (int) $validated['item_id'],
                'suggested_quantity' => (int) $validated['quantity'],
                'ordered_quantity' => (int) $validated['quantity'],
                'received_quantity' => 0,
                'rejected_quantity' => 0,
            ]);
        });

        return response()->json([
            'message' => 'SKU line added to procurement draft.',
            'data' => $this->findOrderWithRelations($order->id),
        ]);
    }

    public function addPackageLine(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'Package can only be added to draft procurement order.',
            ], 422);
        }

        $validated = $request->validate([
            'package_id' => 'required|integer|exists:packages,id',
            'quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($order, $validated) {
            $packageId = (int) $validated['package_id'];
            $packageQuantity = (int) $validated['quantity'];

            $order->packageLines()->create([
                'package_id' => $packageId,
                'quantity' => $packageQuantity,
            ]);

            $package = Package::with('packageItems')->find($packageId);
            if (! $package || ! $package->packageItems) {
                return;
            }

            foreach ($package->packageItems as $packageItem) {
                $itemId = (int) $packageItem->item_id;
                $totalQty = $packageQuantity * (int) $packageItem->quantity;

                $line = $order->lines()
                    ->where('item_id', $itemId)
                    ->first();

                if ($line) {
                    $line->update([
                        'suggested_quantity' => (int) ($line->suggested_quantity ?? 0) + $totalQty,
                        'ordered_quantity' => (int) ($line->ordered_quantity ?? 0) + $totalQty,
                    ]);
                } else {
                    $order->lines()->create([
                        'item_id' => $itemId,
                        'suggested_quantity' => $totalQty,
                        'ordered_quantity' => $totalQty,
                        'received_quantity' => 0,
                        'rejected_quantity' => 0,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Package line added to procurement draft with all item lines.',
            'data' => $this->findOrderWithRelations($order->id),
        ]);
    }

    public function submit(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft procurement order can be submitted.',
            ], 422);
        }

        if ($order->lines()->count() === 0) {
            return response()->json([
                'message' => 'Cannot submit order without any SKU lines.',
            ], 422);
        }

        $orderData = DB::transaction(function () use ($request, $order) {
            $order->update(['status' => 'submitted']);

            // Create CRN
            $crnNumber = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            while (ContenaReceivingNote::where('crn_number', $crnNumber)->exists()) {
                $crnNumber = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            }

            $crn = ContenaReceivingNote::create([
                'crn_number' => $crnNumber,
                'procurement_order_id' => $order->id,
                'status' => 'pending',
                'created_by' => $request->user()->id,
            ]);

            // Copy lines to CRN items
            foreach ($order->lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line->item_id);
                
                CrnItem::create([
                    'crn_id' => $crn->id,
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $line->ordered_quantity,
                    'received_qty' => 0,
                    'rejected_qty' => 0,
                ]);
            }

            return $this->findOrderWithRelations($order->id);
        });

        return response()->json([
            'message' => 'Procurement order submitted and CRN generated.',
            'data' => $orderData,
        ]);
    }

    public function destroy(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft procurement order can be deleted.',
            ], 422);
        }

        $order->delete();

        return response()->json([
            'message' => 'Procurement draft deleted successfully.',
        ]);
    }

    public function pdf(ProcurementOrder $order)
    {
        $order->load(self::ORDER_RELATIONS);

        return Pdf::loadView('procurement.order-pdf', [
            'order' => $order,
            'printedAt' => now(),
        ])->download("{$order->code}.pdf");
    }

    public function rejectedList(Request $request): Response
    {
        $canView = in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true);

        if (! $canView) {
            return Inertia::render('Rejections/Index', [
                'linesByOrder' => [],
                'canView' => false,
            ]);
        }

        $allRejections = RejectedItem::query()
            ->with([
                'item:id,sku,name,unit',
                'procurementOrder:id,code,status,created_at',
                'crn:id,crn_number,status,created_at',
                'rejectable',
            ])
            ->orderByDesc('rejected_at')
            ->orderByDesc('id')
            ->get()
            ->groupBy(function (RejectedItem $rejection) {
                if ($rejection->procurementOrder) {
                    return 'po:' . $rejection->procurementOrder->id;
                }

                if ($rejection->crn) {
                    return 'crn:' . $rejection->crn->id;
                }

                return $rejection->rejectable_type . ':' . $rejection->rejectable_id;
            })
            ->map(function ($group) {
                $sortedGroup = $group->sortByDesc(function (RejectedItem $rejection) {
                    return optional($rejection->rejected_at)->timestamp
                        ?? optional($rejection->created_at)->timestamp
                        ?? 0;
                });

                $latest = $sortedGroup->first();
                $procurementOrder = $latest?->procurementOrder;
                $crn = $latest?->crn;

                return [
                    'source' => $procurementOrder ? 'Procurement Order' : 'CRN',
                    'id' => $procurementOrder?->id ?? $crn?->id ?? $latest?->id,
                    'code' => $procurementOrder?->code ?? $crn?->crn_number ?? '-',
                    'status' => $procurementOrder?->status ?? $crn?->status ?? '-',
                    'created_at' => optional($latest?->rejected_at ?? $latest?->created_at)->toDateTimeString(),
                    'lines' => $sortedGroup
                        ->map(function (RejectedItem $rejection) {
                            [$orderedQuantity, $receivedQuantity] = $this->resolveRejectedLineQuantities($rejection);

                            return [
                                'id' => $rejection->id,
                                'item_id' => $rejection->item_id,
                                'sku' => $rejection->item?->sku,
                                'name' => $rejection->item?->name,
                                'unit' => $rejection->item?->unit,
                                'ordered_quantity' => $orderedQuantity,
                                'received_quantity' => $receivedQuantity,
                                'rejected_quantity' => $rejection->quantity,
                                'rejection_reason' => $rejection->reason,
                                'updated_at' => optional($rejection->rejected_at ?? $rejection->created_at)->toDateTimeString(),
                            ];
                        })
                        ->values(),
                ];
            })
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Rejections/Index', [
            'linesByOrder' => $allRejections,
            'canView' => $canView,
        ]);
    }

    private function resolveRejectedLineQuantities(RejectedItem $rejection): array
    {
        $rejectable = $rejection->rejectable;

        if ($rejectable instanceof ProcurementOrderLine) {
            return [(int) $rejectable->ordered_quantity, (int) $rejectable->received_quantity];
        }

        if ($rejectable instanceof CrnItem) {
            return [(int) $rejectable->expected_qty, (int) $rejectable->received_qty];
        }

        return [0, 0];
    }



    private function generateCode(): string
    {
        $datePrefix = now()->format('Ymd');

        do {
            $code = 'PO-'.$datePrefix.'-'.Str::upper(Str::random(4));
        } while (ProcurementOrder::query()->where('code', $code)->exists());

        return $code;
    }

    private function authorizeRole(Request $request, array $roles): void
    {
        abort_unless(
            in_array($request->user()->role, $roles, true),
            403,
            'Unauthorized role.'
        );
    }

    private function findOrderWithRelations(int $id): ?ProcurementOrder
    {
        return ProcurementOrder::query()
            ->with(self::ORDER_RELATIONS)
            ->find($id);
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

    private function determineReceiptStatus(ProcurementOrder $order): string
    {
        $status = 'received';
        foreach ($order->lines as $line) {
            if ($line->received_quantity === 0 && $line->ordered_quantity > 0) {
                return 'draft';
            }
            if ($line->received_quantity < $line->ordered_quantity) {
                $status = 'partial';
            }
        }

        return $status;
    }
}
