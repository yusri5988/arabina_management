<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SiteReceivingNoteItem extends Model
{
    protected $fillable = [
        'srn_id',
        'item_variant_id',
        'expected_qty',
        'received_qty',
        'rejected_qty',
        'rejection_reason',
    ];

    protected $casts = [
        'expected_qty' => 'float',
        'received_qty' => 'float',
        'rejected_qty' => 'float',
    ];

    public function srn(): BelongsTo
    {
        return $this->belongsTo(SiteReceivingNote::class, 'srn_id');
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
