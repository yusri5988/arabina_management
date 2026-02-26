<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class BookingStatusController extends Controller
{
    public function update(Request $request, Booking $booking)
    {
        $user = Auth::user();

        if (!$user || !$user->isRestaurant() || $user->restaurant_id !== $booking->restaurant_id) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['pending', 'booked', 'payment_done', 'cancelled'])],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $updates = [];

        if (array_key_exists('status', $validated)) {
            $updates['status'] = $validated['status'];
        }

        if (array_key_exists('deposit_amount', $validated)) {
            $deposit = $validated['deposit_amount'];
            $updates['deposit_amount'] = $deposit;
            $updates['deposit_paid_at'] = $deposit > 0 ? now() : null;

            if (!array_key_exists('status', $validated) && $booking->status === 'pending' && $deposit > 0) {
                $updates['status'] = 'booked';
            }
        }

        if (!empty($updates)) {
            $booking->update($updates);
        }

        return back()->with('success', 'Tempahan berjaya dikemaskini.');
    }
}
