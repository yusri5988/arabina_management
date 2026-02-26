<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private BookingService $bookingService
    ) {}

    public function index(Request $request)
    {
        $user = Auth::user();

        if ($user && $user->isAdmin()) {
            return redirect()->route('admin.restaurants.index');
        }

        if (!$user || !$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        $restaurant = Restaurant::with('settings')->findOrFail($user->restaurant_id);
        $selectedDate = $request->get('date', now()->format('Y-m-d'));
        $search = trim((string) $request->get('search', ''));

        $bookingsQuery = $restaurant->bookings()
            ->where('booking_date', $selectedDate);

        if ($search !== '') {
            $bookingsQuery->where(function ($query) use ($search) {
                $query->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $bookings = $bookingsQuery
            ->orderBy('created_at', 'desc')
            ->get();

        $usedCapacity = $this->bookingService->getUsedCapacity($restaurant, $selectedDate);
        $availableCapacity = $this->bookingService->getAvailableCapacity($restaurant, $selectedDate);
        $dailyCapacity = $restaurant->settings->daily_capacity ?? 0;

        $totalAmount = $restaurant->bookings()
            ->where('booking_date', $selectedDate)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        return Inertia::render('Restaurant/Dashboard', [
            'restaurant' => $restaurant,
            'bookings' => $bookings,
            'selectedDate' => $selectedDate,
            'search' => $search,
            'summary' => [
                'usedCapacity' => $usedCapacity,
                'availableCapacity' => $availableCapacity,
                'dailyCapacity' => $dailyCapacity,
                'totalAmount' => $totalAmount,
            ],
        ]);
    }
}
