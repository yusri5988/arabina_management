<?php

namespace App\Http\Controllers;

use App\Models\ItemVariant;
use App\Models\Item;
use App\Models\Package;
use App\Models\ProcurementOrder;
use App\Models\ContenaReceivingNote;
use App\Models\CrnItem;
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
        'salesOrders:id,code,customer_name,order_date,status',
    ];

    public function index(Request $request): Response
    {
        $databaseReady = Schema::hasTable('sales_orders')
            && Schema::hasTable('sales_order_lines')
            && Schema::hasTable('procurement_orders')
            && Schema::hasTable('procurement_order_lines')
            && Schema::hasTable('procurement_order_package_lines')
            && Schema::hasTable('procurement_order_sales_order');

        $suggestion = [
            'package_lines' => [],
            'sku_lines' => [],
            'source_orders' => [],
        ];

        $orders = collect();
        $items = collect();

        if ($databaseReady) {
            $suggestion = $this->buildShortageSuggestion();

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
        }

        return Inertia::render('Procurement/Index', [
            'databaseReady' => $databaseReady,
            'canManage' => in_array($request->user()->role, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true),
            'canReceive' => in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true),
            'suggestion' => $suggestion,
            'orders' => $orders,
            'items' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeRole($request, [User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN]);

        $validated = $request->validate([
            'package_lines' => 'nullable|array',
            'package_lines.*.package_id' => 'required|integer|exists:packages,id|distinct',
            'package_lines.*.quantity' => 'required|integer|min:1',
            'sku_lines' => 'required|array|min:1',
            'sku_lines.*.item_id' => 'required|integer|exists:items,id|distinct',
            'sku_lines.*.quantity' => 'required|integer|min:1',
            'source_order_ids' => 'required|array|min:1',
            'source_order_ids.*' => 'required|integer|distinct|exists:sales_orders,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $order = DB::transaction(function () use ($request, $validated) {
            $order = ProcurementOrder::create([
                'code' => $this->generateCode(),
                'status' => 'draft',
                'created_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['package_lines'] ?? [] as $line) {
                $order->packageLines()->create([
                    'package_id' => (int) $line['package_id'],
                    'quantity' => (int) $line['quantity'],
                ]);
            }

            foreach ($validated['sku_lines'] as $line) {
                $order->lines()->create([
                    'item_id' => (int) $line['item_id'],
                    'suggested_quantity' => (int) $line['quantity'],
                    'ordered_quantity' => (int) $line['quantity'],
                ]);
            }

            $order->salesOrders()->sync($validated['source_order_ids']);

            return $order;
        });

        return response()->json([
            'message' => 'Procurement order draft created.',
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
        $poLines = ProcurementOrder::query()
            ->with([
                'lines' => function ($query) {
                    $query->where('rejected_quantity', '>', 0)
                        ->with('item:id,sku,name,unit')
                        ->orderByDesc('updated_at');
                },
            ])
            ->orderByDesc('id')
            ->get(['id', 'code', 'status', 'created_at'])
            ->map(function ($order) {
                return [
                    'source' => 'Procurement Order',
                    'id' => $order->id,
                    'code' => $order->code,
                    'status' => $order->status,
                    'created_at' => optional($order->created_at)->toDateTimeString(),
                    'lines' => $order->lines->map(function ($line) {
                        return [
                            'id' => $line->id,
                            'item_id' => $line->item_id,
                            'sku' => $line->item?->sku,
                            'name' => $line->item?->name,
                            'unit' => $line->item?->unit,
                            'ordered_quantity' => $line->ordered_quantity,
                            'received_quantity' => $line->received_quantity,
                            'rejected_quantity' => $line->rejected_quantity,
                            'updated_at' => optional($line->updated_at)->toDateTimeString(),
                        ];
                    })->values(),
                ];
            })
            ->filter(fn ($order) => $order['lines']->isNotEmpty());

        $crnLines = ContenaReceivingNote::query()
            ->whereNull('procurement_order_id')
            ->with([
                'items' => function ($query) {
                    $query->where('rejected_qty', '>', 0)
                        ->with('itemVariant.item:id,sku,name,unit')
                        ->orderByDesc('updated_at');
                },
            ])
            ->orderByDesc('id')
            ->get(['id', 'crn_number', 'status', 'created_at'])
            ->map(function ($crn) {
                return [
                    'source' => 'CRN',
                    'id' => $crn->id,
                    'code' => $crn->crn_number,
                    'status' => $crn->status,
                    'created_at' => optional($crn->created_at)->toDateTimeString(),
                    'lines' => $crn->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'item_id' => $item->itemVariant->item_id,
                            'sku' => $item->itemVariant?->item?->sku,
                            'name' => $item->itemVariant?->item?->name,
                            'unit' => $item->itemVariant?->item?->unit,
                            'ordered_quantity' => $item->expected_qty,
                            'received_quantity' => $item->received_qty,
                            'rejected_quantity' => $item->rejected_qty,
                            'updated_at' => optional($item->updated_at)->toDateTimeString(),
                        ];
                    })->values(),
                ];
            })
            ->filter(fn ($crn) => $crn['lines']->isNotEmpty());

        $allRejections = $poLines->concat($crnLines)->sortByDesc('created_at')->values();

        return Inertia::render('Rejections/Index', [
            'linesByOrder' => $allRejections,
            'canView' => in_array($request->user()->role, [User::ROLE_STORE_KEEPER, User::ROLE_PROCUREMENT, User::ROLE_SUPER_ADMIN], true),
        ]);
    }

    private function buildShortageSuggestion(): array
    {
        $orders = SalesOrder::query()
            ->with(['lines.package.packageItems'])
            ->whereIn('status', ['open', 'partial'])
            ->whereDoesntHave('procurementOrders')
            ->get();

        $packageDemand = [];
        $itemDemand = [];

        foreach ($orders as $order) {
            foreach ($order->lines as $line) {
                $remainingPackageQty = max((int) $line->package_quantity - (int) ($line->shipped_quantity ?? 0), 0);
                if ($remainingPackageQty <= 0) {
                    continue;
                }

                $packageId = $line->package_id;
                $packageDemand[$packageId] = ($packageDemand[$packageId] ?? 0) + $remainingPackageQty;

                if (! $line->package || ! $line->package->packageItems) {
                    continue;
                }

                foreach ($line->package->packageItems as $packageItem) {
                    $itemId = $packageItem->item_id;
                    $itemDemand[$itemId] = ($itemDemand[$itemId] ?? 0) + ($remainingPackageQty * $packageItem->quantity);
                }
            }
        }

        $stockByItemId = ItemVariant::query()
            ->selectRaw('item_id, COALESCE(SUM(stock_current), 0) as stock_total')
            ->groupBy('item_id')
            ->pluck('stock_total', 'item_id');

        $packageModels = Package::query()->get(['id', 'code', 'name'])->keyBy('id');
        $itemModels = Item::query()->get(['id', 'sku', 'name', 'unit'])->keyBy('id');

        $packageLines = collect($packageDemand)
            ->map(function ($quantity, $packageId) use ($packageModels) {
                $package = $packageModels->get((int) $packageId);
                if (! $package || $quantity <= 0) {
                    return null;
                }

                return [
                    'package_id' => (int) $packageId,
                    'package_code' => $package->code,
                    'package_name' => $package->name,
                    'quantity' => (int) $quantity,
                ];
            })
            ->filter()
            ->values()
            ->all();

        $skuLines = collect($itemDemand)
            ->map(function ($demand, $itemId) use ($stockByItemId, $itemModels) {
                $stock = (int) ($stockByItemId[$itemId] ?? 0);
                $shortage = max((int) $demand - $stock, 0);
                if ($shortage <= 0) {
                    return null;
                }

                $item = $itemModels->get((int) $itemId);
                if (! $item) {
                    return null;
                }

                return [
                    'item_id' => (int) $itemId,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit' => $item->unit,
                    'demand_quantity' => (int) $demand,
                    'stock_quantity' => $stock,
                    'quantity' => $shortage,
                ];
            })
            ->filter()
            ->values()
            ->all();

        return [
            'package_lines' => $packageLines,
            'sku_lines' => $skuLines,
            'source_orders' => $orders
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'code' => $order->code,
                        'customer_name' => $order->customer_name,
                        'order_date' => optional($order->order_date)->toDateString() ?? (string) $order->order_date,
                        'status' => $order->status,
                    ];
                })
                ->values()
                ->all(),
        ];
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
