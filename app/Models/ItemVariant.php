<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemVariant extends Model
{
    protected $fillable = [
        'item_id', 'color', 'stock_initial', 'stock_current',
        'average_cost', 'total_stock_value',
    ];

    protected $casts = [
        'stock_initial' => 'float',
        'stock_current' => 'float',
        'average_cost' => 'float',
        'total_stock_value' => 'float',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
