<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\SalesOrder;
use App\Services\ProcurementService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(ProcurementService $procurementService): Response
    {
        $openSalesOrders = SalesOrder::query()
            ->whereIn('status', ['open', 'partial'])
            ->count();

        $shortageOrders = collect($procurementService->getShortageSuggestions(Bom::TYPE_CABIN)['source_orders'] ?? [])
            ->unique('id')
            ->values();

        $shortageCount = $shortageOrders->count();
        $readyForDeliveryCount = max($openSalesOrders - $shortageCount, 0);

        return Inertia::render('Dashboard', [
            'operationalNotes' => [
                [
                    'tone' => 'amber',
                    'message' => $shortageCount > 0
                        ? "There are {$shortageCount} sales orders still waiting on cabin BOM stock before fulfillment."
                        : 'No sales orders are currently blocked by cabin BOM stock shortages.',
                ],
                [
                    'tone' => 'emerald',
                    'message' => $readyForDeliveryCount > 0
                        ? "There are {$readyForDeliveryCount} sales orders ready for delivery order preparation based on cabin BOM availability."
                        : 'No sales orders are currently ready for delivery order preparation based on cabin BOM availability.',
                ],
            ],
        ]);
    }
}
