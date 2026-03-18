<?php

namespace App\Http\Controllers;

use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\StockAudit;
use App\Models\TransactionLog;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
            'items' => Item::query()
                ->select(['id', 'sku', 'name', 'length_m', 'unit', 'bom_scope', 'supplier'])
                ->latest()
                ->get(),
        ]);
    }

    public function stockList(): Response
    {
        $items = Item::with('variants')->latest()->get();

        $stockByItem = [];
        foreach ($items as $item) {
            $stockByItem[$item->id] = (float) $item->variants->sum('stock_current');
        }

        $packagesData = [];
        if (Schema::hasTable('packages')) {
            $packages = Package::with(['packageItems.item:id,sku,name,bom_scope'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

            $packagesData = $packages->map(function ($package) use ($stockByItem) {
                return [
                    'id' => $package->id,
                    'code' => $package->code,
                    'name' => $package->name,
                    'items' => $package->packageItems->map(function ($pItem) use ($stockByItem) {
                        return [
                            'item_id' => $pItem->item_id,
                            'sku' => $pItem->item?->sku ?? 'Unknown',
                            'bom_scope' => $pItem->item?->bom_scope ?? 'hardware',
                            'required_qty' => (float) $pItem->quantity,
                            'current_stock' => (float) ($stockByItem[$pItem->item_id] ?? 0),
                        ];
                    }),
                ];
            });
        }

        return Inertia::render('Inventory/StockList', [
            'items' => $items,
            'packages' => $packagesData,
        ]);
    }

    public function stockAuditForm(): Response
    {
        $selectedAuditId = request()->integer('audit_id');

        $items = Item::query()
            ->with([
                'variants' => function ($query) {
                    $query->where(function ($q) {
                        $q->whereNull('color')->orWhere('color', '');
                    });
                }
            ])
            ->orderBy('sku')
            ->get();

        $auditOptions = StockAudit::query()
            ->with('auditor:id,name')
            ->latest('audited_at')
            ->latest('id')
            ->limit(50)
            ->get(['id', 'audited_at', 'audited_by'])
            ->map(function ($audit) {
                return [
                    'id' => $audit->id,
                    'audited_at' => optional($audit->audited_at)->format('Y-m-d H:i:s'),
                    'auditor' => $audit->auditor?->name,
                ];
            })
            ->values();

        $auditHistories = StockAudit::query()
            ->with(['lines.item:id,sku,name', 'auditor:id,name'])
            ->latest('audited_at')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(function ($audit) {
                return [
                    'id' => $audit->id,
                    'audited_at' => optional($audit->audited_at)->format('Y-m-d H:i:s'),
                    'auditor' => $audit->auditor?->name,
                    'notes' => $audit->notes,
                    'lines' => $audit->lines->map(function ($line) {
                        return [
                            'item_id' => $line->item_id,
                            'sku' => $line->item?->sku,
                            'name' => $line->item?->name,
                            'stock_before' => (int) $line->stock_before,
                            'audited_stock' => (int) $line->audited_stock,
                            'diff_quantity' => (int) $line->diff_quantity,
                            'short_quantity' => (int) $line->short_quantity,
                        ];
                    })->values(),
                ];
            })
            ->values();

        $currentLines = $items->map(function ($item) {
            $stockCurrent = (int) $item->variants->sum('stock_current');

            return [
                'item_id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'stock_current' => $stockCurrent,
                'audited_stock' => $stockCurrent,
            ];
        })->values();

        $latestAuditQuery = StockAudit::query()
            ->with(['lines.item:id,sku,name', 'auditor:id,name'])
            ->latest('audited_at')
            ->latest('id');

        if ($selectedAuditId) {
            $latestAuditQuery->where('id', $selectedAuditId);
        }

        $latestAudit = $latestAuditQuery->first();

        $latestAuditPayload = null;
        if ($latestAudit) {
            $latestAuditPayload = [
                'id' => $latestAudit->id,
                'audited_at' => optional($latestAudit->audited_at)->format('Y-m-d H:i:s'),
                'auditor' => $latestAudit->auditor?->name,
                'notes' => $latestAudit->notes,
                'lines' => $latestAudit->lines->map(function ($line) {
                    return [
                        'item_id' => $line->item_id,
                        'sku' => $line->item?->sku,
                        'name' => $line->item?->name,
                        'stock_before' => (int) $line->stock_before,
                        'audited_stock' => (int) $line->audited_stock,
                        'diff_quantity' => (int) $line->diff_quantity,
                        'short_quantity' => (int) $line->short_quantity,
                    ];
                })->values(),
            ];
        }

        return Inertia::render('Inventory/StockAudit', [
            'items' => $currentLines,
            'latestAudit' => $latestAuditPayload,
            'auditOptions' => $auditOptions,
            'selectedAuditId' => $latestAudit?->id,
            'auditHistories' => $auditHistories,
        ]);
    }

    public function downloadStockAuditPdf(Request $request)
    {
        $validated = $request->validate([
            'audit_id' => 'nullable|integer|exists:stock_audits,id',
        ]);

        $auditQuery = StockAudit::query()
            ->with(['lines.item:id,sku,name', 'auditor:id,name'])
            ->latest('audited_at')
            ->latest('id');

        if (!empty($validated['audit_id'])) {
            $auditQuery->where('id', (int) $validated['audit_id']);
        }

        $audit = $auditQuery->first();

        if (!$audit) {
            abort(404, 'No stock audit found.');
        }

        return Pdf::loadView('inventory.stock-audit-pdf', [
            'audit' => $audit,
            'generatedAt' => now()->format('d/m/Y H:i:s'),
        ])->download('Stock_Audit_' . optional($audit->audited_at)->format('Ymd_His') . '.pdf');
    }

    public function stockAuditStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
            'lines' => 'required|array|min:1',
            'lines.*.item_id' => 'required|integer|distinct|exists:items,id',
            'lines.*.audited_stock' => 'required|integer|min:0',
        ]);

        $audit = DB::transaction(function () use ($request, $validated) {
            $audit = StockAudit::create([
                'audited_by' => $request->user()->id,
                'audited_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            $shortItems = [];

            foreach ($validated['lines'] as $line) {
                $itemId = (int) $line['item_id'];
                $auditedStock = (int) $line['audited_stock'];

                $variant = $this->findOrCreateDefaultVariant($itemId, true);
                $stockBefore = (int) $variant->stock_current;
                $diff = $auditedStock - $stockBefore;
                $shortQty = $auditedStock < $stockBefore ? ($stockBefore - $auditedStock) : 0;

                $variant->update([
                    'stock_current' => $auditedStock,
                ]);

                $audit->lines()->create([
                    'item_id' => $itemId,
                    'stock_before' => $stockBefore,
                    'audited_stock' => $auditedStock,
                    'diff_quantity' => $diff,
                    'short_quantity' => $shortQty,
                ]);

                if ($shortQty > 0) {
                    $item = Item::query()->find($itemId, ['id', 'sku', 'name']);
                    $shortItems[] = [
                        'item_id' => $itemId,
                        'sku' => $item?->sku,
                        'name' => $item?->name,
                        'short_quantity' => $shortQty,
                    ];
                }
            }

            TransactionLog::record('stock_audit', [
                'stock_audit_id' => $audit->id,
                'audited_at' => now()->format('Y-m-d H:i:s'),
                'short_items_count' => count($shortItems),
                'short_items' => $shortItems,
            ]);

            return $audit;
        });

        return response()->json([
            'message' => 'Stock audit saved and current stock updated.',
            'data' => [
                'id' => $audit->id,
            ],
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
            'length_m' => 'nullable|numeric',
            'unit' => 'required|in:pcs,unit,set,roll,bag,btg,pek,tong,helai,can,pellet,cut,scope',
            'bom_scope' => 'required|in:cabin,hardware,hardware_site',
            'supplier' => 'nullable|string|max:255',
        ]);

        $item = Item::create([
            'sku' => $validated['sku'],
            'name' => $validated['name'],
            'length_m' => $validated['length_m'],
            'unit' => $validated['unit'],
            'bom_scope' => $validated['bom_scope'],
            'supplier' => $validated['supplier'] ?? null,
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

    public function bulkStore(Request $request)
    {
        $items = $request->input('items', []);
        
        if (isset($items[182])) {
            Log::info('Bulk Upload Item at index 182:', $items[182]);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1|max:500',
            'items.*.sku' => 'required|string|max:100',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.length_m' => 'nullable|numeric',
            'items.*.unit' => 'required|in:pcs,unit,set,roll,bag,btg,pek,tong,helai,can,pellet,cut,scope',
            'items.*.bom_scope' => 'required|in:cabin,hardware,hardware_site',
        ]);

        $created = [];
        $skipped = [];

        DB::transaction(function () use ($request, $validated, &$created, &$skipped) {
            foreach ($validated['items'] as $row) {
                $exists = Item::where('sku', $row['sku'])->exists();
                if ($exists) {
                    $skipped[] = $row['sku'];
                    continue;
                }

                $item = Item::create([
                    'sku' => $row['sku'],
                    'name' => $row['item_name'],
                    'length_m' => $row['length_m'] ?? null,
                    'unit' => $row['unit'],
                    'bom_scope' => $row['bom_scope'],
                    'created_by' => $request->user()->id,
                ]);

                $item->variants()->create([
                    'color' => null,
                    'stock_initial' => 0,
                    'stock_current' => 0,
                ]);

                $created[] = $item->only(['id', 'sku', 'name', 'length_m', 'unit', 'bom_scope']);
            }
        });

        TransactionLog::record('items_bulk_created', [
            'created_count' => count($created),
            'skipped_count' => count($skipped),
            'skipped_skus' => $skipped,
        ]);

        return redirect()->back()->with('success', count($created) . ' item(s) created.');
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        if ($request->input('length_m') === '') {
            $request->merge(['length_m' => null]);
        }

        $validated = $request->validate([
            'sku' => ['required', 'string', Rule::unique('items', 'sku')->ignore($item->id)],
            'name' => 'required|string|max:255',
            'length_m' => ['nullable', 'numeric'],
            'unit' => 'required|in:pcs,unit,set,roll,bag,btg,pek,tong,helai,can,pellet,cut,scope',
            'bom_scope' => 'required|in:cabin,hardware,hardware_site',
            'supplier' => ['nullable', 'string', 'max:255'],
        ]);

        $item->update($validated);

        TransactionLog::record('item_updated', [
            'id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name,
        ]);

        return response()->json([
            'message' => 'Item updated successfully.',
            'data' => $item->fresh(['variants']),
        ]);
    }

    public function destroy(Item $item): JsonResponse
    {
        // For soft deletion, we don't need to check for DB constraints 
        // because the record stays in the table (just marked as deleted).
        
        $logData = ['id' => $item->id, 'sku' => $item->sku, 'name' => $item->name];

        try {
            // Soft delete the item. This will set 'deleted_at' column.
            // Note: We don't delete variants because soft deleting the parent is enough 
            // to hide it from UI, and keeping variants preserves stock history accurately.
            $item->delete();

            TransactionLog::record('item_deleted', $logData);

            return response()->json([
                'message' => 'Item archived (deleted) successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete item due to system error.',
            ], 500);
        }
    }

    public function stockInForm(): Response
    {
        return $this->stockForm('in');
    }

    public function stockOutForm(): Response
    {
        return $this->stockForm('out');
    }

    public function stockInHistory(): JsonResponse
    {
        $transactions = InventoryTransaction::query()
            ->with(['lines.item', 'package', 'creator'])
            ->where('type', 'in')
            ->latest()
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $transactions->map(function ($t) {
                return [
                    'id' => $t->id,
                    'mode' => $t->mode === 'package' ? 'Package' : 'Ala Carte',
                    'package_name' => $t->package?->name ?? 'N/A',
                    'created_at' => $t->created_at->format('Y-m-d H:i:s'),
                    'creator' => $t->creator?->name ?? 'System',
                    'notes' => $t->notes,
                    'lines_count' => $t->lines->count(),
                    'items_summary' => $t->lines->take(3)->map(function ($l) {
                        return $l->item?->sku . ' (x' . $this->formatQuantity($l->quantity) . ')';
                    })->implode(', ') . ($t->lines->count() > 3 ? '...' : ''),
                ];
            }),
        ]);
    }

    public function stockOutHistory(): JsonResponse
    {
        return response()->json([
            'data' => $this->buildGroupedDeliveryOrders(200),
        ]);
    }

    public function deliveryOrdersIndex(): Response
    {
        return Inertia::render('Inventory/DeliveryOrders', [
            'orders' => $this->buildGroupedDeliveryOrders(500),
        ]);
    }

    public function returnDeliveryOrderForm(int $id): Response
    {
        [$anchorTransaction, $doCode, $skuLines] = $this->buildDeliveryOrderReturnPayload($id);

        return Inertia::render('Inventory/ReturnDeliveryOrder', [
            'order' => [
                'id' => $anchorTransaction->id,
                'code' => $doCode,
                'sales_order_code' => $anchorTransaction->salesOrder?->code ?? 'N/A',
                'customer_name' => $anchorTransaction->salesOrder?->customer_name ?? 'N/A',
            ],
            'skuLines' => $skuLines,
        ]);
    }

    public function returnDeliveryOrderItems(Request $request, int $id): JsonResponse
    {
        [$anchorTransaction, $doCode, $skuLines] = $this->buildDeliveryOrderReturnPayload($id);
        $returnMarker = $this->buildDeliveryOrderReturnMarker($doCode);

        $validated = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.item_id' => 'required|integer|distinct|exists:items,id',
            'lines.*.quantity' => $this->decimalQuantityRules(),
        ]);

        $remainingByItemId = collect($skuLines)
            ->keyBy('item_id')
            ->map(fn ($line) => $this->normalizeQuantity($line['remaining_quantity']))
            ->all();

        $lineMap = [];
        foreach ($validated['lines'] as $line) {
            $itemId = (int) $line['item_id'];
            $quantity = $this->normalizeQuantity($line['quantity']);
            $remaining = $this->normalizeQuantity($remainingByItemId[$itemId] ?? 0);

            if ($remaining <= 0) {
                throw ValidationException::withMessages([
                    'lines' => ['Selected SKU is not available to return for this delivery order.'],
                ]);
            }

            if ($quantity > $remaining) {
                throw ValidationException::withMessages([
                    'lines' => ['Return quantity exceeds remaining quantity for one or more SKU.'],
                ]);
            }

            $lineMap[] = [
                'item_id' => $itemId,
                'quantity' => $quantity,
            ];
        }

        $sourceTransactions = $this->resolveDeliveryOrderTransactions($anchorTransaction);

        $returnedTransaction = DB::transaction(function () use ($request, $anchorTransaction, $lineMap, $returnMarker, $doCode, $sourceTransactions) {
            $salesOrder = $anchorTransaction->sales_order_id
                ? SalesOrder::query()->find($anchorTransaction->sales_order_id)
                : null;

            $notes = $returnMarker;
            if ($salesOrder) {
                $notes .= ' Customer: ' . $salesOrder->customer_name . ' | SO: ' . $salesOrder->code;
            }
            $notes .= ' | Returned selected SKU from delivery order';

            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'package_id' => null,
                'package_quantity' => null,
                'sales_user_id' => null,
                'sales_order_id' => $anchorTransaction->sales_order_id,
                'created_by' => $request->user()->id,
                'notes' => $notes,
            ]);

            foreach ($lineMap as $line) {
                $variant = $this->findOrCreateDefaultVariant((int) $line['item_id'], true);
                $qty = $this->normalizeQuantity($line['quantity']);
                $variant->increment('stock_current', $qty);

                $transaction->lines()->create([
                    'item_id' => (int) $line['item_id'],
                    'item_variant_id' => $variant->id,
                    'quantity' => $qty,
                ]);
            }

            if ($salesOrder) {
                $this->syncSalesOrderProgress($salesOrder);
                $this->refreshSalesOrderStatus($salesOrder);
            }

            TransactionLog::record('stock_out_return', [
                'id' => $transaction->id,
                'do_code' => $doCode,
                'source_transaction_ids' => $sourceTransactions->pluck('id')->values()->all(),
                'lines_count' => count($lineMap),
            ]);

            return $transaction;
        });

        return response()->json([
            'message' => 'Selected SKU returned and stock updated successfully.',
            'data' => $returnedTransaction->load('lines'),
        ]);
    }

    public function returnDeliveryOrder(Request $request, int $id): JsonResponse
    {
        $anchorTransaction = InventoryTransaction::query()
            ->with(['lines.item'])
            ->findOrFail($id);

        if ($anchorTransaction->type !== 'out') {
            abort(404, 'Transaction is not a delivery order.');
        }

        $sourceTransactions = $this->resolveDeliveryOrderTransactions($anchorTransaction);
        $doCode = $this->buildDeliveryOrderCode($anchorTransaction);
        $returnMarker = $this->buildDeliveryOrderReturnMarker($doCode);

        $alreadyReturned = InventoryTransaction::query()
            ->where('type', 'in')
            ->where('notes', 'like', '%' . $returnMarker . '%')
            ->exists();

        if ($alreadyReturned) {
            throw ValidationException::withMessages([
                'delivery_order' => ['Delivery order already returned.'],
            ]);
        }

        $lineMap = [];
        foreach ($sourceTransactions as $transaction) {
            foreach ($transaction->lines as $line) {
                $itemId = (int) $line->item_id;
                if (!isset($lineMap[$itemId])) {
                    $lineMap[$itemId] = [
                        'item_id' => $itemId,
                        'quantity' => 0.0,
                    ];
                }
                $lineMap[$itemId]['quantity'] = $this->normalizeQuantity($lineMap[$itemId]['quantity'] + $line->quantity);
            }
        }

        if (empty($lineMap)) {
            throw ValidationException::withMessages([
                'delivery_order' => ['Delivery order has no lines to return.'],
            ]);
        }

        $returnedTransaction = DB::transaction(function () use ($request, $anchorTransaction, $lineMap, $returnMarker, $doCode, $sourceTransactions) {
            $salesOrder = $anchorTransaction->sales_order_id
                ? SalesOrder::query()->find($anchorTransaction->sales_order_id)
                : null;

            $notes = $returnMarker;
            if ($salesOrder) {
                $notes .= ' Customer: ' . $salesOrder->customer_name . ' | SO: ' . $salesOrder->code;
            }
            $notes .= ' | Returned from submitted delivery order';

            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'package_id' => null,
                'package_quantity' => null,
                'sales_user_id' => null,
                'sales_order_id' => $anchorTransaction->sales_order_id,
                'created_by' => $request->user()->id,
                'notes' => $notes,
            ]);

            foreach ($lineMap as $line) {
                $variant = $this->findOrCreateDefaultVariant((int) $line['item_id'], true);
                $qty = $this->normalizeQuantity($line['quantity']);

                $variant->increment('stock_current', $qty);

                $transaction->lines()->create([
                    'item_id' => (int) $line['item_id'],
                    'item_variant_id' => $variant->id,
                    'quantity' => $qty,
                ]);
            }

            if ($salesOrder) {
                $this->syncSalesOrderProgress($salesOrder);
                $this->refreshSalesOrderStatus($salesOrder);
            }

            TransactionLog::record('stock_out_return', [
                'id' => $transaction->id,
                'do_code' => $doCode,
                'source_transaction_ids' => $sourceTransactions->pluck('id')->values()->all(),
                'lines_count' => count($lineMap),
            ]);

            return $transaction;
        });

        return response()->json([
            'message' => 'Delivery order returned and stock updated successfully.',
            'data' => $returnedTransaction->load('lines'),
        ]);
    }

    public function returnDeliveryOrderSku(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => $this->decimalQuantityRules(),
        ]);

        $anchorTransaction = InventoryTransaction::query()
            ->with(['lines.item'])
            ->findOrFail($id);

        if ($anchorTransaction->type !== 'out') {
            abort(404, 'Transaction is not a delivery order.');
        }

        $sourceTransactions = $this->resolveDeliveryOrderTransactions($anchorTransaction);
        $doCode = $this->buildDeliveryOrderCode($anchorTransaction);
        $returnMarker = $this->buildDeliveryOrderReturnMarker($doCode);

        $itemId = (int) $validated['item_id'];
        $requestedQty = $this->normalizeQuantity($validated['quantity']);

        $shippedQty = 0.0;
        foreach ($sourceTransactions as $transaction) {
            foreach ($transaction->lines as $line) {
                if ((int) $line->item_id === $itemId) {
                    $shippedQty = $this->normalizeQuantity($shippedQty + $line->quantity);
                }
            }
        }

        if ($shippedQty <= 0) {
            throw ValidationException::withMessages([
                'item_id' => ['Selected SKU is not part of this delivery order.'],
            ]);
        }

        $returnedQty = $this->normalizeQuantity(DB::table('inventory_transaction_lines as transaction_lines')
            ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
            ->where('transactions.type', 'in')
            ->where('transactions.notes', 'like', '%' . $returnMarker . '%')
            ->where('transaction_lines.item_id', $itemId)
            ->sum('transaction_lines.quantity'));

        $availableToReturn = max($this->normalizeQuantity($shippedQty - $returnedQty), 0);
        if ($requestedQty > $availableToReturn) {
            throw ValidationException::withMessages([
                'quantity' => ['Return quantity exceeds remaining quantity for this SKU.'],
            ]);
        }

        $returnedTransaction = DB::transaction(function () use ($request, $anchorTransaction, $sourceTransactions, $itemId, $requestedQty, $doCode, $returnMarker) {
            $salesOrder = $anchorTransaction->sales_order_id
                ? SalesOrder::query()->find($anchorTransaction->sales_order_id)
                : null;

            $notes = $returnMarker;
            if ($salesOrder) {
                $notes .= ' Customer: ' . $salesOrder->customer_name . ' | SO: ' . $salesOrder->code;
            }
            $notes .= ' | Returned SKU from submitted delivery order';

            $transaction = InventoryTransaction::create([
                'type' => 'in',
                'mode' => 'alacarte',
                'package_id' => null,
                'package_quantity' => null,
                'sales_user_id' => null,
                'sales_order_id' => $anchorTransaction->sales_order_id,
                'created_by' => $request->user()->id,
                'notes' => $notes,
            ]);

            $variant = $this->findOrCreateDefaultVariant($itemId, true);
            $variant->increment('stock_current', $requestedQty);

            $transaction->lines()->create([
                'item_id' => $itemId,
                'item_variant_id' => $variant->id,
                'quantity' => $requestedQty,
            ]);

            if ($salesOrder) {
                $this->syncSalesOrderProgress($salesOrder);
                $this->refreshSalesOrderStatus($salesOrder);
            }

            TransactionLog::record('stock_out_return', [
                'id' => $transaction->id,
                'do_code' => $doCode,
                'source_transaction_ids' => $sourceTransactions->pluck('id')->values()->all(),
                'item_id' => $itemId,
                'quantity' => $requestedQty,
                'lines_count' => 1,
            ]);

            return $transaction;
        });

        return response()->json([
            'message' => 'Delivery order SKU returned and stock updated successfully.',
            'data' => $returnedTransaction->load('lines'),
        ]);
    }

    public function downloadDoPdf(int $id)
    {
        $transaction = InventoryTransaction::query()
            ->with(['lines.item', 'salesOrder', 'creator'])
            ->findOrFail($id);

        if ($transaction->type !== 'out') {
            abort(404, 'Transaction is not a delivery order.');
        }

        $doCode = $this->buildDeliveryOrderCode($transaction);

        $relatedTransactions = InventoryTransaction::query()
            ->with(['lines.item', 'salesOrder', 'creator'])
            ->where('type', 'out')
            ->when(
                !empty($transaction->sales_order_id),
                fn ($query) => $query->where('sales_order_id', $transaction->sales_order_id),
                fn ($query) => $query->where('id', $transaction->id)
            )
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $shipmentGroups = $relatedTransactions->map(function ($tx) {
            $lines = $tx->lines
                ->map(function ($line) {
                    return [
                        'sku' => $line->item?->sku ?? 'N/A',
                        'name' => $line->item?->name ?? 'Unknown Item',
                        'unit' => $line->item?->unit ?? '',
                        'quantity' => $this->normalizeQuantity($line->quantity),
                    ];
                })
                ->sortBy('sku')
                ->values();

            return [
                'transaction_id' => $tx->id,
                'date' => optional($tx->created_at)->format('d/m/Y H:i'),
                'creator' => $tx->creator?->name ?? 'System',
                'lines' => $lines,
            ];
        })->values();

        $doDates = $relatedTransactions
            ->pluck('created_at')
            ->map(fn ($dt) => optional($dt)->format('d/m/Y H:i'))
            ->filter()
            ->unique()
            ->values();

        // Fetch return transactions
        $returnMarker = $this->buildDeliveryOrderReturnMarker($doCode);
        $returnTransactions = InventoryTransaction::query()
            ->with(['lines.item', 'creator'])
            ->where('type', 'in')
            ->where('notes', 'like', '%' . $returnMarker . '%')
            ->orderBy('created_at')
            ->get();

        $returnGroups = $returnTransactions->map(function ($tx) {
            $lines = $tx->lines
                ->map(function ($line) {
                    return [
                        'sku' => $line->item?->sku ?? 'N/A',
                        'name' => $line->item?->name ?? 'Unknown Item',
                        'unit' => $line->item?->unit ?? '',
                        'quantity' => $this->normalizeQuantity($line->quantity),
                    ];
                })
                ->sortBy('sku')
                ->values();

            return [
                'transaction_id' => $tx->id,
                'date' => optional($tx->created_at)->format('d/m/Y H:i'),
                'creator' => $tx->creator?->name ?? 'System',
                'lines' => $lines,
                'notes' => $tx->notes,
            ];
        })->values();

        $pdf = Pdf::loadView('inventory.do-pdf', [
            'transaction' => $transaction,
            'doCode' => $doCode,
            'transactions' => $relatedTransactions,
            'shipmentGroups' => $shipmentGroups,
            'returnGroups' => $returnGroups,
            'doDates' => $doDates,
            'generatedAt' => now()->format('d/m/Y H:i:s'),
        ]);

        return $pdf->download('DO_' . str_pad($transaction->id, 6, '0', STR_PAD_LEFT) . '.pdf');
    }

    private function buildDeliveryOrderCode(InventoryTransaction $transaction): string
    {
        if (!empty($transaction->sales_order_id)) {
            return 'DO-' . str_pad((int) $transaction->sales_order_id, 6, '0', STR_PAD_LEFT);
        }

        return 'DO-' . str_pad((int) $transaction->id, 6, '0', STR_PAD_LEFT);
    }

    private function buildGroupedDeliveryOrders(int $limit = 200)
    {
        $transactions = InventoryTransaction::query()
            ->with(['lines.item', 'salesOrder', 'creator'])
            ->where('type', 'out')
            ->latest()
            ->limit($limit)
            ->get();

        $returnedCodes = InventoryTransaction::query()
            ->where('type', 'in')
            ->where('notes', 'like', '%[DO-RETURN:%')
            ->pluck('notes')
            ->map(function ($notes) {
                if (!is_string($notes)) {
                    return null;
                }

                if (preg_match('/\[DO-RETURN:([^\]]+)\]/', $notes, $matches) === 1) {
                    return trim((string) ($matches[1] ?? ''));
                }

                return null;
            })
            ->filter()
            ->values()
            ->all();

        return $transactions
            ->groupBy(function ($transaction) {
                return $this->buildDeliveryOrderCode($transaction);
            })
            ->map(function ($group, $doCode) use ($returnedCodes) {
                $latest = $group->sortByDesc('created_at')->first();
                $first = $group->first();

                $linesBySku = [];
                foreach ($group as $transaction) {
                    foreach ($transaction->lines as $line) {
                        $sku = $line->item?->sku ?? 'N/A';
                        if (!isset($linesBySku[$sku])) {
                            $linesBySku[$sku] = [
                                'sku' => $sku,
                                'quantity' => 0.0,
                            ];
                        }
                        $linesBySku[$sku]['quantity'] = $this->normalizeQuantity($linesBySku[$sku]['quantity'] + $line->quantity);
                    }
                }

                $lineSummary = collect($linesBySku)
                    ->values()
                    ->take(5)
                    ->map(function ($line) {
                        return $line['sku'] . ' (x' . $this->formatQuantity($line['quantity']) . ')';
                    })
                    ->implode(', ');

                $hasMoreLines = count($linesBySku) > 5;

                $dates = $group
                    ->pluck('created_at')
                    ->map(function ($dt) {
                        return optional($dt)->format('Y-m-d H:i:s');
                    })
                    ->filter()
                    ->unique()
                    ->values();

                $isReturned = in_array((string) $doCode, $returnedCodes, true);

                return [
                    'id' => $latest->id,
                    'code' => $doCode,
                    'sales_order_code' => $first->salesOrder?->code ?? 'N/A',
                    'customer_name' => $first->salesOrder?->customer_name ?? 'N/A',
                    'created_at' => $latest->created_at->format('Y-m-d H:i:s'),
                    'creator' => $latest->creator?->name ?? 'System',
                    'items_summary' => $lineSummary . ($hasMoreLines ? '...' : ''),
                    'do_dates' => $dates,
                    'do_dates_text' => $dates->implode(' | '),
                    'is_returned' => $isReturned,
                ];
            })
            ->sortByDesc('created_at')
            ->values();
    }

    private function buildDeliveryOrderReturnMarker(string $doCode): string
    {
        return '[DO-RETURN:' . $doCode . ']';
    }

    private function buildDeliveryOrderReturnPayload(int $id): array
    {
        $anchorTransaction = InventoryTransaction::query()
            ->with(['salesOrder'])
            ->findOrFail($id);

        if ($anchorTransaction->type !== 'out') {
            abort(404, 'Transaction is not a delivery order.');
        }

        $sourceTransactions = $this->resolveDeliveryOrderTransactions($anchorTransaction);
        $doCode = $this->buildDeliveryOrderCode($anchorTransaction);
        $returnMarker = $this->buildDeliveryOrderReturnMarker($doCode);

        $shippedByItem = [];
        foreach ($sourceTransactions as $transaction) {
            foreach ($transaction->lines as $line) {
                $itemId = (int) $line->item_id;
                if (!isset($shippedByItem[$itemId])) {
                    $shippedByItem[$itemId] = 0.0;
                }
                $shippedByItem[$itemId] = $this->normalizeQuantity($shippedByItem[$itemId] + $line->quantity);
            }
        }

        $returnedRows = DB::table('inventory_transaction_lines as transaction_lines')
            ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
            ->where('transactions.type', 'in')
            ->where('transactions.notes', 'like', '%' . $returnMarker . '%')
            ->select('transaction_lines.item_id', DB::raw('SUM(transaction_lines.quantity) as returned_quantity'))
            ->groupBy('transaction_lines.item_id')
            ->pluck('returned_quantity', 'item_id')
            ->map(fn ($qty) => $this->normalizeQuantity($qty))
            ->all();

        $items = empty($shippedByItem)
            ? collect()
            : Item::query()
                ->whereIn('id', array_keys($shippedByItem))
                ->orderBy('sku')
                ->get(['id', 'sku', 'name', 'unit', 'bom_scope'])
                ->keyBy('id');

        $skuLines = [];
        foreach ($shippedByItem as $itemId => $shippedQuantity) {
            $returnedQuantity = $this->normalizeQuantity($returnedRows[$itemId] ?? 0);
            $remainingQuantity = max($this->normalizeQuantity($shippedQuantity - $returnedQuantity), 0);
            $item = $items->get($itemId);

            $skuLines[] = [
                'item_id' => (int) $itemId,
                'sku' => $item?->sku ?? 'N/A',
                'name' => $item?->name ?? 'Unknown Item',
                'unit' => $item?->unit ?? '',
                'bom_scope' => $item?->bom_scope,
                'shipped_quantity' => $this->normalizeQuantity($shippedQuantity),
                'returned_quantity' => $returnedQuantity,
                'remaining_quantity' => $remainingQuantity,
            ];
        }

        $skuLines = collect($skuLines)->sortBy('sku')->values()->all();

        return [$anchorTransaction, $doCode, $skuLines];
    }

    private function resolveDeliveryOrderTransactions(InventoryTransaction $transaction)
    {
        return InventoryTransaction::query()
            ->with(['lines.item', 'salesOrder', 'creator'])
            ->where('type', 'out')
            ->when(
                !empty($transaction->sales_order_id),
                fn ($query) => $query->where('sales_order_id', $transaction->sales_order_id),
                fn ($query) => $query->where('id', $transaction->id)
            )
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();
    }

    private function stockForm(string $type): Response
    {
        $type = $type === 'out' ? 'out' : 'in';

        $items = Item::query()
            ->select(['id', 'sku', 'name', 'unit', 'bom_scope'])
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
        $shippedByOrderSku = [];
        $itemsBySku = collect();
        if ($type === 'out' && Schema::hasTable('sales_orders')) {
            $salesOrders = SalesOrder::query()
                ->with([
                    'lines' => function ($query) {
                        $query->with([
                            'item:id,sku,name,unit,bom_scope',
                            'package:id,code,name',
                            'package.packageItems.item:id,sku,name,unit,bom_scope',
                        ])->orderBy('id');
                    },
                ])
                ->whereIn('status', ['open', 'partial'])
                ->orderByDesc('order_date')
                ->orderByDesc('id')
                ->limit(50)
                ->get(['id', 'code', 'customer_name', 'order_date']);

            $orderIds = $salesOrders->pluck('id')->all();

            $shippedRows = empty($orderIds)
                ? collect()
                : DB::table('inventory_transaction_lines as transaction_lines')
                    ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
                    ->join('items', 'items.id', '=', 'transaction_lines.item_id')
                    ->where('transactions.type', 'out')
                    ->whereIn('transactions.sales_order_id', $orderIds)
                    ->select(
                        'transactions.sales_order_id',
                        'items.sku',
                        DB::raw('SUM(transaction_lines.quantity) as shipped_quantity')
                    )
                    ->groupBy('transactions.sales_order_id', 'items.sku')
                    ->get();

            $returnedRows = empty($orderIds)
                ? collect()
                : DB::table('inventory_transaction_lines as transaction_lines')
                    ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
                    ->join('items', 'items.id', '=', 'transaction_lines.item_id')
                    ->where('transactions.type', 'in')
                    ->where('transactions.notes', 'like', '%[DO-RETURN:%')
                    ->whereIn('transactions.sales_order_id', $orderIds)
                    ->select(
                        'transactions.sales_order_id',
                        'items.sku',
                        DB::raw('SUM(transaction_lines.quantity) as returned_quantity')
                    )
                    ->groupBy('transactions.sales_order_id', 'items.sku')
                    ->get();

            $shippedByOrderSkuRaw = $shippedRows
                ->groupBy('sales_order_id')
                ->map(function ($rows) {
                    return collect($rows)
                        ->pluck('shipped_quantity', 'sku')
                        ->map(fn($qty) => $this->normalizeQuantity($qty))
                        ->toArray();
                })
                ->toArray();

            $returnedByOrderSku = $returnedRows
                ->groupBy('sales_order_id')
                ->map(function ($rows) {
                    return collect($rows)
                        ->pluck('returned_quantity', 'sku')
                        ->map(fn($qty) => $this->normalizeQuantity($qty))
                        ->toArray();
                })
                ->toArray();

            foreach ($shippedByOrderSkuRaw as $orderId => $skuMap) {
                foreach ($skuMap as $sku => $qty) {
                    $returnedQty = $this->normalizeQuantity($returnedByOrderSku[$orderId][$sku] ?? 0);
                    $shippedByOrderSku[$orderId][$sku] = max($this->normalizeQuantity($qty - $returnedQty), 0);
                }
            }

            $orderedSkus = $salesOrders
                ->flatMap(function ($order) {
                    return $order->lines
                        ->whereNotNull('item_sku')
                        ->pluck('item_sku');
                })
                ->filter()
                ->unique()
                ->values();

            $itemsBySku = $orderedSkus->isEmpty()
                ? collect()
                : Item::query()
                    ->whereIn('sku', $orderedSkus->all())
                    ->get(['sku', 'name', 'bom_scope'])
                    ->keyBy('sku');

            $salesOrders = $salesOrders->map(function ($order) use ($shippedByOrderSku, $itemsBySku) {
                $shippedBySku = $shippedByOrderSku[$order->id] ?? [];

                $orderedBySku = [];
                foreach ($order->lines as $line) {
                    if ($line->package_id) {
                        $packageItems = $line->package?->packageItems ?? collect();
                        foreach ($packageItems as $packageItem) {
                            $sku = $packageItem->item?->sku;
                            if (!$sku) {
                                continue;
                            }

                            $orderedBySku[$sku] = ($orderedBySku[$sku] ?? 0)
                                + $this->normalizeQuantity($line->package_quantity * $packageItem->quantity);
                        }
                        continue;
                    }

                    if (!empty($line->item_sku)) {
                        $orderedBySku[$line->item_sku] = ($orderedBySku[$line->item_sku] ?? 0)
                            + $this->normalizeQuantity($line->item_quantity);
                    }
                }

                $pendingSkuLines = [];
                foreach ($orderedBySku as $sku => $ordered) {
                    $ordered = $this->normalizeQuantity($ordered);
                    $shipped = $this->normalizeQuantity($shippedBySku[$sku] ?? 0);
                    $remaining = max($this->normalizeQuantity($ordered - $shipped), 0);

                    if ($remaining <= 0) {
                        continue;
                    }

                    $item = $itemsBySku->get($sku);
                    $pendingSkuLines[] = [
                        'sku' => $sku,
                        'name' => $item?->name,
                        'bom_scope' => $item?->bom_scope,
                        'ordered_quantity' => $ordered,
                        'shipped_quantity' => min($shipped, $ordered),
                        'pending_quantity' => $remaining,
                    ];
                }

                $order->setAttribute('pending_sku_lines', $pendingSkuLines);

                return $order;
            })
                ->filter(function ($order) {
                    return !empty($order->pending_sku_lines);
                })
                ->values();
        }

        $historyData = collect();
        if ($type === 'in') {
            $historyData = InventoryTransaction::query()
                ->with(['lines.item', 'package', 'creator'])
                ->where('type', 'in')
                ->latest()
                ->limit(10)
                ->get()
                ->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'mode' => $t->mode === 'package' ? 'Package' : 'Ala Carte',
                        'package_name' => $t->package?->name ?? 'N/A',
                        'created_at' => $t->created_at->format('Y-m-d H:i:s'),
                        'creator' => $t->creator?->name ?? 'System',
                        'notes' => $t->notes,
                        'lines_count' => $t->lines->count(),
                        'items_summary' => $t->lines->take(3)->map(function ($l) {
                            return $l->item?->sku . ' (x' . $this->formatQuantity($l->quantity) . ')';
                        })->implode(', ') . ($t->lines->count() > 3 ? '...' : ''),
                    ];
                });
        }

        return Inertia::render('Inventory/Stock', [
            'items' => $items,
            'type' => $type,
            'packages' => $packages,
            'salesOrders' => $salesOrders,
            'historyData' => $historyData,
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
            'lines.*.quantity' => $this->decimalQuantityRules(),
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
                        'quantity' => $this->normalizeQuantity($line['quantity']),
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
        if (!$salesOrderTableReady) {
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
            'lines.*.quantity' => $this->decimalQuantityRules(),
            'sales_order_id' => [
                'required',
                'integer',
                Rule::exists('sales_orders', 'id')->whereIn('status', ['open', 'partial']),
            ],
            'completion_action' => 'nullable|in:partial_done,done',
            'notes' => 'nullable|string|max:500',
        ]);

        $completionAction = $validated['completion_action'] ?? 'partial_done';

        if ($completionAction === 'done' && !$request->boolean('done_confirmed')) {
            throw ValidationException::withMessages([
                'done_confirmed' => ['Please confirm no further delivery order before marking Done.'],
            ]);
        }

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
                        'quantity' => $this->normalizeQuantity($line['quantity']),
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
                        'Insufficient stock for ' . $item?->sku . '. Current: ' . $variant->stock_current,
                    ],
                ]);
            }
        }

        $transaction = DB::transaction(function () use ($request, $validated, $lines, $salesOrder, $completionAction) {
            $mergedNotes = 'Customer: ' . $salesOrder->customer_name;
            if ($salesOrder) {
                $mergedNotes .= ' | SO: ' . $salesOrder->code;
            }
            if (!empty($validated['notes'])) {
                $mergedNotes .= ' | ' . $validated['notes'];
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
                $variant = ItemVariant::query()
                    ->where('item_id', $line['item_id'])
                    ->where(function ($query) {
                        $query->whereNull('color')->orWhere('color', '');
                    })
                    ->lockForUpdate()
                    ->first();

                if (!$variant) {
                    throw ValidationException::withMessages([
                        'package_quantity' => ['No stock variant found for selected SKU.'],
                    ]);
                }

                if ($variant->stock_current < $line['quantity']) {
                    $item = Item::query()->find($line['item_id']);
                    throw ValidationException::withMessages([
                        'package_quantity' => [
                            'Insufficient stock for ' . $item?->sku . '. Current: ' . $variant->stock_current,
                        ],
                    ]);
                }

                $variant->decrement('stock_current', $line['quantity']);

                $transaction->lines()->create([
                    'item_id' => $line['item_id'],
                    'item_variant_id' => $variant->id,
                    'quantity' => $line['quantity'],
                ]);
            }

            if ($salesOrder) {
                $this->syncSalesOrderProgress($salesOrder);

                $salesOrder->update([
                    'status' => $completionAction === 'done' ? 'fulfilled' : 'partial',
                ]);
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
        $order->load('lines');

        $shippedBySku = DB::table('inventory_transaction_lines as transaction_lines')
            ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
            ->join('items', 'items.id', '=', 'transaction_lines.item_id')
            ->where('transactions.type', 'out')
            ->where('transactions.sales_order_id', $order->id)
            ->select('items.sku', DB::raw('SUM(transaction_lines.quantity) as shipped_quantity'))
            ->groupBy('items.sku')
            ->pluck('shipped_quantity', 'sku')
            ->map(fn($quantity) => $this->normalizeQuantity($quantity))
            ->all();

        $returnedBySku = DB::table('inventory_transaction_lines as transaction_lines')
            ->join('inventory_transactions as transactions', 'transactions.id', '=', 'transaction_lines.inventory_transaction_id')
            ->join('items', 'items.id', '=', 'transaction_lines.item_id')
            ->where('transactions.type', 'in')
            ->where('transactions.sales_order_id', $order->id)
            ->where('transactions.notes', 'like', '%[DO-RETURN:%')
            ->select('items.sku', DB::raw('SUM(transaction_lines.quantity) as returned_quantity'))
            ->groupBy('items.sku')
            ->pluck('returned_quantity', 'sku')
            ->map(fn($quantity) => $this->normalizeQuantity($quantity))
            ->all();

        $remainingBySku = [];
        foreach ($shippedBySku as $sku => $qty) {
            $remainingBySku[$sku] = max($this->normalizeQuantity($qty - ($returnedBySku[$sku] ?? 0)), 0);
        }

        foreach ($order->lines as $line) {
            if ($line->item_sku) {
                $availableQuantity = $this->normalizeQuantity($remainingBySku[$line->item_sku] ?? 0);
                $shippedQuantity = min($this->normalizeQuantity($line->item_quantity), max($availableQuantity, 0));
                $remainingBySku[$line->item_sku] = max(0, $this->normalizeQuantity($availableQuantity - $shippedQuantity));

                $line->update([
                    'shipped_quantity' => $shippedQuantity,
                ]);
            }
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

        $anyShipped = $order->lines->contains(fn($line) => $line->shipped_quantity > 0);

        $status = $allFulfilled ? 'fulfilled' : ($anyShipped ? 'partial' : 'open');
        $order->update(['status' => $status]);
    }

    private function resolvePackageLines(int $packageId, int $packageQuantity): array
    {
        $package = Package::query()
            ->with('packageItems')
            ->find($packageId);

        if (!$package || !$package->is_active) {
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
                    'quantity' => $this->normalizeQuantity($line->quantity * $packageQuantity),
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

        if (!$allowCreate) {
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
