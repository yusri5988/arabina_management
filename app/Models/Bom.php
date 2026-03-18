<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bom extends Model
{
    public const TYPE_CABIN = 'cabin';
    public const TYPE_HARDWARE = 'hardware';
    public const TYPE_HARDWARE_SITE = 'hardware_site';

    public const TYPES = [
        self::TYPE_CABIN,
        self::TYPE_HARDWARE,
        self::TYPE_HARDWARE_SITE,
    ];

    protected $fillable = [
        'code',
        'name',
        'is_active',
        'package_id',
        'type',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function bomItems(): HasMany
    {
        return $this->hasMany(BomItem::class);
    }
}
