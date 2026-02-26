<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\SalesOrder;
use App\Models\InventoryTransaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SalesOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $databaseReady = Schema::hasTable('sales_orders')
            && Schema::hasTable('sales_order_lines')
            && Schema::hasTable('packages');

        $packages = collect();
        $orders = collect();

        if ($databaseReady) {
            $packages = Package::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name']);

            $orders = SalesOrder::query()
                ->with(['lines.package:id,code,name'])
                ->latest()
                ->limit(30)
                ->get(['id', 'code', 'customer_name', 'order_date', 'status', 'notes', 'created_at']);
        }

        return Inertia::render('Sales/Orders', [
            'databaseReady' => $databaseReady,
            'canCreate' => in_array($request->user()->role, [User::ROLE_SALES, User::ROLE_SUPER_ADMIN], true),
            'packages' => $packages,
            'orders' => $orders,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role, [User::ROLE_SALES, User::ROLE_SUPER_ADMIN], true),
            403,
            'Unauthorized role.'
        );

        if (! Schema::hasTable('sales_orders') || ! Schema::hasTable('sales_order_lines') || ! Schema::hasTable('packages')) {
            return response()->json([
                'message' => 'Sales order table is not ready. Please run php artisan migrate.',
            ], 409);
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'order_date' => 'required|date',
            'lines' => 'required|array|min:1',
            'lines.*.package_id' => 'required|integer|exists:packages,id|distinct',
            'lines.*.package_quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        $order = DB::transaction(function () use ($request, $validated) {
            $order = SalesOrder::create([
                'code' => $this->generateCode(),
                'customer_name' => $validated['customer_name'],
                'order_date' => $validated['order_date'],
                'status' => 'open',
                'created_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['lines'] as $line) {
                $order->lines()->create([
                    'package_id' => (int) $line['package_id'],
                    'package_quantity' => (int) $line['package_quantity'],
                ]);
            }

            return $order;
        });

        return response()->json([
            'message' => 'Sales order submitted successfully.',
            'data' => SalesOrder::query()
                ->with(['lines.package:id,code,name'])
                ->find($order->id),
        ], 201);
    }

    public function history(): Response
    {
        $orders = SalesOrder::query()
            ->with(['lines.package:id,code,name'])
            ->where('status', 'fulfilled')
            ->latest('id')
            ->limit(50)
            ->get(['id', 'code', 'customer_name', 'order_date', 'status', 'notes', 'created_at'])
            ->map(function ($order) {
                $lastDeliveryAt = InventoryTransaction::query()
                    ->where('type', 'out')
                    ->where('sales_order_id', $order->id)
                    ->latest('id')
                    ->value('created_at');

                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'customer_name' => $order->customer_name,
                    'order_date' => optional($order->order_date)->toDateString(),
                    'status' => $order->status,
                    'notes' => $order->notes,
                    'created_at' => optional($order->created_at)->toDateTimeString(),
                    'last_delivery_at' => $lastDeliveryAt,
                    'lines' => $order->lines,
                ];
            })
            ->values();

        return Inertia::render('Sales/History', [
            'orders' => $orders,
        ]);
    }

    private function generateCode(): string
    {
        $datePrefix = now()->format('Ymd');

        do {
            $code = 'SO-'.$datePrefix.'-'.Str::upper(Str::random(4));
        } while (SalesOrder::query()->where('code', $code)->exists());

        return $code;
    }
}
