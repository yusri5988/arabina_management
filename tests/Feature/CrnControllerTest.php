<?php

namespace Tests\Feature;

use App\Http\Controllers\CrnController;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\ContenaReceivingNote;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $this->assertSame(200, $response->status(), $response->getContent());
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

    public function test_update_eta_requires_manage_role(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SALES]);

        $crn = ContenaReceivingNote::create([
            'crn_number' => 'CRN-TEST-ETA-1',
            'status' => 'awaiting_shipping',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson("/warehouse/crn/{$crn->id}/eta", [
                'eta' => '2099-12-31',
            ]);

        $response->assertForbidden();
    }

    public function test_update_eta_persists_eta_only_for_awaiting_shipping_crn(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $crn = ContenaReceivingNote::create([
            'crn_number' => 'CRN-TEST-ETA-2',
            'status' => 'awaiting_shipping',
            'created_by' => $user->id,
        ]);

        $eta = '2099-12-31';

        Auth::login($user);

        $request = Request::create("/warehouse/crn/{$crn->id}/eta", 'POST', [
            'eta' => $eta,
        ]);
        $request->setUserResolver(fn() => $user);

        $response = app(CrnController::class)->updateEta($request, $crn);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertDatabaseHas('contena_receiving_notes', [
            'id' => $crn->id,
            'status' => 'shipping',
            'eta' => $eta . ' 00:00:00',
        ]);
    }

    public function test_mark_as_arrived_rejects_invalid_status_transition(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $crn = ContenaReceivingNote::create([
            'crn_number' => 'CRN-TEST-ARRIVED-1',
            'status' => 'awaiting_shipping',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson("/warehouse/crn/{$crn->id}/arrived");

        $response->assertStatus(422);
        $this->assertDatabaseHas('contena_receiving_notes', [
            'id' => $crn->id,
            'status' => 'awaiting_shipping',
        ]);
    }

    public function test_receive_procurement_rejects_no_valid_lines(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => 'NO-REMAINING-ITEM',
            'name' => 'No Remaining Test Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $order = ProcurementOrder::create([
            'code' => 'PO-NO-REMAINING',
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        $line = ProcurementOrderLine::create([
            'procurement_order_id' => $order->id,
            'item_id' => $item->id,
            'ordered_quantity' => 10,
            'received_quantity' => 10,
            'rejected_quantity' => 0,
        ]);

        $response = $this->actingAs($user)
            ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
            ->postJson("/warehouse/crn/procurement/{$order->id}/receive", [
                'lines' => [
                    [
                        'line_id' => $line->id,
                        'received_qty' => 0,
                        'rejected_qty' => 0,
                        'rejection_reason' => null,
                    ],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'No valid lines to process. All lines are already fully received or rejected.',
        ]);
    }
}
