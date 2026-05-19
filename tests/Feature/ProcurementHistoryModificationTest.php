<?php

namespace Tests\Feature;

use App\Http\Controllers\ProcurementController;
use App\Models\ContainerReceivingNote;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\MaterialReceivingNote;
use App\Models\ProcurementOrder;
use App\Models\ProcurementOrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Tests\TestCase;

class ProcurementHistoryModificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_edit_syncs_awaiting_crn_before_eta(): void
    {
        [$user, $order, $item, $variant] = $this->createProcurementOrderWithLine('cabin');

        $crn = ContainerReceivingNote::create([
            'crn_number' => 'CRN-TEST-SYNC-1',
            'procurement_order_id' => $order->id,
            'status' => 'awaiting_shipping',
            'created_by' => $user->id,
        ]);

        $crn->items()->create([
            'item_variant_id' => $variant->id,
            'expected_qty' => 10,
            'received_qty' => 0,
            'rejected_qty' => 0,
        ]);

        $request = $this->scopedRequest('PUT', 'cabin', "/procurement/cabin/orders/{$order->id}", [
            'sku_lines' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 12,
                    'unit' => 'pcs',
                ],
            ],
            'notes' => 'Updated note',
        ], $user, $order);

        $response = app(ProcurementController::class)->update($request, $order);

        $this->assertSame(200, $response->getStatusCode());

        $this->assertDatabaseHas('procurement_order_lines', [
            'procurement_order_id' => $order->id,
            'item_id' => $item->id,
            'ordered_quantity' => 12,
        ]);

        $this->assertDatabaseHas('container_receiving_notes', [
            'id' => $crn->id,
            'status' => 'awaiting_shipping',
        ]);

        $this->assertDatabaseHas('crn_items', [
            'crn_id' => $crn->id,
            'item_variant_id' => $variant->id,
            'expected_qty' => 12,
            'received_qty' => 0,
            'rejected_qty' => 0,
        ]);
    }

    public function test_delete_removes_pending_crn_before_eta(): void
    {
        [$user, $order, $item, $variant] = $this->createProcurementOrderWithLine('cabin');

        $crn = ContainerReceivingNote::create([
            'crn_number' => 'CRN-TEST-DELETE-1',
            'procurement_order_id' => $order->id,
            'status' => 'awaiting_shipping',
            'created_by' => $user->id,
        ]);

        $crn->items()->create([
            'item_variant_id' => $variant->id,
            'expected_qty' => 10,
            'received_qty' => 0,
            'rejected_qty' => 0,
        ]);

        $request = $this->scopedRequest('DELETE', 'cabin', "/procurement/cabin/orders/{$order->id}", [], $user, $order);

        $response = app(ProcurementController::class)->destroy($request, $order);

        $this->assertSame(200, $response->getStatusCode());

        $this->assertDatabaseMissing('procurement_orders', [
            'id' => $order->id,
        ]);

        $this->assertDatabaseMissing('container_receiving_notes', [
            'id' => $crn->id,
        ]);

        $this->assertDatabaseMissing('crn_items', [
            'crn_id' => $crn->id,
        ]);
    }

    public function test_edit_is_blocked_after_crn_eta_is_set(): void
    {
        [$user, $order, $item] = $this->createProcurementOrderWithLine('cabin');

        ContainerReceivingNote::create([
            'crn_number' => 'CRN-TEST-BLOCK-1',
            'procurement_order_id' => $order->id,
            'status' => 'shipping',
            'eta' => '2099-12-31',
            'created_by' => $user->id,
        ]);

        $request = $this->scopedRequest('PUT', 'cabin', "/procurement/cabin/orders/{$order->id}", [
            'sku_lines' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 8,
                    'unit' => 'pcs',
                ],
            ],
        ], $user, $order);

        $response = app(ProcurementController::class)->update($request, $order);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('This procurement order is locked after ETA was set for CRN.', json_decode($response->getContent(), true)['message'] ?? null);
    }

    public function test_edit_syncs_arrived_mrn_before_transfer(): void
    {
        [$user, $order, $item, $variant] = $this->createProcurementOrderWithLine('hardware');

        $mrn = MaterialReceivingNote::create([
            'mrn_number' => 'MRN-TEST-SYNC-1',
            'procurement_order_id' => $order->id,
            'status' => 'arrived',
            'created_by' => $user->id,
        ]);

        $mrn->items()->create([
            'item_variant_id' => $variant->id,
            'expected_qty' => 10,
            'received_qty' => 0,
            'rejected_qty' => 0,
        ]);

        $request = $this->scopedRequest('PUT', 'hardware', "/procurement/hardware/orders/{$order->id}", [
            'sku_lines' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 14,
                    'unit' => 'pcs',
                ],
            ],
        ], $user, $order);

        $response = app(ProcurementController::class)->update($request, $order);

        $this->assertSame(200, $response->getStatusCode());

        $this->assertDatabaseHas('material_receiving_notes', [
            'id' => $mrn->id,
            'status' => 'arrived',
        ]);

        $this->assertDatabaseHas('material_receiving_note_items', [
            'mrn_id' => $mrn->id,
            'item_variant_id' => $variant->id,
            'expected_qty' => 14,
            'received_qty' => 0,
            'rejected_qty' => 0,
        ]);
    }

    private function scopedRequest(string $method, string $scope, string $uri, array $payload, User $user, ProcurementOrder $order): Request
    {
        $request = Request::create($uri, $method, $payload);
        $request->setUserResolver(fn () => $user);

        $route = new Route([$method], '/procurement/{procurement_scope}/orders/{order}', []);
        $route->bind($request);
        $route->setParameter('procurement_scope', $scope);
        $route->setParameter('order', $order);

        $request->setRouteResolver(fn () => $route);

        return $request;
    }

    private function createProcurementOrderWithLine(string $scope): array
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

        $item = Item::create([
            'sku' => strtoupper($scope) . '-ITEM-1',
            'name' => 'Test Item ' . $scope,
            'unit' => 'pcs',
            'bom_scope' => $scope,
            'created_by' => $user->id,
        ]);

        $variant = ItemVariant::create([
            'item_id' => $item->id,
            'stock_initial' => 0,
            'stock_current' => 0,
        ]);

        $order = ProcurementOrder::create([
            'code' => 'PO-' . strtoupper($scope) . '-' . now()->format('Hisv'),
            'status' => 'submitted',
            'procurement_scope' => $scope,
            'created_by' => $user->id,
        ]);

        ProcurementOrderLine::create([
            'procurement_order_id' => $order->id,
            'item_id' => $item->id,
            'suggested_quantity' => 10,
            'ordered_quantity' => 10,
            'received_quantity' => 0,
            'rejected_quantity' => 0,
        ]);

        return [$user, $order, $item, $variant];
    }
}
