<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RejectedItem extends Model
{
    protected $fillable = [
        'rejectable_type',
        'rejectable_id',
        'procurement_order_id',
        'crn_id',
        'item_id',
        'item_variant_id',
        'quantity',
        'reason',
        'rejected_at',
        'created_by',
    ];

    protected $casts = [
        'rejected_at' => 'datetime',
    ];

    public function rejectable(): MorphTo
    {
        return $this->morphTo();
    }

    public function procurementOrder(): BelongsTo
    {
        return $this->belongsTo(ProcurementOrder::class);
    }

    public function crn(): BelongsTo
    {
        return $this->belongsTo(ContenaReceivingNote::class, 'crn_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
