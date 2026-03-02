<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\TransactionLog;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
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
        return Inertia::render('Inventory/Index', [
            'items' => []
        ]);
    }

    public function stockList(): Response
    {
        $items = Item::with('variants')->latest()->get();

        $stockByItem = [];
        foreach ($items as $item) {
            $stockByItem[$item->id] = $item->variants->sum('stock_current');
        }

        $packagesData = [];
        if (Schema::hasTable('packages')) {
            $packages = Package::with('packageItems.item')->where('is_active', true)->orderBy('name')->get();
            
            $packagesData = $packages->map(function ($package) use ($stockByItem) {
                $maxPossible = null;
                $missingItems = [];

                foreach ($package->packageItems as $pItem) {
                    $requiredQty = $pItem->quantity;
                    $currentStock = $stockByItem[$pItem->item_id] ?? 0;
                    
                    $possibleWithThisItem = floor($currentStock / $requiredQty);
                    
                    if ($maxPossible === null || $possibleWithThisItem < $maxPossible) {
                        $maxPossible = $possibleWithThisItem;
                    }

                    if ($currentStock < $requiredQty) {
                        $missingItems[] = $pItem->item ? $pItem->item->sku : 'Unknown SKU';
                    }
                }

                return [
                    'id' => $package->id,
                    'code' => $package->code,
                    'name' => $package->name,
                    'available_qty' => $maxPossible ?? 0,
                    'missing_items' => $missingItems,
                    'lines_count' => $package->packageItems->count(),
                ];
            });
        }

        return Inertia::render('Inventory/StockList', [
            'items' => $items,
            'packages' => $packagesData,
        ]);
    }

    public function downloadStockPdf()
    {
        $items = Item::with('variants')->orderBy('sku')->get();

        $stockByItem = [];
        foreach ($items as $item) {
            $stockByItem[$item->id] = $item->variants->sum('stock_current');
        }

        $packagesData = [];
        if (Schema::hasTable('packages')) {
            $packages = Package::with('packageItems.item')->where('is_active', true)->orderBy('name')->get();
            
            $packagesData = $packages->map(function ($package) use ($stockByItem) {
                $maxPossible = null;
                foreach ($package->packageItems as $pItem) {
                    $requiredQty = $pItem->quantity;
                    $currentStock = $stockByItem[$pItem->item_id] ?? 0;
                    $possibleWithThisItem = floor($currentStock / $requiredQty);
                    if ($maxPossible === null || $possibleWithThisItem < $maxPossible) {
                        $maxPossible = $possibleWithThisItem;
                    }
                }
                return [
                    'code' => $package->code,
                    'name' => $package->name,
                    'available_qty' => $maxPossible ?? 0,
                ];
            });
        }

        return Pdf::loadView('inventory.stock-pdf', [
            'items' => $items,
            'packages' => $packagesData,
            'generatedAt' => now()->format('d/m/Y H:i:s'),
        ])->download('Inventory_Stock_List_' . now()->format('Ymd_His') . '.pdf');
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

        TransactionLog::record('item_created', [
            'id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name,
        ]);

        return response()->json([
            'message' => 'Item registered successfully.',
            'data' => $item->load('variants')
        ], 201);
    }

    public function stockInForm(): Response
    {
        return $this->stockForm('in');
    }

    public function stockOutForm(): Response
    {
        return $this->stockForm('out');
    }

    private function stockForm(string $type): Response
    {
        $type = $type === 'out' ? 'out' : 'in';

        $items = Item::query()
            ->select(['id', 'sku', 'name', 'unit'])
            ->withSum('variants as stock_current_total', 'stock_current')
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
                ->with([
                    'lines' => function ($query) {
                        $query->with([
                            'item:id,sku,name,unit',
                            'package:id,code,name',
                            'package.packageItems.item:id,sku,name,unit',
                        ])->orderBy('id');
                    },
                ])
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

            TransactionLog::record('stock_in', [
                'id' => $transaction->id,
                'mode' => $transaction->mode,
                'package_id' => $transaction->package_id,
                'package_quantity' => $transaction->package_quantity,
                'lines_count' => count($lines),
            ]);

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

            if ($salesOrder) {
                $this->syncSalesOrderProgress($salesOrder);
            }

            TransactionLog::record('stock_out', [
                'id' => $transaction->id,
                'mode' => $transaction->mode,
                'package_id' => $transaction->package_id,
                'package_quantity' => $transaction->package_quantity,
                'sales_order_id' => $transaction->sales_order_id,
                'lines_count' => count($lines),
            ]);

            return $transaction;
        });

        return response()->json([
            'message' => 'Stock out recorded successfully.',
            'data' => $transaction->load('lines'),
        ]);
    }

    private function syncSalesOrderProgress(SalesOrder $order): void
    {
        $order->load([
            'lines.package.packageItems.item:id,sku',
        ]);

        $remainingBySku = DB::table('inventory_transaction_lines as transaction_lines')
            ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
            ->join('items', 'items.id', '=', 'transaction_lines.item_id')
            ->where('transactions.type', 'out')
            ->where('transactions.sales_order_id', $order->id)
            ->select('items.sku', DB::raw('SUM(transaction_lines.quantity) as shipped_quantity'))
            ->groupBy('items.sku')
            ->pluck('shipped_quantity', 'sku')
            ->map(fn ($quantity) => (int) $quantity)
            ->all();

        foreach ($order->lines as $line) {
            $shippedQuantity = 0;

            if ($line->package_id && $line->package) {
                $packageItems = $line->package->packageItems ?? collect();
                $deliverablePackages = null;

                foreach ($packageItems as $packageItem) {
                    $sku = $packageItem->item?->sku;
                    $requiredQuantity = (int) $packageItem->quantity;

                    if (! $sku || $requiredQuantity < 1) {
                        $deliverablePackages = 0;
                        break;
                    }

                    $availableQuantity = (int) ($remainingBySku[$sku] ?? 0);
                    $possiblePackages = intdiv($availableQuantity, $requiredQuantity);

                    $deliverablePackages = $deliverablePackages === null
                        ? $possiblePackages
                        : min($deliverablePackages, $possiblePackages);
                }

                $shippedQuantity = min((int) $line->package_quantity, max((int) ($deliverablePackages ?? 0), 0));

                foreach ($packageItems as $packageItem) {
                    $sku = $packageItem->item?->sku;
                    if (! $sku) {
                        continue;
                    }

                    $remainingBySku[$sku] = max(
                        0,
                        (int) ($remainingBySku[$sku] ?? 0) - ($shippedQuantity * (int) $packageItem->quantity)
                    );
                }
            } elseif ($line->item_sku) {
                $availableQuantity = (int) ($remainingBySku[$line->item_sku] ?? 0);
                $shippedQuantity = min((int) $line->item_quantity, max($availableQuantity, 0));
                $remainingBySku[$line->item_sku] = max(0, $availableQuantity - $shippedQuantity);
            }

            $line->update([
                'shipped_quantity' => $shippedQuantity,
            ]);
        }

        $this->refreshSalesOrderStatus($order);
    }

    private function refreshSalesOrderStatus(SalesOrder $order): void
    {
        $order->load('lines');
        
        $allFulfilled = $order->lines->every(function ($line) {
            $target = $line->package_id ? $line->package_quantity : $line->item_quantity;
            return $line->shipped_quantity >= $target;
        });

        $anyShipped = $order->lines->contains(fn ($line) => $line->shipped_quantity > 0);

        $status = $allFulfilled ? 'fulfilled' : ($anyShipped ? 'partial' : 'open');
        $order->update(['status' => $status]);
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
}
