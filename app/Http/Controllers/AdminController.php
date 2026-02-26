<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\Booking; // Make sure to import Booking model if used

class AdminController extends Controller
{
    public function dashboard(Request $request, $slug)
    {
        // Simple auth check
        if (!session()->has('admin_tenant_id')) {
            return redirect()->route('admin.login')->with('error', 'Sila log masuk.');
        }

        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        // Security check: ensure logged in tenant matches the requested dashboard
        if (session('admin_tenant_id') != $tenant->id) {
            return redirect()->route('admin.dashboard', Tenant::find(session('admin_tenant_id'))->slug);
        }

        // Stats
        $today = now()->toDateString();

        $totalPaxToday = $tenant->bookings()
            ->whereDate('visit_date', $today)
            ->where('status', '!=', 'cancelled')
            ->sum('pax');

        $totalPaxAll = $tenant->bookings()
            ->where('status', '!=', 'cancelled')
            ->sum('pax');

        // Recent bookings or Search results
        $query = $tenant->bookings();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('booking_ref', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $recentBookings = $query->orderBy('id', 'desc')
            ->limit(20)
            ->get();

        return view('admin.dashboard', compact('tenant', 'totalPaxToday', 'totalPaxAll', 'recentBookings', 'today'));
    }

    public function checkIn($slug, $bookingRef)
    {
        if (!session()->has('admin_tenant_id')) {
            return redirect()->route('admin.login');
        }

        $tenant = Tenant::where('slug', $slug)->firstOrFail();

        // Security check
        if (session('admin_tenant_id') != $tenant->id) {
            return back()->with('error', 'Akses dinafikan.');
        }

        $booking = $tenant->bookings()->where('booking_ref', $bookingRef)->firstOrFail();

        if ($booking->status == 'checked_in') {
            return back()->with('error', 'Sudah check-in sebelum ini.');
        }

        $booking->update(['status' => 'checked_in']);

        return back()->with('success', "Booking {$bookingRef} Berjaya Check-in.");
    }
}
