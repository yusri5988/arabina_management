<?php

namespace Tests\Feature;

use App\Models\FifoCostLayer;
use App\Models\InventoryTransaction;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceCostManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_myr_cost_can_be_saved_without_exchange_rate(): void
    {
        [$user, $layer, $variant] = $this->createPendingCostLayer();

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 12.50,
            'currency' => 'MYR',
            'exchange_rate' => null,
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('fifo_cost_layers', [
            'id' => $layer->id,
            'unit_cost' => 12.50,
            'currency' => 'MYR',
            'exchange_rate' => null,
        ]);

        $this->assertSame(12.5, (float) $variant->fresh()->average_cost);
    }

    public function test_foreign_currency_cost_requires_exchange_rate(): void
    {
        [$user, $layer] = $this->createPendingCostLayer();

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 10,
            'currency' => 'USD',
            'exchange_rate' => null,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['exchange_rate']);

        $this->assertDatabaseHas('fifo_cost_layers', [
            'id' => $layer->id,
            'unit_cost' => 0,
        ]);
    }

    public function test_foreign_currency_cost_is_saved_as_converted_myr_value(): void
    {
        [$user, $layer] = $this->createPendingCostLayer();

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 10,
            'currency' => 'USD',
            'exchange_rate' => 4.75,
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('fifo_cost_layers', [
            'id' => $layer->id,
            'unit_cost' => 47.50,
            'currency' => 'USD',
            'exchange_rate' => 4.75,
        ]);
    }

    public function test_already_costed_layer_cannot_be_updated_from_pending_cost_flow(): void
    {
        [$user, $layer] = $this->createPendingCostLayer([
            'unit_cost' => 8.75,
        ]);

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 10,
            'currency' => 'MYR',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['layer']);

        $this->assertDatabaseHas('fifo_cost_layers', [
            'id' => $layer->id,
            'unit_cost' => 8.75,
        ]);
    }

    public function test_invoice_number_is_saved_on_fifo_cost_layer(): void
    {
        [$user, $layer] = $this->createPendingCostLayer();

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 15,
            'currency' => 'MYR',
            'invoice_number' => 'INV-1001',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('fifo_cost_layers', [
            'id' => $layer->id,
            'invoice_number' => 'INV-1001',
        ]);
    }

    public function test_average_cost_recalculates_after_successful_update(): void
    {
        [$user, $layer, $variant] = $this->createPendingCostLayer([
            'quantity' => 5,
        ]);

        FifoCostLayer::query()->create([
            'item_variant_id' => $variant->id,
            'inventory_transaction_line_id' => $layer->inventory_transaction_line_id,
            'quantity' => 5,
            'quantity_consumed' => 0,
            'unit_cost' => 20,
            'currency' => 'MYR',
            'received_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($user)->postJson("/finance/costs/{$layer->id}", [
            'unit_cost' => 10,
            'currency' => 'MYR',
        ]);

        $response->assertOk();

        $this->assertSame(15.0, (float) $variant->fresh()->average_cost);
        $this->assertSame(150.0, (float) $variant->fresh()->total_stock_value);
    }

    private function createPendingCostLayer(array $layerOverrides = []): array
    {
        $user = User::factory()->create([
            'role' => User::ROLE_FINANCE,
        ]);

        $item = Item::query()->create([
            'sku' => 'FIN-SKU-' . uniqid(),
            'name' => 'Finance Test Item',
            'unit' => 'pcs',
            'created_by' => $user->id,
        ]);

        $variant = ItemVariant::query()->create([
            'item_id' => $item->id,
            'color' => null,
            'stock_initial' => 10,
            'stock_current' => 10,
        ]);

        $transaction = InventoryTransaction::query()->create([
            'type' => 'in',
            'mode' => 'alacarte',
            'created_by' => $user->id,
            'notes' => 'Finance test receive',
        ]);

        $transactionLine = $transaction->lines()->create([
            'item_id' => $item->id,
            'item_variant_id' => $variant->id,
            'quantity' => 10,
        ]);

        $layer = FifoCostLayer::query()->create(array_merge([
            'item_variant_id' => $variant->id,
            'inventory_transaction_line_id' => $transactionLine->id,
            'quantity' => 10,
            'quantity_consumed' => 0,
            'unit_cost' => 0,
            'currency' => 'MYR',
            'exchange_rate' => null,
            'received_at' => now(),
        ], $layerOverrides));

        return [$user, $layer, $variant];
    }
}
