<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContenaReceivingNote extends Model
{
    protected $fillable = [
        'crn_number',
        'procurement_order_id',
        'status',
        'received_at',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'received_at' => 'datetime',
    ];

    public function procurementOrder(): BelongsTo
    {
        return $this->belongsTo(ProcurementOrder::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CrnItem::class, 'crn_id');
    }
}
