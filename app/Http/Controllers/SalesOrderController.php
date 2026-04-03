<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Package;
use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use App\Models\TransactionLog;
use App\Services\ProcurementService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SalesOrderController extends Controller
{
    public function index(ProcurementService $procurementService): Response
    {
        $packages = Package::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $stockByPackage = $procurementService->calculatePackageAvailability(Bom::TYPE_CABIN);

        $procuredByPackage = DB::table('procurement_order_package_lines as popl')
            ->join('procurement_orders as po', 'po.id', '=', 'popl.procurement_order_id')
            ->where('po.status', '!=', 'draft')
            ->where('po.procurement_scope', Bom::TYPE_CABIN)
            ->selectRaw('popl.package_id, SUM(popl.quantity) as qty')
            ->groupBy('popl.package_id')
            ->pluck('qty', 'popl.package_id');

        $usedByPackage = DB::table('sales_order_lines')
            ->whereNotNull('package_id')
            ->selectRaw('package_id, SUM(package_quantity) as qty')
            ->groupBy('package_id')
            ->pluck('qty', 'package_id');

        $availability = $packages->map(function ($package) use ($stockByPackage, $procuredByPackage, $usedByPackage) {
            $stock = (int) ($stockByPackage[$package->id] ?? 0);
            $procured = (int) ($procuredByPackage[$package->id] ?? 0);
            $used = (int) ($usedByPackage[$package->id] ?? 0);

            $package->available_qty = $stock + $procured - $used;

            return $package;
        });

        return Inertia::render('Sales/Orders', [
            'packages' => Package::query()->orderBy('name')->get(),
            'items' => \App\Models\Item::query()->select(['id', 'sku', 'name'])->orderBy('sku')->get(),
            'orders' => SalesOrder::with(['lines.package', 'lines.item', 'creator'])->latest()->limit(10)->get(),
            'availability' => $availability,
            'canCreate' => auth()->user()?->hasModuleAccess('sales_orders') ?? false,
        ]);
    }

    public function history(): Response
    {
        return Inertia::render('Sales/History', [
            'orders' => SalesOrder::with(['lines.package', 'lines.item', 'creator'])->latest()->paginate(20),
        ]);
    }

    public function pdf(SalesOrder $order)
    {
        $order->load(['lines.package.boms.bomItems.item', 'lines.item', 'creator:id,name']);

        $fileName = ($order->code ?: ('sales-order-'.$order->id)).'.pdf';

        return Pdf::loadView('sales.order-pdf', [
            'order' => $order,
            'generatedAt' => now(),
        ])->download($fileName);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'site_id' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sales_orders', 'site_id'),
            ],
            'order_date' => 'required|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.type' => 'required|in:package,loose',
            'lines.*.package_id' => 'required_if:lines.*.type,package|nullable|exists:packages,id',
            'lines.*.package_quantity' => 'required_if:lines.*.type,package|nullable|integer|min:1',
            'lines.*.item_sku' => 'required_if:lines.*.type,loose|nullable|string|exists:items,sku',
            'lines.*.item_quantity' => 'required_if:lines.*.type,loose|nullable|integer|min:1',
        ], [
            'site_id.unique' => 'Site ID already registered in another Sales Order.',
        ]);

        $order = DB::transaction(function () use ($validated) {
            $order = SalesOrder::create([
                'code' => $validated['site_id'],
                'customer_name' => $validated['customer_name'],
                'site_id' => $validated['site_id'] ?? null,
                'order_date' => $validated['order_date'],
                'notes' => $validated['notes'],
                'status' => 'open',
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                SalesOrderLine::create([
                    'sales_order_id' => $order->id,
                    'package_id' => $line['type'] === 'package' ? $line['package_id'] : null,
                    'package_quantity' => $line['type'] === 'package' ? $line['package_quantity'] : null,
                    'item_sku' => $line['type'] === 'loose' ? $line['item_sku'] : null,
                    'item_quantity' => $line['type'] === 'loose' ? $line['item_quantity'] : null,
                ]);
            }

            return $order->load('lines.package', 'lines.item', 'creator');
        });

        TransactionLog::record('sales_order_created', [
            'id' => $order->id,
            'code' => $order->code,
            'customer_name' => $order->customer_name,
            'lines_count' => count($validated['lines']),
        ]);

        return response()->json([
            'message' => 'Sales order created successfully.',
            'data' => $order,
        ]);
    }

    public function searchItem(Request $request): JsonResponse
    {
        $query = $request->input('q');
        if (! $query) {
            return response()->json([]);
        }

        $items = \App\Models\Item::query()
            ->where('sku', 'like', "%{$query}%")
            ->orWhere('name', 'like', "%{$query}%")
            ->limit(10)
            ->get(['sku', 'name']);

        return response()->json($items);
    }
}
