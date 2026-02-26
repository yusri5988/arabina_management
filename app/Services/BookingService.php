<?php

namespace App\Services;

use App\Models\Restaurant;
use App\Models\RestaurantSetting;

class BookingService
{
    public function getAvailableCapacity(Restaurant $restaurant, string $date): int
    {
        $settings = $restaurant->settings;
        if (!$settings) {
            return 0;
        }

        $usedCapacity = $this->getUsedCapacity($restaurant, $date);

        return max(0, $settings->daily_capacity - $usedCapacity);
    }

    public function getUsedCapacity(Restaurant $restaurant, string $date): int
    {
        $totals = $restaurant->bookings()
            ->where('booking_date', $date)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COALESCE(SUM(child_qty), 0) as total_child')
            ->selectRaw('COALESCE(SUM(adult_qty), 0) as total_adult')
            ->selectRaw('COALESCE(SUM(senior_qty), 0) as total_senior')
            ->first();

        return (int) (($totals->total_child ?? 0) + ($totals->total_adult ?? 0) + ($totals->total_senior ?? 0));
    }

    public function calculateTotalAmount(
        int $childQty,
        int $adultQty,
        int $seniorQty,
        RestaurantSetting $settings
    ): float {
        return ($childQty * $settings->price_child) +
               ($adultQty * $settings->price_adult) +
               ($seniorQty * $settings->price_senior);
    }

    public function calculateProductsTotal(array $normalizedItems): float
    {
        return (float) collect($normalizedItems)->sum(function (array $item) {
            return $item['quantity'] * $item['price'];
        });
    }
}
