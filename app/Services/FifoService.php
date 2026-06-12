<?php

namespace App\Services;

use App\Models\FifoCostLayer;
use App\Models\InventoryTransactionLine;
use App\Models\ItemVariant;

class FifoService
{
    public function createLayer(
        ItemVariant $variant,
        InventoryTransactionLine $txLine,
        float $qty,
        float $unitCost,
        string $currency = 'MYR',
        ?float $exchangeRate = null
    ): FifoCostLayer {
        $costInMyr = $currency === 'MYR'
            ? $unitCost
            : ($exchangeRate ? $unitCost * $exchangeRate : $unitCost);

        $layer = FifoCostLayer::create([
            'item_variant_id' => $variant->id,
            'inventory_transaction_line_id' => $txLine->id,
            'quantity' => $qty,
            'quantity_consumed' => 0,
            'unit_cost' => $costInMyr,
            'currency' => $currency,
            'exchange_rate' => $exchangeRate,
            'received_at' => now(),
        ]);

        $this->recalculateAverageCost($variant);

        return $layer;
    }

    public function consume(ItemVariant $variant, float $qty): array
    {
        if ($qty <= 0) {
            return ['total_cost' => 0, 'layers_consumed' => []];
        }

        $layers = FifoCostLayer::query()
            ->where('item_variant_id', $variant->id)
            ->whereRaw('(quantity - quantity_consumed) > 0')
            ->orderBy('received_at')
            ->lockForUpdate()
            ->get();

        $remaining = $qty;
        $totalCost = 0;
        $consumed = [];

        foreach ($layers as $layer) {
            if ($remaining <= 0) {
                break;
            }

            $available = $layer->getRemainingQuantity();
            $toConsume = min($available, $remaining);

            $layer->increment('quantity_consumed', $toConsume);
            $totalCost += $toConsume * $layer->unit_cost;

            $consumed[] = [
                'layer_id' => $layer->id,
                'quantity' => $toConsume,
                'unit_cost' => $layer->unit_cost,
                'total' => $toConsume * $layer->unit_cost,
            ];

            $remaining -= $toConsume;
        }

        $this->recalculateAverageCost($variant);

        return [
            'total_cost' => $totalCost,
            'layers_consumed' => $consumed,
            'remaining_qty_not_consumed' => $remaining,
        ];
    }

    public function recalculateAverageCost(ItemVariant $variant): void
    {
        $layers = FifoCostLayer::query()
            ->where('item_variant_id', $variant->id)
            ->whereRaw('(quantity - quantity_consumed) > 0')
            ->get();

        $totalQty = 0;
        $totalValue = 0;

        foreach ($layers as $layer) {
            $remaining = $layer->getRemainingQuantity();
            $totalQty += $remaining;
            $totalValue += $remaining * $layer->unit_cost;
        }

        $averageCost = $totalQty > 0 ? round($totalValue / $totalQty, 2) : 0;

        $variant->update([
            'average_cost' => $averageCost,
            'total_stock_value' => round($averageCost * $variant->stock_current, 2),
        ]);
    }
}
