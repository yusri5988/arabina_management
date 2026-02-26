<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'deposit_amount')) {
                $table->decimal('deposit_amount', 10, 2)->default(0)->after('total_amount');
            }
            if (!Schema::hasColumn('bookings', 'deposit_paid_at')) {
                $table->timestamp('deposit_paid_at')->nullable()->after('deposit_amount');
            }
        });

        DB::table('bookings')->where('status', 'confirmed')->update(['status' => 'booked']);

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','booked','payment_done','cancelled') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        DB::table('bookings')->where('status', 'booked')->update(['status' => 'confirmed']);
        DB::table('bookings')->where('status', 'payment_done')->update(['status' => 'confirmed']);

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending'");
        }

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'deposit_paid_at')) {
                $table->dropColumn('deposit_paid_at');
            }
            if (Schema::hasColumn('bookings', 'deposit_amount')) {
                $table->dropColumn('deposit_amount');
            }
        });
    }
};
