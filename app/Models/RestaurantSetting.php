<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantSetting extends Model
{
    protected $fillable = [
        'restaurant_id',
        'price_child',
        'price_adult',
        'price_senior',
        'daily_capacity',
        'whatsapp_number',
    ];

    protected $casts = [
        'price_child' => 'decimal:2',
        'price_adult' => 'decimal:2',
        'price_senior' => 'decimal:2',
        'daily_capacity' => 'integer',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }
}
