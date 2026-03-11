<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\ItemVariant;
use App\Models\Item;
use App\Models\Package;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\TransactionLog;
use App\Models\ContainerReceivingNote;
use App\Models\CrnItem;
use App\Models\RejectedItem;
use App\Models\MaterialReceivingNote;
use App\Models\MaterialReceivingNoteItem;
use App\Models\SalesOrder;
use App\Models\SiteReceivingNote;
use App\Models\SiteReceivingNoteItem;
use App\Services\ProcurementService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\Supplier;

class ProcurementController extends Controller
{
    private ProcurementService $service;

    public function __construct(ProcurementService $service)
    {
        $this->service = $service;
    }

    private const PROCUREMENT_SCOPES = [
        Bom::TYPE_CABIN => [
            'label' => 'BOM Cabin',
            'path' => 'cabin',
        ],
        Bom::TYPE_HARDWARE => [
            'label' => 'BOM Hardware',
            'path' => 'hardware',
        ],
        Bom::TYPE_HARDWARE_SITE => [
            'label' => 'BOM Hardware Site',
            'path' => 'hardware-site',
        ],
    ];

    private const ORDER_RELATIONS = [
        'packageLines.package:id,code,name',
        'packageLines.package.packageItems.item:id,sku,name,unit',
        'lines.item:id,sku,name,unit,bom_scope',
        'supplier:id,name',
    ];

    public function index(Request $request): Response
    {
        $scope = $this->resolveScope($request);
        $scopeConfig = $this->scopeConfig($scope);

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
        $packages = collect();
        $suppliers = collect();

        if ($databaseReady) {
            $suppliers = Supplier::all(['id', 'name']);
            
            $orders = ProcurementOrder::query()
                ->with(self::ORDER_RELATIONS)
                ->where('status', '!=', 'received')
                ->where('procurement_scope', $scope)
                ->latest()
                ->get(['id', 'code', 'status', 'supplier_id', 'supplier_name', 'notes', 'created_at']);

            $suggestion = $this->service->getShortageSuggestions($scope);
            
            $packageAvailability = $scope === Bom::TYPE_CABIN 
                ? $this->service->calculatePackageAvailability($scope) 
                : [];
            
            $items = Item::query()
                ->where('bom_scope', $scope)
                ->orderBy('sku')
                ->get(['id', 'sku', 'name', 'unit', 'bom_scope']);

            $packages = Package::query()
                ->with(['boms' => function ($query) use ($scope) {
                    $query->where('type', $scope)->with('bomItems.item');
                }])
                ->whereHas('boms', function ($query) use ($scope) {
                    $query->where('type', $scope)->whereHas('bomItems');
                })
                ->orderBy('code')
                ->get();
        }

        return Inertia::render('Procurement/Index', [
            'databaseReady' => $databaseReady,
            'canManage' => $request->user()?->hasModuleAccess('procurement') ?? false,
            'canReceive' => $request->user()?->hasModuleAccess('procurement') ?? false,
            'scopeKey' => $scope,
            'scopeLabel' => $scopeConfig['label'],
            'routeBase' => '/procurement/' . $scopeConfig['path'],
            'suggestion' => $suggestion,
            'orders' => $orders,
            'items' => $items,
            'packages' => $packages,
            'suppliers' => $suppliers,
            'packageAvailability' => $packageAvailability,
        ]);
    }

    public function suppliersIndex(): Response
    {
        return Inertia::render('Procurement/Suppliers', [
            'suppliers' => Supplier::latest()->get(),
        ]);
    }

