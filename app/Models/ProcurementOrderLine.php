<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementOrderLine extends Model
{
    protected $fillable = [
        'procurement_order_id',
        'item_id',
        'suggested_quantity',
        'ordered_quantity',
        'received_quantity',
        'rejected_quantity',
        'notes',
    ];

    public function procurementOrder(): BelongsTo
    {
        return $this->belongsTo(ProcurementOrder::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
