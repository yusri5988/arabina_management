<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesOrderProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_order_status_updates_from_stock_out_package_flow(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
        ]);

        $item = Item::query()->create([
            'sku' => 'SKU-TEST-001',
            'name' => 'Test Item',
            'length_m' => null,
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        ItemVariant::query()->create([
            'item_id' => $item->id,
            'color' => null,
            'stock_initial' => 10,
            'stock_current' => 10,
        ]);

        $package = Package::query()->create([
            'code' => 'PKG-TEST-01',
            'name' => 'Test Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $package->packageItems()->create([
            'item_id' => $item->id,
            'quantity' => 1,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SO-TEST-0001',
            'customer_name' => 'Customer A',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $line = $order->lines()->create([
            'package_id' => $package->id,
            'package_quantity' => 2,
            'shipped_quantity' => 0,
        ]);

        $this->actingAs($user)
            ->postJson('/items/stock/out', [
                'mode' => 'package',
                'package_id' => $package->id,
                'package_quantity' => 1,
                'sales_order_id' => $order->id,
                'notes' => 'first shipment',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $line->id,
            'shipped_quantity' => 1,
        ]);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'partial',
        ]);

        $this->actingAs($user)
            ->postJson('/items/stock/out', [
                'mode' => 'package',
                'package_id' => $package->id,
                'package_quantity' => 1,
                'sales_order_id' => $order->id,
                'notes' => 'second shipment',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $line->id,
            'shipped_quantity' => 2,
        ]);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'fulfilled',
        ]);
    }
}
