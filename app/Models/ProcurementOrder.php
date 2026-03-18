<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

class ProcurementOrder extends Model
{
    protected $fillable = [
        'code',
        'status',
        'supplier_name',
        'supplier_id',
        'procurement_scope',
        'created_by',
        'notes',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ProcurementOrderLine::class);
    }

    public function packageLines(): HasMany
    {
        return $this->hasMany(ProcurementOrderPackageLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function crns(): HasMany
    {
        return $this->hasMany(ContainerReceivingNote::class);
    }

    public function mrns(): HasMany
    {
        return $this->hasMany(MaterialReceivingNote::class);
    }

    public function srns(): HasMany
    {
        return $this->hasMany(SiteReceivingNote::class);
    }

    public function bomScopes(): Collection
    {
        $needsReload = ! $this->relationLoaded('lines')
            || $this->lines->contains(function (ProcurementOrderLine $line) {
                if (! $line->relationLoaded('item')) {
                    return true;
                }

                if (! $line->item) {
                    return false;
                }

                return ! array_key_exists('bom_scope', $line->item->getAttributes());
            });

        if ($needsReload) {
            $this->load('lines.item:id,bom_scope');
        }

        return $this->lines
            ->map(fn (ProcurementOrderLine $line) => (string) ($line->item?->bom_scope ?? ''))
            ->filter()
            ->unique()
            ->values();
    }

    public function bomScope(): ?string
    {
        $scopes = $this->bomScopes();

        return $scopes->count() === 1 ? $scopes->first() : null;
    }

    public function matchesBomScope(string $scope): bool
    {
        return $this->bomScope() === $scope;
    }
}
