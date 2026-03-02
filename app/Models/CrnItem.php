<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CrnItem extends Model
{
    protected $fillable = [
        'crn_id',
        'item_variant_id',
        'expected_qty',
        'received_qty',
        'rejected_qty',
        'rejection_reason',
    ];

    public function crn(): BelongsTo
    {
        return $this->belongsTo(ContenaReceivingNote::class, 'crn_id');
    }

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    public function rejectedItems(): MorphMany
    {
        return $this->morphMany(RejectedItem::class, 'rejectable');
    }
}
