<?php

namespace App\Http\Controllers;

use App\Models\Restaurant;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PublicBookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService
    ) {
    }

    public function show(string $identifier): Response
    {
        $restaurant = Restaurant::where(function ($query) use ($identifier) {
            $query->where('slug', $identifier)
                ->orWhere('referral_code', $identifier);
        })
            ->where('is_active', true)
            ->with([
                'settings',
                'products' => function ($query) {
                    $query->where('is_active', true)->orderBy('name');
                }
            ])
            ->firstOrFail();

        $today = now()->format('Y-m-d');
        $availableCapacity = $this->bookingService->getAvailableCapacity($restaurant, $today);

        return Inertia::render('Booking/BookingForm', [
            'restaurant' => $restaurant,
            'settings' => $restaurant->settings,
            'products' => $restaurant->products,
            'defaultDate' => $today,
            'availableCapacity' => $availableCapacity,
        ]);
    }

    public function store(Request $request, string $identifier)
    {
        $restaurant = Restaurant::where(function ($query) use ($identifier) {
            $query->where('slug', $identifier)
                ->orWhere('referral_code', $identifier);
        })
            ->where('is_active', true)
            ->with([
                'settings',
                'products' => function ($query) {
                    $query->where('is_active', true);
                }
            ])
            ->firstOrFail();

        $settings = $restaurant->settings;
        if (!$settings) {
            return back()->withErrors(['error' => 'Restaurant settings not found.']);
        }

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'total_pax' => ['required', 'integer', 'min:1'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $totalPax = (int) $validated['total_pax'];

        $availableCapacity = $this->bookingService->getAvailableCapacity(
            $restaurant,
            $validated['booking_date']
        );

        if ($totalPax > $availableCapacity) {
            return back()->withErrors([
                'error' => 'Tarikh ni dah penuh. Available slots: ' . $availableCapacity,
            ])->withInput();
        }

        $products = $restaurant->products->keyBy('id');
        $normalizedItems = [];

        foreach ($validated['items'] as $item) {
            $product = $products->get((int) $item['product_id']);

            if (!$product || !$product->is_active) {
                return back()->withErrors([
                    'error' => 'Produk tidak lagi tersedia.',
                ])->withInput();
            }

            $quantity = (int) $item['quantity'];

            $normalizedItems[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'price' => (float) $product->price,
                'quantity' => $quantity,
                'line_total' => $quantity * (float) $product->price,
            ];
        }

        if (empty($normalizedItems)) {
            return back()->withErrors([
                'error' => 'Sila pilih sekurang-kurangnya satu produk.',
            ])->withInput();
        }

        $totalAmount = $this->bookingService->calculateProductsTotal($normalizedItems);

        $booking = DB::transaction(function () use ($restaurant, $validated, $settings, $totalAmount, $normalizedItems, $totalPax) {
            $booking = $restaurant->bookings()->create([
                'booking_date' => $validated['booking_date'],
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'child_qty' => 0,
                'adult_qty' => $totalPax,
                'senior_qty' => 0,
                'price_child_snapshot' => 0,
                'price_adult_snapshot' => 0,
                'price_senior_snapshot' => 0,
                'total_amount' => $totalAmount,
                'status' => 'pending',
            ]);

            foreach ($normalizedItems as $item) {
                $booking->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name_snapshot' => $item['name'],
                    'unit_price_snapshot' => $item['price'],
                    'quantity' => $item['quantity'],
                    'line_total' => $item['line_total'],
                ]);
            }

            return $booking;
        });

        return Inertia::render('Booking/Success', [
            'booking' => $booking->load(['restaurant.settings', 'items']),
            'restaurant' => $restaurant->load('settings'),
        ]);
    }

    public function checkCapacity(Request $request, string $identifier)
    {
        $restaurant = Restaurant::where(function ($query) use ($identifier) {
            $query->where('slug', $identifier)
                ->orWhere('referral_code', $identifier);
        })
            ->where('is_active', true)
            ->with([
                'settings',
                'products' => function ($query) {
                    $query->where('is_active', true)->orderBy('name');
                }
            ])
            ->firstOrFail();

        $date = $request->get('date', now()->format('Y-m-d'));
        $availableCapacity = $this->bookingService->getAvailableCapacity($restaurant, $date);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json(['availableCapacity' => $availableCapacity]);
        }

        return Inertia::render('Booking/BookingForm', [
            'restaurant' => $restaurant,
            'settings' => $restaurant->settings,
            'products' => $restaurant->products,
            'defaultDate' => $date,
            'availableCapacity' => $availableCapacity,
        ]);
    }
}
