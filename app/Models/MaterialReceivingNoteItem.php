<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class MaterialReceivingNoteItem extends Model
{
    protected $fillable = [
        'mrn_id',
        'item_variant_id',
        'expected_qty',
        'received_qty',
        'rejected_qty',
        'rejection_reason',
        'unit_cost',
        'currency',
        'invoice_number',
        'exchange_rate',
    ];

    protected $casts = [
        'expected_qty' => 'float',
        'received_qty' => 'float',
        'rejected_qty' => 'float',
        'unit_cost' => 'float',
        'exchange_rate' => 'float',
    ];

    public function mrn(): BelongsTo
    {
        return $this->belongsTo(MaterialReceivingNote::class, 'mrn_id');
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
