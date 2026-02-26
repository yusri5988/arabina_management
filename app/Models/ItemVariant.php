<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemVariant extends Model
{
    protected $fillable = ['item_id', 'color', 'stock_initial', 'stock_current'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
