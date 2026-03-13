<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = ['name', 'contact_person', 'phone', 'address'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function procurementOrders(): HasMany
    {
        return $this->hasMany(ProcurementOrder::class);
    }
}
