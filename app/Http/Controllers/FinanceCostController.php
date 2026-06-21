<?php

namespace App\Http\Controllers;

use App\Models\FifoCostLayer;
use App\Services\FifoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FinanceCostController extends Controller
{
    public function index(Request $request): Response
    {
        $pendingCosts = FifoCostLayer::query()
            ->with([
                'itemVariant.item:id,sku,name,unit,cost_cny',
                'inventoryTransactionLine.transaction:id,notes,created_at',
            ])
            ->where('unit_cost', 0)
            ->latest('received_at')
            ->get()
            ->map(function ($layer) {
                return [
                    'id' => $layer->id,
                    'sku' => $layer->itemVariant?->item?->sku,
                    'name' => $layer->itemVariant?->item?->name,
                    'cost_cny' => (float) ($layer->itemVariant?->item?->cost_cny ?? 0),
                    'quantity' => (float) $layer->quantity,
                    'received_at' => optional($layer->received_at)->format('Y-m-d H:i:s'),
                    'transaction_notes' => $layer->inventoryTransactionLine?->transaction?->notes ?? 'Direct Receive',
                    'currency' => $layer->currency,
                    'exchange_rate' => $layer->exchange_rate,
                    'invoice_number' => $layer->invoice_number ?? '',
                ];
            });

        return Inertia::render('Finance/CostManagement', [
            'pendingCosts' => $pendingCosts,
        ]);
    }

    public function bulkUpdateCosts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exchange_rate' => 'required|numeric|min:0.000001|max:999.999999',
            'layer_ids' => 'required|array|min:1',
            'layer_ids.*' => 'required|integer|distinct',
        ]);

        $updatedCount = DB::transaction(function () use ($validated) {
            $layerIds = collect($validated['layer_ids'])->map(fn ($id) => (int) $id)->values();

            $layers = FifoCostLayer::query()
                ->with(['itemVariant.item', 'inventoryTransactionLine.transaction'])
                ->whereKey($layerIds)
                ->lockForUpdate()
                ->get();

            if ($layers->count() !== $layerIds->count()) {
                throw ValidationException::withMessages([
                    'layer_ids' => ['One or more selected cost layers could not be found.'],
                ]);
            }

            $alreadyCosted = $layers->first(fn ($layer) => (float) $layer->unit_cost > 0);
            if ($alreadyCosted) {
                throw ValidationException::withMessages([
                    'layer_ids' => ['One or more selected cost layers has already been costed.'],
                ]);
            }

            $missingCnyCost = $layers->first(fn ($layer) => (float) ($layer->itemVariant?->item?->cost_cny ?? 0) <= 0);
            if ($missingCnyCost) {
                $sku = $missingCnyCost->itemVariant?->item?->sku ?? 'selected SKU';

                throw ValidationException::withMessages([
                    'cost_cny' => ["{$sku} has no CNY cost. Please update Cabin BOM Cost before submitting."],
                ]);
            }

            $exchangeRate = (float) $validated['exchange_rate'];
            $variantIds = [];

            foreach ($layers as $layer) {
                $costCny = (float) $layer->itemVariant->item->cost_cny;

                $layer->update([
                    'unit_cost' => round($costCny * $exchangeRate, 2),
                    'currency' => 'CNY',
                    'exchange_rate' => $exchangeRate,
                    'invoice_number' => null,
                ]);

                if ($layer->item_variant_id) {
                    $variantIds[$layer->item_variant_id] = true;
                }
            }

            foreach (array_keys($variantIds) as $variantId) {
                $variant = $layers->firstWhere('item_variant_id', $variantId)?->itemVariant;
                if ($variant) {
                    app(FifoService::class)->recalculateAverageCost($variant);
                }
            }

            return $layers->count();
        });

        return response()->json([
            'message' => "{$updatedCount} cost entries updated successfully.",
            'updated_count' => $updatedCount,
        ]);
    }

    public function updateCost(Request $request, int $layer): JsonResponse
    {
        $validated = $request->validate([
            'unit_cost' => 'required|numeric|min:0.01|max:999999.99',
            'currency' => 'required|string|in:MYR,USD,CNY,EUR',
            'exchange_rate' => 'required_unless:currency,MYR|nullable|numeric|min:0.000001|max:999.999999',
            'invoice_number' => 'nullable|string|max:255',
        ]);

        $layer = DB::transaction(function () use ($layer, $validated) {
            $layer = FifoCostLayer::query()
                ->with(['itemVariant', 'inventoryTransactionLine.transaction'])
                ->whereKey($layer)
                ->lockForUpdate()
                ->firstOrFail();

            if ($layer->unit_cost > 0) {
                throw ValidationException::withMessages([
                    'layer' => ['This cost layer has already been costed.'],
                ]);
            }

            $exchangeRate = $validated['currency'] === 'MYR'
                ? null
                : (float) $validated['exchange_rate'];

            $costInMyr = $validated['currency'] === 'MYR'
                ? (float) $validated['unit_cost']
                : (float) $validated['unit_cost'] * $exchangeRate;

            $invoiceNumber = $validated['invoice_number'] ?? null;

            $layer->update([
                'unit_cost' => $costInMyr,
                'currency' => $validated['currency'],
                'exchange_rate' => $exchangeRate,
                'invoice_number' => $invoiceNumber,
            ]);

            if (!empty($invoiceNumber)) {
                $transaction = $layer->inventoryTransactionLine?->transaction;
                if ($transaction && !str_contains((string) $transaction->notes, 'Inv:')) {
                    $transaction->update([
                        'notes' => trim(($transaction->notes ?: '') . ' | Inv: ' . $invoiceNumber, ' |'),
                    ]);
                }
            }

            if ($layer->itemVariant) {
                app(FifoService::class)->recalculateAverageCost($layer->itemVariant);
            }

            return $layer->fresh();
        });

        return response()->json([
            'message' => 'Cost updated successfully.',
            'layer' => $layer,
        ]);
    }
}
