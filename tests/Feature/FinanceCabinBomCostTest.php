<?php

namespace Tests\Feature;

use App\Models\Bom;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceCabinBomCostTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::create([
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'module_permissions' => ['finance_stock_value'],
        ]);
    }

    public function test_can_view_cabin_bom_cost_page()
    {
        Item::create([
            'sku' => 'CABIN-001',
            'name' => 'Cabin Component 1',
            'bom_scope' => Bom::TYPE_CABIN,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->get(route('finance.cabin-bom-cost'));

        $response->assertStatus(200);
    }

    public function test_can_update_cabin_bom_costs()
    {
        $item1 = Item::create([
            'sku' => 'CABIN-001',
            'name' => 'Cabin Component 1',
            'bom_scope' => Bom::TYPE_CABIN,
            'cost_cny' => 0,
            'created_by' => $this->user->id,
        ]);

        $item2 = Item::create([
            'sku' => 'CABIN-002',
            'name' => 'Cabin Component 2',
            'bom_scope' => Bom::TYPE_CABIN,
            'cost_cny' => 0,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->post(route('finance.cabin-bom-cost.update'), [
            'items' => [
                ['id' => $item1->id, 'cost_cny' => '12.50'],
                ['id' => $item2->id, 'cost_cny' => '100.00'],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('items', [
            'id' => $item1->id,
            'cost_cny' => '12.50',
        ]);

        $this->assertDatabaseHas('items', [
            'id' => $item2->id,
            'cost_cny' => '100.00',
        ]);
    }

    public function test_cannot_update_non_cabin_items()
    {
        $itemHardware = Item::create([
            'sku' => 'HARDWARE-001',
            'name' => 'Hardware Component 1',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'cost_cny' => 0,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->post(route('finance.cabin-bom-cost.update'), [
            'items' => [
                ['id' => $itemHardware->id, 'cost_cny' => '50.00'],
            ],
        ]);

        // It should silently ignore the non-cabin item
        $response->assertRedirect();

        $this->assertDatabaseHas('items', [
            'id' => $itemHardware->id,
            'cost_cny' => 0,
        ]);
    }
}
