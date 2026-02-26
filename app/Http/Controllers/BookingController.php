<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function show($slug)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();
        return view('booking.form', compact('tenant'));
    }

    public function store(Request $request, $slug)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'visit_date' => 'required|date|after_or_equal:today',
            'pax' => 'required|integer|min:1',
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
        ]);

        // Check availability
        $currentPax = \App\Models\Booking::where('tenant_id', $tenant->id)
            ->where('visit_date', $request->visit_date)
            ->where('status', '!=', 'cancelled')
            ->sum('pax');

        if (($currentPax + $request->pax) > $tenant->capacity_per_day) {
            $remaining = max(0, $tenant->capacity_per_day - $currentPax);
            return back()->withErrors(['pax' => "Maaf, tarikh ini hampir penuh. Kekosongan: {$remaining} pax sahaja."])->withInput();
        }

        // Create booking
        $booking = \App\Models\Booking::create([
            'tenant_id' => $tenant->id,
            'booking_ref' => 'REF-' . strtoupper(uniqid()),
            'name' => $request->name,
            'phone' => $request->phone,
            'visit_date' => $request->visit_date,
            'pax' => $request->pax,
            'status' => 'pending',
        ]);

        return redirect()->route('booking.success', ['slug' => $slug, 'bookingRef' => $booking->booking_ref]);
    }

    public function success($slug, $bookingRef)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();
        $booking = \App\Models\Booking::where('booking_ref', $bookingRef)->firstOrFail();

        return view('booking.success', compact('tenant', 'booking'));
    }

    public function checkForm($slug)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();
        return view('booking.check', compact('tenant'));
    }

    public function processCheck(Request $request, $slug)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();

        $request->validate([
            'booking_ref' => 'required|string',
            'phone' => 'required|string',
        ]);

        $booking = \App\Models\Booking::where('tenant_id', $tenant->id)
            ->where('booking_ref', $request->booking_ref)
            ->where('phone', $request->phone)
            ->first();

        if (!$booking) {
            return back()->withErrors(['booking_ref' => 'Tempahan tidak dijumpai atau nombor telefon salah.']);
        }

        session(['auth_booking_ref' => $booking->booking_ref]);
        return redirect()->route('booking.manage', ['slug' => $slug, 'bookingRef' => $booking->booking_ref]);
    }

    public function manage($slug, $bookingRef)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();

        if (session('auth_booking_ref') !== $bookingRef) {
            return redirect()->route('booking.check', $slug)->with('error', 'Sila log masuk semula.');
        }

        $booking = \App\Models\Booking::where('booking_ref', $bookingRef)->firstOrFail();

        return view('booking.manage', compact('tenant', 'booking'));
    }

    public function update(Request $request, $slug, $bookingRef)
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->firstOrFail();
        $booking = \App\Models\Booking::where('booking_ref', $bookingRef)->firstOrFail();

        if (session('auth_booking_ref') !== $bookingRef) {
            return redirect()->route('booking.check', $slug);
        }

        if ($booking->visit_date < now()->toDateString()) {
            return back()->withErrors(['error' => 'Tempahan yang lepas tidak boleh diubah.']);
        }

        $validated = $request->validate([
            'visit_date' => 'required|date|after_or_equal:today',
            'pax' => 'required|integer|min:1',
        ]);

        // Capacity Check Logic (same as store but excluding current booking)
        $currentPax = \App\Models\Booking::where('tenant_id', $tenant->id)
            ->where('visit_date', $request->visit_date)
            ->where('id', '!=', $booking->id) // Exclude self
            ->where('status', '!=', 'cancelled')
            ->sum('pax');

        if (($currentPax + $request->pax) > $tenant->capacity_per_day) {
            $remaining = max(0, $tenant->capacity_per_day - $currentPax);
            return back()->withErrors(['pax' => "Maaf, tarikh ini hampir penuh. Kekosongan: {$remaining} pax sahaja."])->withInput();
        }

        $booking->update([
            'visit_date' => $request->visit_date,
            'pax' => $request->pax,
        ]);

        return back()->with('success', 'Tempahan berjaya dikemaskini.');
    }
}
