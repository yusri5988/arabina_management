<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryTransaction extends Model
{
    protected $fillable = [
        'type',
        'mode',
        'package_id',
        'package_quantity',
        'sales_user_id',
        'sales_order_id',
        'created_by',
        'notes',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryTransactionLine::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }
}
