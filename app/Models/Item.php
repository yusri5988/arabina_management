<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use SoftDeletes;

    protected $fillable = ['sku', 'name', 'length_m', 'unit', 'created_by'];

    public function variants(): HasMany
    {
        return $this->hasMany(ItemVariant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function packageItems(): HasMany
    {
        return $this->hasMany(PackageItem::class);
    }
}
