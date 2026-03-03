<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockAudit extends Model
{
    protected $fillable = [
        'audited_by',
        'audited_at',
        'notes',
    ];

    protected $casts = [
        'audited_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StockAuditLine::class);
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'audited_by');
    }
}
