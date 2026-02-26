<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;

class BookingReceiptController extends Controller
{
    public function download(Booking $booking)
    {
        $user = Auth::user();

        if (!$user || !$user->isRestaurant() || $user->restaurant_id !== $booking->restaurant_id) {
            abort(403);
        }

        $booking->load('items');
        $restaurant = $booking->restaurant()->with('settings')->firstOrFail();

        $deposit = (float) ($booking->deposit_amount ?? 0);
        $total = (float) ($booking->total_amount ?? 0);
        $balance = max(0, $total - $deposit);

        $data = [
            'restaurant' => $restaurant,
            'booking' => $booking,
            'deposit' => $deposit,
            'total' => $total,
            'balance' => $balance,
        ];

        $pdf = Pdf::loadView('restaurant.booking-receipt', $data)
            ->setPaper('a4', 'portrait');

        $fileName = 'resit-tempahan-' . $booking->id . '.pdf';

        return $pdf->download($fileName);
    }
}
