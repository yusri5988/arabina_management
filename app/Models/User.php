<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'module_permissions',
        'created_by',
    ];

    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_STORE_KEEPER = 'store_keeper';
    public const ROLE_PROCUREMENT = 'procurement';
    public const ROLE_FINANCE = 'finance';
    public const ROLE_SALES = 'sales';

    public const MANAGED_ROLES = [
        self::ROLE_STORE_KEEPER,
        self::ROLE_PROCUREMENT,
        self::ROLE_FINANCE,
        self::ROLE_SALES,
    ];

    public function scopeManaged($query)
    {
        return $query->whereIn('role', self::MANAGED_ROLES);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'module_permissions' => 'array',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function hasRole(...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function hasModuleAccess(string $module): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if (!Schema::hasColumn($this->getTable(), 'module_permissions')) {
            // Backward-compatible fallback before migration is applied.
            return true;
        }

        $permissions = $this->module_permissions ?? [];

        if (in_array($module, $permissions, true)) {
            return true;
        }

        $legacyMap = [
            'item_catalog' => ['inventory'],
            'stock_list' => ['inventory'],
            'stock_in' => ['inventory'],
            'delivery_order' => ['inventory'],
            'create_package' => ['packages'],
            'crn' => [
                'warehouse_crn',
                'warehouse_crn_index',
                'warehouse_crn_pdf',
                'warehouse_crn_eta',
                'warehouse_crn_arrived',
                'warehouse_crn_create',
                'warehouse_crn_store',
                'warehouse_crn_procurement_receive',
                'warehouse_crn_procurement_safe_line',
                'warehouse_crn_transfer',
            ],
            'rejected_list' => ['warehouse_rejections'],
        ];

        $fallbacks = $legacyMap[$module] ?? [];
        foreach ($fallbacks as $fallbackKey) {
            if (in_array($fallbackKey, $permissions, true)) {
                return true;
            }
        }

        return false;
    }
}
