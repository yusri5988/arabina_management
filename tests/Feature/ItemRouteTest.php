<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_items_route_renders_for_user_with_item_catalog_module(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['item_catalog'],
        ]);

        Item::create([
            'sku' => 'ITEM-ROUTE-001',
            'name' => 'Route Test Item',
            'length_m' => 0,
            'unit' => 'pcs',
            'bom_scope' => 'hardware',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/items');

        $response->assertOk();
        $response->assertSee('Inventory\\/Index', false);
        $response->assertSee('ITEM-ROUTE-001');
    }

    public function test_items_route_forbids_user_without_item_catalog_module(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['stock_list'],
        ]);

        $response = $this->actingAs($user)->get('/items');

        $response->assertForbidden();
    }

    public function test_items_route_renders_full_catalog_without_pagination(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['item_catalog'],
        ]);

        Item::create([
            'sku' => 'FULL-001',
            'name' => 'First Full Item',
            'unit' => 'pcs',
            'bom_scope' => 'hardware',
            'created_by' => $user->id,
        ]);

        Item::create([
            'sku' => 'FULL-002',
            'name' => 'Second Full Item',
            'unit' => 'pcs',
            'bom_scope' => 'hardware_site',
            'created_by' => $user->id,
        ]);

        foreach (range(3, 31) as $index) {
            Item::create([
                'sku' => sprintf('FULL-%03d', $index),
                'name' => 'Full Item ' . $index,
                'unit' => 'pcs',
                'bom_scope' => 'hardware',
                'created_by' => $user->id,
            ]);
        }

        $response = $this->actingAs($user)->get('/items');

        $response->assertOk();
        $response->assertSee('FULL-001');
        $response->assertSee('FULL-002');
        $response->assertSee('FULL-031');
    }

    public function test_items_route_renders_multiple_bom_categories(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['item_catalog'],
        ]);

        Item::create([
            'sku' => 'CABIN-001',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => 'cabin',
            'created_by' => $user->id,
        ]);

        Item::create([
            'sku' => 'SITE-001',
            'name' => 'Hardware Site Item',
            'unit' => 'pcs',
            'bom_scope' => 'hardware_site',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/items');

        $response->assertOk();
        $response->assertSee('CABIN-001');
        $response->assertSee('SITE-001');
    }
}
