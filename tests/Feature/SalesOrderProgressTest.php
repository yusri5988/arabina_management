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
                'completion_action' => 'partial_done',
                'notes' => 'first shipment',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $line->id,
            'shipped_quantity' => 0,
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
                'completion_action' => 'done',
                'done_confirmed' => true,
                'notes' => 'second shipment',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $line->id,
            'shipped_quantity' => 0,
        ]);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'fulfilled',
        ]);
    }

    public function test_can_create_sales_order_with_loose_sku_lines(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::query()->create([
            'sku' => 'LOOSE-SKU-001',
            'name' => 'Loose Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->postJson('/orders', [
                'customer_name' => 'Loose Customer',
                'site_id' => 'SITE-001',
                'order_date' => now()->toDateString(),
                'notes' => 'Some notes',
                'lines' => [
                    [
                        'type' => 'loose',
                        'item_sku' => $item->sku,
                        'item_quantity' => 5,
                    ]
                ],
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('sales_orders', [
            'code' => 'SITE-001',
            'customer_name' => 'Loose Customer',
            'site_id' => 'SITE-001',
        ]);

        $this->assertDatabaseHas('sales_order_lines', [
            'item_sku' => 'LOOSE-SKU-001',
            'item_quantity' => 5,
            'package_id' => null,
        ]);
    }

    public function test_sales_user_can_update_open_sales_order(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SALES,
        ]);

        $oldItem = Item::query()->create([
            'sku' => 'OLD-SKU-001',
            'name' => 'Old Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $newItem = Item::query()->create([
            'sku' => 'NEW-SKU-001',
            'name' => 'New Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SITE-OLD-001',
            'customer_name' => 'Old Customer',
            'site_id' => 'SITE-OLD-001',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $oldLine = $order->lines()->create([
            'item_sku' => $oldItem->sku,
            'item_quantity' => 1,
            'shipped_quantity' => 0,
        ]);

        $response = $this->actingAs($user)
            ->putJson("/orders/{$order->id}", [
                'customer_name' => 'Updated Customer',
                'site_id' => 'SITE-NEW-001',
                'order_date' => now()->toDateString(),
                'notes' => 'Updated notes',
                'lines' => [
                    [
                        'type' => 'loose',
                        'item_sku' => $newItem->sku,
                        'item_quantity' => 4,
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Sales order updated successfully.');

        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'code' => 'SITE-NEW-001',
            'customer_name' => 'Updated Customer',
            'site_id' => 'SITE-NEW-001',
            'notes' => 'Updated notes',
        ]);

        $this->assertDatabaseMissing('sales_order_lines', [
            'id' => $oldLine->id,
        ]);

        $this->assertDatabaseHas('sales_order_lines', [
            'sales_order_id' => $order->id,
            'item_sku' => 'NEW-SKU-001',
            'item_quantity' => 4,
        ]);
    }

    public function test_sales_user_can_delete_open_sales_order(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SALES,
        ]);

        $item = Item::query()->create([
            'sku' => 'DELETE-SKU-001',
            'name' => 'Delete Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SITE-DELETE-001',
            'customer_name' => 'Delete Customer',
            'site_id' => 'SITE-DELETE-001',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $order->lines()->create([
            'item_sku' => $item->sku,
            'item_quantity' => 2,
            'shipped_quantity' => 0,
        ]);

        $response = $this->actingAs($user)->deleteJson("/orders/{$order->id}");

        $response->assertOk()
            ->assertJsonPath('message', 'Sales order deleted successfully.');

        $this->assertDatabaseMissing('sales_orders', [
            'id' => $order->id,
        ]);

        $this->assertDatabaseMissing('sales_order_lines', [
            'sales_order_id' => $order->id,
        ]);
    }

    public function test_create_sales_order_fails_without_site_id(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $response = $this->actingAs($user)
            ->postJson('/orders', [
                'customer_name' => 'No Site Customer',
                'order_date' => now()->toDateString(),
                'lines' => [
                    [
                        'type' => 'loose',
                        'item_sku' => 'ANY-SKU',
                        'item_quantity' => 1,
                    ]
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['site_id']);
    }

    public function test_create_sales_order_fails_when_site_id_already_exists(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::query()->create([
            'sku' => 'DUP-SITE-SKU-001',
            'name' => 'Duplicate Site Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        SalesOrder::query()->create([
            'code' => 'SITE-EXIST-001',
            'customer_name' => 'Existing Customer',
            'site_id' => 'SITE-EXIST-001',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->postJson('/orders', [
                'customer_name' => 'Duplicate Site Customer',
                'site_id' => 'SITE-EXIST-001',
                'order_date' => now()->toDateString(),
                'notes' => 'Duplicate site id',
                'lines' => [
                    [
                        'type' => 'loose',
                        'item_sku' => $item->sku,
                        'item_quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['site_id']);

        $this->assertContains(
            'Site ID already registered in another Sales Order.',
            $response->json('errors.site_id', [])
        );
    }

    public function test_mixed_sales_order_is_fulfilled_after_alacarte_stock_out(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
        ]);

        $packageItem = Item::query()->create([
            'sku' => 'PKG-SKU-001',
            'name' => 'Package Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $looseItem = Item::query()->create([
            'sku' => 'LOOSE-SKU-002',
            'name' => 'Loose Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        ItemVariant::query()->create([
            'item_id' => $packageItem->id,
            'color' => null,
            'stock_initial' => 2,
            'stock_current' => 2,
        ]);

        ItemVariant::query()->create([
            'item_id' => $looseItem->id,
            'color' => null,
            'stock_initial' => 3,
            'stock_current' => 3,
        ]);

        $package = Package::query()->create([
            'code' => 'PKG-MIX-01',
            'name' => 'Mixed Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $package->packageItems()->create([
            'item_id' => $packageItem->id,
            'quantity' => 1,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SO-MIXED-0001',
            'customer_name' => 'Customer Mixed',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $packageLine = $order->lines()->create([
            'package_id' => $package->id,
            'package_quantity' => 2,
            'shipped_quantity' => 0,
        ]);

        $looseLine = $order->lines()->create([
            'item_sku' => $looseItem->sku,
            'item_quantity' => 3,
            'shipped_quantity' => 0,
        ]);

        $this->actingAs($user)
            ->postJson('/items/stock/out', [
                'mode' => 'alacarte',
                'sales_order_id' => $order->id,
                'completion_action' => 'done',
                'done_confirmed' => true,
                'lines' => [
                    [
                        'item_id' => $packageItem->id,
                        'quantity' => 2,
                    ],
                    [
                        'item_id' => $looseItem->id,
                        'quantity' => 3,
                    ],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $packageLine->id,
            'shipped_quantity' => 0,
        ]);

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $looseLine->id,
            'shipped_quantity' => 3,
        ]);

        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'fulfilled',
        ]);
    }

    public function test_partial_done_keeps_sales_order_partial_even_if_do_differs_from_order_lines(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
        ]);

        $orderedItem = Item::query()->create([
            'sku' => 'SO-ITEM-001',
            'name' => 'Ordered Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $differentDoItem = Item::query()->create([
            'sku' => 'DO-ITEM-999',
            'name' => 'Different DO Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        ItemVariant::query()->create([
            'item_id' => $orderedItem->id,
            'color' => null,
            'stock_initial' => 10,
            'stock_current' => 10,
        ]);

        ItemVariant::query()->create([
            'item_id' => $differentDoItem->id,
            'color' => null,
            'stock_initial' => 10,
            'stock_current' => 10,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SO-DIFF-0001',
            'customer_name' => 'Customer Diff',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        $line = $order->lines()->create([
            'item_sku' => $orderedItem->sku,
            'item_quantity' => 5,
            'shipped_quantity' => 0,
        ]);

        $this->actingAs($user)
            ->postJson('/items/stock/out', [
                'mode' => 'alacarte',
                'sales_order_id' => $order->id,
                'completion_action' => 'partial_done',
                'lines' => [
                    [
                        'item_id' => $differentDoItem->id,
                        'quantity' => 2,
                    ],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'partial',
        ]);

        $this->assertDatabaseHas('sales_order_lines', [
            'id' => $line->id,
            'shipped_quantity' => 0,
        ]);
    }

    public function test_can_download_sales_order_pdf(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::query()->create([
            'sku' => 'PDF-SKU-001',
            'name' => 'PDF Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $order = SalesOrder::query()->create([
            'code' => 'SO-PDF-0001',
            'customer_name' => 'PDF Customer',
            'site_id' => 'SITE-PDF-01',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
            'notes' => 'PDF notes',
        ]);

        $order->lines()->create([
            'item_sku' => $item->sku,
            'item_quantity' => 3,
            'shipped_quantity' => 0,
        ]);

        $response = $this->actingAs($user)->get('/orders/' . $order->id . '/pdf');

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString('.pdf', (string) $response->headers->get('content-disposition'));
    }

    public function test_orders_index_returns_packages_sorted_alphabetically_by_name(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        Package::query()->create([
            'code' => 'PKG-Z',
            'name' => 'Zulu Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        Package::query()->create([
            'code' => 'PKG-A',
            'name' => 'Alpha Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        Package::query()->create([
            'code' => 'PKG-M',
            'name' => 'Mega Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/orders');
        $response->assertOk();

        $page = $response->viewData('page');
        $this->assertIsArray($page);

        $props = $page['props'] ?? [];
        $packages = $props['packages'] ?? [];
        $this->assertIsArray($packages);
        $this->assertCount(3, $packages);

        $names = array_map(fn ($pkg) => $pkg['name'] ?? null, $packages);
        $this->assertSame([
            'Alpha Package',
            'Mega Package',
            'Zulu Package',
        ], $names);
    }
}