    public function suppliersStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'Supplier registered successfully.',
            'data' => $supplier,
        ], 201);
    }

    public function suppliersUpdate(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier->update($validated);

        return response()->json([
            'message' => 'Supplier updated successfully.',
            'data' => $supplier,
        ]);
    }

    public function suppliersDestroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);

        $validated = $request->validate([
            'package_lines' => 'nullable|array',
            'package_lines.*.package_id' => 'required|integer|exists:packages,id|distinct',
            'package_lines.*.quantity' => 'required|integer|min:1',
            'sku_lines' => 'nullable|array',
            'sku_lines.*.item_id' => 'required|integer|exists:items,id|distinct',
            'sku_lines.*.quantity' => [
                'required',
                'numeric',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! preg_match('/^-?\d+(?:\.\d)?$/', trim((string) $value))) {
                        $fail('The ' . str_replace('_', ' ', $attribute) . ' field must have at most 1 decimal place.');
                    }
                },
            ],
            'sku_lines.*.unit' => 'nullable|string|max:50',
            'sku_suppliers' => 'nullable|array', // { item_id => supplier_id }
            'notes' => 'nullable|string|max:500',
        ]);

        if (empty($validated['package_lines']) && empty($validated['sku_lines'])) {
            return response()->json([
                'message' => 'Please add at least one package or SKU to the order.',
            ], 422);
        }

        $scopedItems = Item::query()
            ->whereIn('id', collect($validated['sku_lines'] ?? [])->pluck('item_id'))
            ->where('bom_scope', $scope)
            ->get()
            ->keyBy('id');

        $scopedPackages = $this->scopedPackagesById(collect($validated['package_lines'] ?? [])->pluck('package_id'), $scope);

        // Grouping logic: [supplier_id => [item_id => qty]]
        // Using 0 as a placeholder for "General/No Supplier Selected"
        $supplierGroups = []; 
        $skuSuppliersMap = ($scope === Bom::TYPE_HARDWARE) ? ($validated['sku_suppliers'] ?? []) : [];

        // Process Packages -> Aggregate their SKUs
        foreach ($validated['package_lines'] ?? [] as $pLine) {
            $packageId = (int) $pLine['package_id'];
            $packageQty = (int) $pLine['quantity'];
            $package = $scopedPackages->get($packageId);
            $scopeBom = $this->packageBomForScope($package, $scope);

            if ($scopeBom) {
                foreach ($scopeBom->bomItems as $bomItem) {
                    $itemId = (int) $bomItem->item_id;
                    $supplierId = (int) ($skuSuppliersMap[$itemId] ?? 0);
                    $needed = $this->normalizeQuantity($packageQty * $bomItem->quantity);

                    if (!isset($supplierGroups[$supplierId][$itemId])) {
                        $supplierGroups[$supplierId][$itemId] = ['qty' => 0, 'unit' => $bomItem->item?->unit];
                    }
                    $supplierGroups[$supplierId][$itemId]['qty'] = $this->normalizeQuantity($supplierGroups[$supplierId][$itemId]['qty'] + $needed);
                }
            }
        }

        // Process Loose SKUs
        foreach ($validated['sku_lines'] ?? [] as $sLine) {
            $itemId = (int) $sLine['item_id'];
            $supplierId = (int) ($skuSuppliersMap[$itemId] ?? 0);
            $qty = $this->normalizeQuantity($sLine['quantity']);
            $unit = $sLine['unit'] ?? null;
            
            if (!isset($supplierGroups[$supplierId][$itemId])) {
                $supplierGroups[$supplierId][$itemId] = ['qty' => 0, 'unit' => $unit];
            } else if ($unit) {
                $supplierGroups[$supplierId][$itemId]['unit'] = $unit;
            }

            $supplierGroups[$supplierId][$itemId]['qty'] = $this->normalizeQuantity($supplierGroups[$supplierId][$itemId]['qty'] + $qty);
        }

        foreach ($supplierGroups as $supplierId => $items) {
            foreach ($items as $itemId => $data) {
                if ($this->normalizeQuantity($data['qty']) <= 0) {
                    unset($supplierGroups[$supplierId][$itemId]);
                }
            }

            if (empty($supplierGroups[$supplierId])) {
                unset($supplierGroups[$supplierId]);
            }
        }

        if (empty($supplierGroups)) {
            return response()->json([
                'message' => 'Please keep at least one SKU quantity above 0.',
            ], 422);
        }

        $createdOrders = DB::transaction(function () use ($request, $validated, $scope, $supplierGroups) {
            $orders = [];
            foreach ($supplierGroups as $supplierId => $items) {
                $supplier = $supplierId > 0 ? Supplier::find($supplierId) : null;
                $supplierName = $supplier?->name ?? 'General';

                $order = ProcurementOrder::create([
                    'code' => $this->generateCode(),
                    'status' => 'submitted',
                    'supplier_id' => $supplierId > 0 ? $supplierId : null,
                    'supplier_name' => $supplierName,
                    'procurement_scope' => $scope,
                    'created_by' => $request->user()->id,
                    'notes' => $validated['notes'] ?? null,
                ]);

                if ($scope !== Bom::TYPE_HARDWARE) {
                    foreach ($validated['package_lines'] ?? [] as $packageLine) {
                        $order->packageLines()->create([
                            'package_id' => (int) $packageLine['package_id'],
                            'quantity' => (int) $packageLine['quantity'],
                        ]);
                    }
                }

                foreach ($items as $itemId => $data) {
                    $order->lines()->create([
                        'item_id' => $itemId,
                        'suggested_quantity' => $data['qty'],
                        'ordered_quantity' => $data['qty'],
                        'item_unit' => $data['unit'],
                        'received_quantity' => 0,
                        'rejected_quantity' => 0,
                    ]);
                }

                $this->createReceivingNoteForScope($order, $scope, $request->user()->id);
                
                TransactionLog::record('procurement_order_created', [
                    'id' => $order->id,
                    'code' => $order->code,
                    'supplier_id' => $supplierId,
                    'supplier_name' => $supplierName,
                ]);

                $orders[] = $order;
            }
            return $orders;
        });

        return response()->json([
            'message' => count($createdOrders) . ' procurement orders generated by supplier selection.',
            'data' => $this->findOrderWithRelations($createdOrders[0]->id),
        ], 201);
    }

    public function receive(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);

        $validated = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.line_id' => 'required|integer|distinct',
            'lines.*.received_quantity' => $this->decimalQuantityRules(true),
        ]);

        $inputByLineId = collect($validated['lines'])->keyBy(fn ($line) => (int) $line['line_id']);

        $order->load('lines');

        DB::transaction(function () use ($order, $inputByLineId, $validated) {
            foreach ($order->lines as $line) {
                if (! $inputByLineId->has($line->id)) {
                    continue;
                }

                $receivedQuantity = $this->normalizeQuantity($inputByLineId->get($line->id)['received_quantity']);
                if ($receivedQuantity > $line->ordered_quantity) {
                    throw ValidationException::withMessages([
                        'lines' => ['Received quantity cannot exceed ordered quantity.'],
                    ]);
                }

                $rejectedQuantity = 0.0;

                $variant = $this->findOrCreateDefaultVariant($line->item_id);

                $stockIncrease = max($this->normalizeQuantity($receivedQuantity - $line->received_quantity), 0);
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

            TransactionLog::record('procurement_order_received', [
                'id' => $order->id,
                'code' => $order->code,
                'status' => $order->status,
                'lines' => $validated['lines'],
            ]);
        });

        return response()->json([
            'message' => 'Stock receiving recorded successfully.',
            'data' => $this->findOrderWithRelations($order->id),
        ]);
    }

    public function addLine(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'SKU can only be added to draft procurement order.',
            ], 422);
        }

        $validated = $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => $this->decimalQuantityRules(),
        ]);

        $this->scopedItemsById(collect([(int) $validated['item_id']]), $scope);

        DB::transaction(function () use ($order, $validated) {
            $line = $order->lines()
                ->where('item_id', (int) $validated['item_id'])
                ->first();

            if ($line) {
                $addQty = $this->normalizeQuantity($validated['quantity']);
                $line->update([
                    'suggested_quantity' => $this->normalizeQuantity(($line->suggested_quantity ?? 0) + $addQty),
                    'ordered_quantity' => $this->normalizeQuantity(($line->ordered_quantity ?? 0) + $addQty),
                ]);

                return;
            }

            $order->lines()->create([
                'item_id' => (int) $validated['item_id'],
                'suggested_quantity' => $this->normalizeQuantity($validated['quantity']),
                'ordered_quantity' => $this->normalizeQuantity($validated['quantity']),
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
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);

        if ($order->status !== 'draft') {
            return response()->json([
                'message' => 'Package can only be added to draft procurement order.',
            ], 422);
        }

        $validated = $request->validate([
            'package_id' => 'required|integer|exists:packages,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $scopedPackages = $this->scopedPackagesById(collect([(int) $validated['package_id']]), $scope);

        DB::transaction(function () use ($order, $validated, $scope, $scopedPackages) {
            $packageId = (int) $validated['package_id'];
            $packageQuantity = (int) $validated['quantity'];

            $order->packageLines()->create([
                'package_id' => $packageId,
                'quantity' => $packageQuantity,
            ]);

            $scopeBom = $this->packageBomForScope($scopedPackages->get($packageId), $scope);
            if (! $scopeBom) {
                return;
            }

            foreach ($scopeBom->bomItems as $packageItem) {
                $itemId = (int) $packageItem->item_id;
                $totalQty = $this->normalizeQuantity($packageQuantity * $packageItem->quantity);

                $line = $order->lines()
                    ->where('item_id', $itemId)
                    ->first();

                if ($line) {
                    $line->update([
                        'suggested_quantity' => $this->normalizeQuantity(($line->suggested_quantity ?? 0) + $totalQty),
                        'ordered_quantity' => $this->normalizeQuantity(($line->ordered_quantity ?? 0) + $totalQty),
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
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);

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

        $orderData = DB::transaction(function () use ($request, $order, $scope) {
            $order->update(['status' => 'submitted']);

            $this->createReceivingNoteForScope($order, $scope, $request->user()->id);

            TransactionLog::record('procurement_order_submitted', [
                'id' => $order->id,
                'code' => $order->code,
            ]);

            return $this->findOrderWithRelations($order->id);
        });

        return response()->json([
            'message' => $this->submitSuccessMessage($scope, false),
            'data' => $orderData,
        ]);
    }

    public function destroy(Request $request, ProcurementOrder $order): JsonResponse
    {
        $this->authorizeModule($request, 'procurement');
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);

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

    public function pdf(Request $request, ProcurementOrder $order)
    {
        $scope = $this->resolveScope($request);
        $this->ensureOrderMatchesScope($order, $scope);
        $order->load(self::ORDER_RELATIONS);

        return Pdf::loadView('procurement.order-pdf', [
            'order' => $order,
            'printedAt' => now(),
        ])->download("{$order->code}.pdf");
    }

    public function rejectedList(Request $request): Response
    {
        $canView = $request->user()?->hasModuleAccess('rejected_list') ?? false;

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
                'mrn:id,mrn_number,status,created_at',
                'srn:id,srn_number,status,created_at',
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

                if ($rejection->mrn) {
                    return 'mrn:' . $rejection->mrn->id;
                }

                if ($rejection->srn) {
                    return 'srn:' . $rejection->srn->id;
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
                $mrn = $latest?->mrn;
                $srn = $latest?->srn;

                return [
                    'source' => $procurementOrder
                        ? 'Procurement Order'
                        : ($crn ? 'CRN' : ($mrn ? 'MRN' : ($srn ? 'SRN' : 'Receiving Note'))),
                    'id' => $procurementOrder?->id ?? $crn?->id ?? $mrn?->id ?? $srn?->id ?? $latest?->id,
                    'code' => $procurementOrder?->code ?? $crn?->crn_number ?? $mrn?->mrn_number ?? $srn?->srn_number ?? '-',
                    'status' => $procurementOrder?->status ?? $crn?->status ?? $mrn?->status ?? $srn?->status ?? '-',
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
            return [$this->normalizeQuantity($rejectable->ordered_quantity), $this->normalizeQuantity($rejectable->received_quantity)];
        }

        if ($rejectable instanceof CrnItem) {
            return [$this->normalizeQuantity($rejectable->expected_qty), $this->normalizeQuantity($rejectable->received_qty)];
        }

        return [0, 0];
    }

    private function resolveScope(Request $request): string
    {
        $scope = (string) $request->route('procurement_scope');

        abort_unless(array_key_exists($scope, self::PROCUREMENT_SCOPES), 404);

        return $scope;
    }

    private function scopeConfig(string $scope): array
    {
        return self::PROCUREMENT_SCOPES[$scope];
    }

    private function ensureOrderMatchesScope(ProcurementOrder $order, string $scope): void
    {
        $order->loadMissing('lines.item:id,bom_scope');

        if ($order->lines->isEmpty()) {
            return;
        }

        abort_unless($order->matchesBomScope($scope), 404);
    }

    private function scopedItemsById(Collection $itemIds, string $scope): Collection
    {
        $ids = $itemIds
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        $items = Item::query()
            ->whereIn('id', $ids)
            ->where('bom_scope', $scope)
            ->get(['id', 'bom_scope'])
            ->keyBy('id');

        if ($items->count() !== $ids->count()) {
            throw ValidationException::withMessages([
                'sku_lines' => ['Selected SKU does not belong to this procurement flow.'],
            ]);
        }

        return $items;
    }

    private function scopedPackagesById(Collection $packageIds, string $scope): Collection
    {
        $ids = $packageIds
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        $packages = Package::query()
            ->whereIn('id', $ids)
            ->with([
                'boms' => function ($query) use ($scope) {
                    $query->where('type', $scope)->with('bomItems');
                },
            ])
            ->get()
            ->keyBy('id');

        foreach ($ids as $packageId) {
            $scopeBom = $packages->get($packageId)?->boms->firstWhere('type', $scope);

            if (! $scopeBom || $scopeBom->bomItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'package_lines' => ['Selected package does not have lines for this procurement flow.'],
                ]);
            }
        }

        return $packages;
    }

    private function packageBomForScope(?Package $package, string $scope): ?Bom
    {
        if (! $package) {
            return null;
        }

        $package->loadMissing([
            'boms' => function ($query) use ($scope) {
                $query->where('type', $scope)->with('bomItems.item:id,sku,name,unit,bom_scope');
            },
        ]);

        return $package->boms->firstWhere('type', $scope);
    }

    private function generateCode(): string
    {
        $datePrefix = now()->format('Ymd');

        do {
            $code = 'PO-'.$datePrefix.'-'.Str::upper(Str::random(4));
        } while (ProcurementOrder::query()->where('code', $code)->exists());

        return $code;
    }

    private function createReceivingNoteForScope(ProcurementOrder $order, string $scope, int $userId): void
    {
        $order->loadMissing('lines');

        if ($order->lines->isEmpty()) {
            return;
        }

        if ($scope === Bom::TYPE_CABIN) {
            if ($order->crns()->exists()) {
                return;
            }

            $number = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            while (ContainerReceivingNote::where('crn_number', $number)->exists()) {
                $number = 'CRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            }

            $note = ContainerReceivingNote::create([
                'crn_number' => $number,
                'procurement_order_id' => $order->id,
                'status' => 'awaiting_shipping',
                'created_by' => $userId,
            ]);

            foreach ($order->lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line->item_id);

                CrnItem::create([
                    'crn_id' => $note->id,
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $line->ordered_quantity,
                    'received_qty' => 0,
                    'rejected_qty' => 0,
                ]);
            }

            TransactionLog::record('crn_created', [
                'id' => $note->id,
                'crn_number' => $note->crn_number,
                'items_count' => $order->lines->count(),
            ]);

            return;
        }

        if ($scope === Bom::TYPE_HARDWARE) {
            if ($order->mrns()->exists()) {
                return;
            }

            $number = 'MRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            while (MaterialReceivingNote::where('mrn_number', $number)->exists()) {
                $number = 'MRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            }

            $note = MaterialReceivingNote::create([
                'mrn_number' => $number,
                'procurement_order_id' => $order->id,
                'status' => 'arrived',
                'created_by' => $userId,
            ]);

            foreach ($order->lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line->item_id);

                MaterialReceivingNoteItem::create([
                    'mrn_id' => $note->id,
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $line->ordered_quantity,
                    'received_qty' => 0,
                    'rejected_qty' => 0,
                ]);
            }

            TransactionLog::record('mrn_created', [
                'id' => $note->id,
                'mrn_number' => $note->mrn_number,
                'items_count' => $order->lines->count(),
            ]);

            return;
        }

        if ($scope === Bom::TYPE_HARDWARE_SITE) {
            if ($order->srns()->exists()) {
                return;
            }

            $number = 'SRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            while (SiteReceivingNote::where('srn_number', $number)->exists()) {
                $number = 'SRN-' . now()->format('Ymd') . '-' . Str::upper(Str::random(4));
            }

            $note = SiteReceivingNote::create([
                'srn_number' => $number,
                'procurement_order_id' => $order->id,
                'status' => 'arrived',
                'created_by' => $userId,
            ]);

            foreach ($order->lines as $line) {
                $variant = $this->findOrCreateDefaultVariant($line->item_id);

                SiteReceivingNoteItem::create([
                    'srn_id' => $note->id,
                    'item_variant_id' => $variant->id,
                    'expected_qty' => $line->ordered_quantity,
                    'received_qty' => 0,
                    'rejected_qty' => 0,
                ]);
            }

            TransactionLog::record('srn_created', [
                'id' => $note->id,
                'srn_number' => $note->srn_number,
                'items_count' => $order->lines->count(),
            ]);
        }
    }

    private function submitSuccessMessage(string $scope, bool $created): string
    {
        return match ($scope) {
            Bom::TYPE_CABIN => $created
                ? 'Procurement order created and submitted to CRN.'
                : 'Procurement order submitted and CRN generated.',
            Bom::TYPE_HARDWARE => $created
                ? 'Procurement order created and submitted to MRN.'
                : 'Procurement order submitted and MRN generated.',
            Bom::TYPE_HARDWARE_SITE => $created
                ? 'Procurement order created and submitted to SRN.'
                : 'Procurement order submitted and SRN generated.',
            default => 'Procurement order submitted successfully.',
        };
    }

    private function authorizeModule(Request $request, string $module): void
    {
        abort_unless(
            $request->user()?->hasModuleAccess($module),
            403,
            'Unauthorized module.'
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
            if ($line->received_quantity <= 0 && $line->ordered_quantity > 0) {
                return 'submitted';
            }
            if ($line->received_quantity < $line->ordered_quantity) {
                $status = 'partial';
            }
        }

        return $status;
    }
}
