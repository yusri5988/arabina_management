<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ProcurementOrderLine extends Model
{
    protected $fillable = [
        'procurement_order_id',
        'item_id',
        'suggested_quantity',
        'ordered_quantity',
        'received_quantity',
        'rejected_quantity',
        'item_unit',
        'notes',
    ];

    protected $casts = [
        'suggested_quantity' => 'float',
        'ordered_quantity' => 'float',
        'received_quantity' => 'float',
        'rejected_quantity' => 'float',
    ];

    public function procurementOrder(): BelongsTo
    {
        return $this->belongsTo(ProcurementOrder::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function rejectedItems(): MorphMany
    {
        return $this->morphMany(RejectedItem::class, 'rejectable');
    }
}
