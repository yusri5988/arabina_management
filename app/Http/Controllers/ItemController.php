<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;

class ItemController extends Controller
{
    public function index(): Response
    {
        $items = Item::with('variants')->latest()->get();
        return Inertia::render('Inventory/Index', [
            'items' => $items
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:items,sku',
            'name' => 'required|string|max:255',
            'length_m' => 'nullable|numeric|unique:items,length_m',
            'unit' => 'required|in:pcs,set',
        ]);

        $item = Item::create([
            'sku' => $validated['sku'],
            'name' => $validated['name'],
            'length_m' => $validated['length_m'],
            'unit' => $validated['unit'],
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Item registered successfully.',
            'data' => $item->load('variants')
        ], 201);
    }

    public function stockForm(Request $request): Response
    {
        $type = $request->query('type', 'in');
        if (! in_array($type, ['in', 'out'], true)) {
            $type = 'in';
        }

        $items = Item::query()
            ->select(['id', 'sku', 'name', 'unit'])
            ->orderBy('sku')
            ->get();

        $packages = collect();
        if (Schema::hasTable('packages') && Schema::hasTable('package_items')) {
            $packages = Package::query()
                ->with(['packageItems.item:id,sku,name,unit'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'is_active']);
        }

        $salesOrders = collect();
        if ($type === 'out' && Schema::hasTable('sales_orders')) {
            $salesOrders = SalesOrder::query()
                ->whereIn('status', ['open', 'partial'])
                ->orderByDesc('order_date')
                ->orderByDesc('id')
                ->limit(50)
                ->get(['id', 'code', 'customer_name', 'order_date']);
        }

        return Inertia::render('Inventory/Stock', [
            'items' => $items,
            'type' => $type,
            'packages' => $packages,
            'salesOrders' => $salesOrders,
        ]);
    }

