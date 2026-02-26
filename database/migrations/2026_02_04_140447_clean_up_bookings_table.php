<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('bookings', 'phone')) {
                $table->dropColumn('phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('name')->after('id');
            $table->string('phone')->after('name');
        });
    }
};
