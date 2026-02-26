<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;

class BookingExportController extends Controller
{
    public function export(Request $request)
    {
        $user = Auth::user();

        if (!$user || !$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        $restaurant = \App\Models\Restaurant::with('settings')->findOrFail($user->restaurant_id);
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

        $data = [
            'restaurant' => $restaurant,
            'bookings' => $bookings,
            'selectedDate' => $selectedDate,
            'search' => $search,
        ];

        if (!class_exists(Pdf::class)) {
            return view('restaurant.bookings-report', $data);
        }

        $pdf = Pdf::loadView('restaurant.bookings-report', $data)
            ->setPaper('a4', 'portrait');

        $fileName = 'laporan-tempahan-' . $selectedDate . '.pdf';

        return $pdf->download($fileName);
    }
}
