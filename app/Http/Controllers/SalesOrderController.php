<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalesOrderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Sales/Orders', [
            'packages' => Package::query()->get(),
            'items' => \App\Models\Item::query()->select(['id', 'sku', 'name'])->orderBy('sku')->get(),
            'orders' => SalesOrder::with(['lines.package', 'lines.item'])->latest()->limit(10)->get(),
            'canCreate' => auth()->user()->hasRole('sales', 'super_admin'),
        ]);
    }

    public function history(): Response
    {
        return Inertia::render('Sales/History', [
            'orders' => SalesOrder::with(['lines.package', 'lines.item'])->latest()->paginate(20),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'order_date' => 'required|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.type' => 'required|in:package,loose',
            'lines.*.package_id' => 'required_if:lines.*.type,package|nullable|exists:packages,id',
            'lines.*.package_quantity' => 'required_if:lines.*.type,package|nullable|integer|min:1',
            'lines.*.item_sku' => 'required_if:lines.*.type,loose|nullable|string|exists:items,sku',
            'lines.*.item_quantity' => 'required_if:lines.*.type,loose|nullable|integer|min:1',
        ]);

        $order = DB::transaction(function () use ($validated) {
            $order = SalesOrder::create([
                'code' => 'SO-' . strtoupper(uniqid()),
                'customer_name' => $validated['customer_name'],
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

            return $order->load('lines.package', 'lines.item');
        });

        return response()->json([
            'message' => 'Sales order created successfully.',
            'data' => $order,
        ]);
    }

    public function searchItem(Request $request): JsonResponse
    {
        $query = $request->get('q');
        if (!$query) {
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
