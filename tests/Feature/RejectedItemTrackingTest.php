<?php

namespace Tests\Feature;

use App\Models\ContenaReceivingNote;
use App\Models\CrnItem;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RejectedItemTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_standalone_crn_store_creates_rejected_item_record(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => 'RJ-100',
            'name' => 'Rejected SKU',
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
                'remarks' => 'Standalone CRN rejection',
                'items' => [
                    [
                        'item_variant_id' => $variant->id,
                        'expected_qty' => 10,
                        'received_qty' => 7,
                        'rejected_qty' => 3,
                        'rejection_reason' => 'Damaged carton',
                    ],
                ],
            ]);

        $response->assertCreated();

        $crnId = (int) $response->json('data.id');
        $crnItemId = (int) $response->json('data.items.0.id');
        $crnNumber = (string) $response->json('data.crn_number');

        $this->assertDatabaseHas('rejected_items', [
            'rejectable_type' => CrnItem::class,
            'rejectable_id' => $crnItemId,
            'procurement_order_id' => null,
            'crn_id' => $crnId,
            'item_id' => $item->id,
            'item_variant_id' => $variant->id,
            'quantity' => 3,
            'reason' => 'Damaged carton',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->get('/rejections')
            ->assertOk()
            ->assertSee($crnNumber);
    }

    public function test_linked_crn_transfer_creates_rejected_item_record(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => 'RJ-200',
            'name' => 'Linked Rejection SKU',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $variant = ItemVariant::create([
            'item_id' => $item->id,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);

        $order = ProcurementOrder::create([
            'code' => 'PO-RJ-200',
            'status' => 'submitted',
            'created_by' => $user->id,
        ]);

        ProcurementOrderLine::create([
            'procurement_order_id' => $order->id,
            'item_id' => $item->id,
            'ordered_quantity' => 10,
            'received_quantity' => 0,
            'rejected_quantity' => 0,
        ]);

        $crn = ContenaReceivingNote::create([
            'crn_number' => 'CRN-RJ-200',
            'procurement_order_id' => $order->id,
            'received_at' => now(),
            'created_by' => $user->id,
            'status' => 'draft',
        ]);

        $crnItem = $crn->items()->create([
            'item_variant_id' => $variant->id,
            'expected_qty' => 10,
            'received_qty' => 8,
            'rejected_qty' => 2,
            'rejection_reason' => 'Wet packaging',
        ]);

        $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson("/warehouse/crn/{$crn->id}/transfer")
            ->assertOk();

        $this->assertDatabaseHas('rejected_items', [
            'rejectable_type' => CrnItem::class,
            'rejectable_id' => $crnItem->id,
            'procurement_order_id' => $order->id,
            'crn_id' => $crn->id,
            'item_id' => $item->id,
            'item_variant_id' => $variant->id,
            'quantity' => 2,
            'reason' => 'Wet packaging',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->get('/rejections')
            ->assertOk()
            ->assertSee('PO-RJ-200');
    }
}
