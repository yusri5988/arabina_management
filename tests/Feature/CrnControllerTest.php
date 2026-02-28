<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrnControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_route_renders_for_pending_procurement_orders(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => 'ITEM-100',
            'name' => 'Warehouse Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        ItemVariant::create([
            'item_id' => $item->id,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);

        $order = ProcurementOrder::create([
            'code' => 'PO-100',
            'status' => 'submitted',
            'created_by' => $user->id,
        ]);

        ProcurementOrderLine::create([
            'procurement_order_id' => $order->id,
            'item_id' => $item->id,
            'ordered_quantity' => 10,
            'received_quantity' => 2,
            'rejected_quantity' => 1,
        ]);

        $response = $this->actingAs($user)->get('/warehouse/crn/create');

        $response->assertOk();
        $response->assertSee('Warehouse\\/Crn\\/Create', false);
        $response->assertSee('PO-100');
    }

    public function test_store_rejects_totals_above_expected_quantity(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => 'ITEM-200',
            'name' => 'Draft Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $variant = ItemVariant::create([
            'item_id' => $item->id,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson('/warehouse/crn', [
                'received_at' => now()->toDateString(),
                'items' => [
                    [
                        'item_variant_id' => $variant->id,
                        'expected_qty' => 5,
                        'received_qty' => 4,
                        'rejected_qty' => 2,
                        'rejection_reason' => 'Damaged carton',
                    ],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items.0.received_qty']);
    }
}
