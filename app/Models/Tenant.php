<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'capacity_per_day',
        'price',
        'cut_off_time',
        'policy',
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