    public function stockInStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'required|in:package,alacarte',
            'package_id' => 'required_if:mode,package|integer|exists:packages,id',
            'package_quantity' => 'required_if:mode,package|integer|min:1',
            'lines' => 'required_if:mode,alacarte|array|min:1',
            'lines.*.item_id' => 'required_if:mode,alacarte|integer|distinct|exists:items,id',
            'lines.*.quantity' => 'required_if:mode,alacarte|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['mode'] === 'package') {
            $lines = $this->resolvePackageLines(
                (int) $validated['package_id'],
                (int) $validated['package_quantity']
            );
        } else {
            $lines = collect($validated['lines'])
                ->map(function ($line) {
                    return [
                        'item_id' => (int) $line['item_id'],
                        'quantity' => (int) $line['quantity'],
                    ];
                })
                ->values()
                ->all();
        }

        $transaction = DB::transaction(function () use ($request, $validated, $lines) {
            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => $validated['mode'],
                'package_id' => $validated['mode'] === 'package' ? $validated['package_id'] : null,
                'package_quantity' => $validated['mode'] === 'package' ? $validated['package_quantity'] : null,
                'sales_user_id' => null,
                'created_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line['item_id'], true);

                $variant->increment('stock_initial', $line['quantity']);
                $variant->increment('stock_current', $line['quantity']);

                $transaction->lines()->create([
                    'item_id' => $line['item_id'],
                    'item_variant_id' => $variant->id,
                    'quantity' => $line['quantity'],
                ]);
            }

            return $transaction;
        });

        return response()->json([
            'message' => 'Stock in recorded successfully.',
            'data' => $transaction->load('lines'),
        ]);
    }

    public function stockOutStore(Request $request): JsonResponse
    {
        $salesOrderTableReady = Schema::hasTable('sales_orders');
        if (! $salesOrderTableReady) {
            return response()->json([
                'message' => 'Sales order table is not ready. Please run php artisan migrate.',
            ], 409);
        }

        $validated = $request->validate([
            'mode' => 'required|in:package,alacarte',
            'package_id' => 'required_if:mode,package|integer|exists:packages,id',
            'package_quantity' => 'required_if:mode,package|integer|min:1',
            'lines' => 'required_if:mode,alacarte|array|min:1',
            'lines.*.item_id' => 'required_if:mode,alacarte|integer|distinct|exists:items,id',
            'lines.*.quantity' => 'required_if:mode,alacarte|integer|min:1',
            'sales_order_id' => [
                'required',
                'integer',
                Rule::exists('sales_orders', 'id')->whereIn('status', ['open', 'partial']),
            ],
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['mode'] === 'package') {
            $lines = $this->resolvePackageLines(
                (int) $validated['package_id'],
                (int) $validated['package_quantity']
            );
        } else {
            $lines = collect($validated['lines'])
                ->map(function ($line) {
                    return [
                        'item_id' => (int) $line['item_id'],
                        'quantity' => (int) $line['quantity'],
                    ];
                })
                ->values()
                ->all();
        }

        $salesOrder = SalesOrder::query()->find($validated['sales_order_id']);

        foreach ($lines as $line) {
            $variant = $this->findOrCreateDefaultVariant($line['item_id'], false);
            if ($variant->stock_current < $line['quantity']) {
                $item = Item::query()->find($line['item_id']);
                throw ValidationException::withMessages([
                    'package_quantity' => [
                        'Insufficient stock for '.$item?->sku.'. Current: '.$variant->stock_current,
                    ],
                ]);
            }
        }

        $transaction = DB::transaction(function () use ($request, $validated, $lines, $salesOrder) {
            $mergedNotes = 'Customer: '.$salesOrder->customer_name;
            if ($salesOrder) {
                $mergedNotes .= ' | SO: '.$salesOrder->code;
            }
            if (! empty($validated['notes'])) {
                $mergedNotes .= ' | '.$validated['notes'];
            }

            $transaction = InventoryTransaction::create([
                'type' => 'out',
                'mode' => $validated['mode'],
                'package_id' => $validated['mode'] === 'package' ? $validated['package_id'] : null,
                'package_quantity' => $validated['mode'] === 'package' ? $validated['package_quantity'] : null,
                'sales_user_id' => null,
                'sales_order_id' => $salesOrder?->id,
                'created_by' => $request->user()->id,
                'notes' => $mergedNotes,
            ]);

            foreach ($lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line['item_id'], false);
                $variant->decrement('stock_current', $line['quantity']);

                $transaction->lines()->create([
                    'item_id' => $line['item_id'],
                    'item_variant_id' => $variant->id,
                    'quantity' => $line['quantity'],
                ]);
            }

            if ($salesOrder && $validated['mode'] === 'package') {
                $this->markSalesOrderShipment(
                    $salesOrder->id,
                    (int) $validated['package_id'],
                    (int) $validated['package_quantity']
                );
            }

            return $transaction;
        });

        return response()->json([
            'message' => 'Stock out recorded successfully.',
            'data' => $transaction->load('lines'),
        ]);
    }

    private function resolvePackageLines(int $packageId, int $packageQuantity): array
    {
        $package = Package::query()
            ->with('packageItems')
            ->find($packageId);

        if (! $package || ! $package->is_active) {
            throw ValidationException::withMessages([
                'package_id' => ['Selected package is not active.'],
            ]);
        }

        if ($package->packageItems->isEmpty()) {
            throw ValidationException::withMessages([
                'package_id' => ['Selected package has no SKU lines.'],
            ]);
        }

        return $package->packageItems
            ->map(function ($line) use ($packageQuantity) {
                return [
                    'item_id' => (int) $line->item_id,
                    'quantity' => (int) $line->quantity * $packageQuantity,
                ];
            })
            ->values()
            ->all();
    }

    private function findOrCreateDefaultVariant(int $itemId, bool $allowCreate): ItemVariant
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

        if (! $allowCreate) {
            throw ValidationException::withMessages([
                'package_quantity' => ['No stock variant found for selected SKU.'],
            ]);
        }

        return ItemVariant::create([
            'item_id' => $itemId,
            'color' => null,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);
    }

    private function markSalesOrderShipment(int $salesOrderId, int $packageId, int $shippedQuantity): void
    {
        if ($shippedQuantity <= 0) {
            return;
        }

        $salesOrder = SalesOrder::query()
            ->with('lines')
            ->lockForUpdate()
            ->find($salesOrderId);

        if (! $salesOrder) {
            return;
        }

        $line = $salesOrder->lines->firstWhere('package_id', $packageId);
        if (! $line) {
            return;
        }

        $line->update([
            'shipped_quantity' => $line->shipped_quantity + $shippedQuantity,
        ]);

        $salesOrder->refresh()->load('lines');

        $allFulfilled = $salesOrder->lines->every(function ($salesLine) {
            return $salesLine->shipped_quantity >= $salesLine->package_quantity;
        });

        $anyShipped = $salesOrder->lines->contains(function ($salesLine) {
            return $salesLine->shipped_quantity > 0;
        });

        $status = 'open';
        if ($allFulfilled) {
            $status = 'fulfilled';
        } elseif ($anyShipped) {
            $status = 'partial';
        }

        $salesOrder->update(['status' => $status]);
    }
}
