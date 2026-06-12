<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FifoCostLayer extends Model
{
    protected $fillable = [
        'item_variant_id',
        'inventory_transaction_line_id',
        'quantity',
        'quantity_consumed',
        'unit_cost',
        'currency',
        'exchange_rate',
        'received_at',
    ];

    protected $casts = [
        'quantity' => 'float',
        'quantity_consumed' => 'float',
        'unit_cost' => 'float',
        'exchange_rate' => 'float',
        'received_at' => 'datetime',
    ];

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    public function inventoryTransactionLine(): BelongsTo
    {
        return $this->belongsTo(InventoryTransactionLine::class);
    }

    public function getRemainingQuantity(): float
    {
        return max(0, $this->quantity - $this->quantity_consumed);
    }
}
