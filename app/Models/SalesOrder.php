<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SalesOrder extends Model
{
    protected $fillable = [
        'code',
        'customer_name',
        'order_date',
        'status',
        'created_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date',
        ];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SalesOrderLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function procurementOrders(): BelongsToMany
    {
        return $this->belongsToMany(ProcurementOrder::class, 'procurement_order_sales_order');
    }

    public function inventoryTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'sales_order_id');
    }
}
