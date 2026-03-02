<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderLine extends Model
{
    protected $fillable = [
        'sales_order_id',
        'package_id',
        'package_quantity',
        'shipped_quantity',
        'item_sku',
        'item_quantity',
    ];

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_sku', 'sku');
    }
}
