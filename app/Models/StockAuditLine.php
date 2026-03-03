<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAuditLine extends Model
{
    protected $fillable = [
        'stock_audit_id',
        'item_id',
        'stock_before',
        'audited_stock',
        'diff_quantity',
        'short_quantity',
    ];

    public function audit(): BelongsTo
    {
        return $this->belongsTo(StockAudit::class, 'stock_audit_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
