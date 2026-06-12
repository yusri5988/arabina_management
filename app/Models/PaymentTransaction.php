<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'procurement_order_id',
        'payment_date',
        'amount_foreign',
        'foreign_currency',
        'actual_exchange_rate',
        'amount_myr',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount_foreign' => 'float',
        'actual_exchange_rate' => 'float',
        'amount_myr' => 'float',
    ];

    public function procurementOrder(): BelongsTo
    {
        return $this->belongsTo(ProcurementOrder::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getForexGainLossAttribute(): float
    {
        $po = $this->procurementOrder;
        if (!$po || !$po->exchange_rate) {
            return 0;
        }
        $expectedMyr = $this->amount_foreign * $po->exchange_rate;
        return $this->amount_myr - $expectedMyr;
    }
}
