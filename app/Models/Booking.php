<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    protected $fillable = [
        'restaurant_id',
        'booking_date',
        'customer_name',
        'customer_phone',
        'child_qty',
        'adult_qty',
        'senior_qty',
        'price_child_snapshot',
        'price_adult_snapshot',
        'price_senior_snapshot',
        'total_amount',
        'deposit_amount',
        'deposit_paid_at',
        'status',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'child_qty' => 'integer',
        'adult_qty' => 'integer',
        'senior_qty' => 'integer',
        'price_child_snapshot' => 'decimal:2',
        'price_adult_snapshot' => 'decimal:2',
        'price_senior_snapshot' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'deposit_paid_at' => 'datetime',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BookingItem::class);
    }

    public function getTotalPaxAttribute(): int
    {
        return $this->child_qty + $this->adult_qty + $this->senior_qty;
    }
}
