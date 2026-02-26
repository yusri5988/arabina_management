<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProcurementOrder extends Model
{
    protected $fillable = [
        'code',
        'status',
        'created_by',
        'notes',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(ProcurementOrderLine::class);
    }

    public function packageLines(): HasMany
    {
        return $this->hasMany(ProcurementOrderPackageLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function salesOrders(): BelongsToMany
    {
        return $this->belongsToMany(SalesOrder::class, 'procurement_order_sales_order');
    }
}
