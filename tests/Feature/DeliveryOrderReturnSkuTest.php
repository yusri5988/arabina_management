<?php

namespace Tests\Feature;

use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DeliveryOrderReturnSkuTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_return_single_sku_from_delivery_order_and_increment_stock(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA, $itemB] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
            ['item_id' => $itemB->id, 'quantity' => 3],
        ]);

        $response = $this->actingAs($user)->postJson("/items/stock/out/do/{$deliveryOrder->id}/return-sku", [
            'item_id' => $itemA->id,
            'quantity' => 2,
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Delivery order SKU returned and stock updated successfully.');

        $this->assertSame(
            8,
            (int) ItemVariant::query()->where('item_id', $itemA->id)->value('stock_current')
        );

        $returnedId = (int) $response->json('data.id');
        $this->assertDatabaseHas('inventory_transaction_lines', [
            'inventory_transaction_id' => $returnedId,
            'item_id' => $itemA->id,
            'quantity' => 2,
        ]);

        $doCode = 'DO-' . str_pad((string) $deliveryOrder->id, 6, '0', STR_PAD_LEFT);
        $notes = (string) DB::table('inventory_transactions')->where('id', $returnedId)->value('notes');
        $this->assertStringContainsString('[DO-RETURN:' . $doCode . ']', $notes);
    }

    public function test_cannot_return_more_than_remaining_qty_for_sku(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
        ]);

        $response = $this->actingAs($user)->postJson("/items/stock/out/do/{$deliveryOrder->id}/return-sku", [
            'item_id' => $itemA->id,
            'quantity' => 5,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }

    public function test_cannot_return_sku_not_in_delivery_order(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA, $itemB] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
        ]);

        $response = $this->actingAs($user)->postJson("/items/stock/out/do/{$deliveryOrder->id}/return-sku", [
            'item_id' => $itemB->id,
            'quantity' => 1,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_id']);
    }

    public function test_legacy_full_return_route_still_works(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA, $itemB] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
            ['item_id' => $itemB->id, 'quantity' => 3],
        ]);

        $response = $this->actingAs($user)->postJson("/items/stock/out/do/{$deliveryOrder->id}/return", []);

        $response->assertOk()
            ->assertJsonPath('message', 'Delivery order returned and stock updated successfully.');

        $this->assertSame(
            10,
            (int) ItemVariant::query()->where('item_id', $itemA->id)->value('stock_current')
        );
        $this->assertSame(
            8,
            (int) ItemVariant::query()->where('item_id', $itemB->id)->value('stock_current')
        );
    }

    public function test_return_do_form_route_renders(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
        ]);

        $this->actingAs($user)
            ->get("/items/stock/out/do/{$deliveryOrder->id}/return")
            ->assertOk();
    }

    public function test_can_submit_return_items_list_and_increment_multiple_sku_stock(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        [$itemA, $itemB] = $this->seedItemsWithStock($user, 10, 8);

        $deliveryOrder = $this->createDeliveryOrder($user, [
            ['item_id' => $itemA->id, 'quantity' => 4],
            ['item_id' => $itemB->id, 'quantity' => 3],
        ]);

        $response = $this->actingAs($user)->postJson("/items/stock/out/do/{$deliveryOrder->id}/return-items", [
            'lines' => [
                ['item_id' => $itemA->id, 'quantity' => 2],
                ['item_id' => $itemB->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Selected SKU returned and stock updated successfully.');

        $this->assertSame(
            8,
            (int) ItemVariant::query()->where('item_id', $itemA->id)->value('stock_current')
        );
        $this->assertSame(
            6,
            (int) ItemVariant::query()->where('item_id', $itemB->id)->value('stock_current')
        );
    }

    private function seedItemsWithStock(User $user, int $stockA, int $stockB): array
    {
        $itemA = Item::query()->create([
            'sku' => 'SKU-A',
            'name' => 'Item A',
            'length_m' => 1,
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $itemB = Item::query()->create([
            'sku' => 'SKU-B',
            'name' => 'Item B',
            'length_m' => 1,
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        ItemVariant::query()->create([
            'item_id' => $itemA->id,
            'color' => null,
            'stock_initial' => $stockA,
            'stock_current' => $stockA,
        ]);

        ItemVariant::query()->create([
            'item_id' => $itemB->id,
            'color' => null,
            'stock_initial' => $stockB,
            'stock_current' => $stockB,
        ]);

        return [$itemA, $itemB];
    }

    private function createDeliveryOrder(User $user, array $lines): InventoryTransaction
    {
        $transaction = InventoryTransaction::query()->create([
            'type' => 'out',
            'mode' => 'alacarte',
            'package_id' => null,
            'package_quantity' => null,
            'sales_user_id' => null,
            'sales_order_id' => null,
            'created_by' => $user->id,
            'notes' => 'Test delivery order',
        ]);

        foreach ($lines as $line) {
            $variant = ItemVariant::query()
                ->where('item_id', (int) $line['item_id'])
                ->where(function ($query) {
                    $query->whereNull('color')->orWhere('color', '');
                })
                ->firstOrFail();

            $variant->decrement('stock_current', (int) $line['quantity']);

            $transaction->lines()->create([
                'item_id' => (int) $line['item_id'],
                'item_variant_id' => $variant->id,
                'quantity' => (int) $line['quantity'],
            ]);
        }

        return $transaction->fresh('lines');
    }
}
