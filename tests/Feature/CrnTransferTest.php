<?php

namespace Tests\Feature;

use App\Models\ContenaReceivingNote;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrnTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_crn_transfer_increases_stock_and_updates_po_lines()
    {
        $this->withoutMiddleware();
        $this->withMiddleware([\Illuminate\Routing\Middleware\SubstituteBindings::class]);
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $item = Item::create([
            'sku' => 'TEST-SKU',
            'name' => 'Test Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);
        $variant = ItemVariant::create([
            'item_id' => $item->id,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);

        $po = ProcurementOrder::create([
            'code' => 'PO-TEST',
            'status' => 'draft',
            'created_by' => $user->id,
        ]);
        $poLine = ProcurementOrderLine::create([
            'procurement_order_id' => $po->id,
            'item_id' => $item->id,
            'ordered_quantity' => 10,
            'received_quantity' => 0,
            'rejected_quantity' => 0,
        ]);

        $crn = ContenaReceivingNote::create([
            'crn_number' => 'CRN-TEST',
            'procurement_order_id' => $po->id,
            'received_at' => now(),
            'created_by' => $user->id,
            'status' => 'draft',
        ]);

        $crn->items()->create([
            'item_variant_id' => $variant->id,
            'expected_qty' => 10,
            'received_qty' => 8,
            'rejected_qty' => 2,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson("/warehouse/crn/{$crn->id}/transfer");

        $response->assertStatus(200);

        // Verify stock
        $variant->refresh();
        $this->assertEquals(8, $variant->stock_initial);
        $this->assertEquals(8, $variant->stock_current);

        // Verify PO Line
        $poLine->refresh();
        $this->assertEquals(8, $poLine->received_quantity);
        $this->assertEquals(2, $poLine->rejected_quantity);

        // Verify CRN Status
        $crn->refresh();
        $this->assertEquals('transferred', $crn->status);

        // Verify PO Status
        $po->refresh();
        $this->assertEquals('received', $po->status); // 8 received + 2 rejected = 10 (fully processed)
    }
}
