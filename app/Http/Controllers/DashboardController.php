<?php

namespace App\Http\Controllers;

use App\Models\ItemVariant;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Dashboard', [
            'stats' => [
                'stock_items' => (int) ItemVariant::sum('stock_current'),
                'pending_orders' => Schema::hasTable('sales_orders')
                    ? SalesOrder::query()->whereIn('status', ['open', 'partial'])->count()
                    : 0,
                'active_users' => User::count(),
            ]
        ]);
    }
}
