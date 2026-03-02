<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            return;
        }

        DB::table('users')
            ->where('role', 'admin')
            ->update(['role' => 'super_admin']);

        DB::table('users')
            ->where('role', 'restaurant')
            ->update(['role' => 'store_keeper']);
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            return;
        }

        DB::table('users')
            ->where('role', 'super_admin')
            ->update(['role' => 'admin']);

        DB::table('users')
            ->where('role', 'store_keeper')
            ->update(['role' => 'restaurant']);
    }
};
