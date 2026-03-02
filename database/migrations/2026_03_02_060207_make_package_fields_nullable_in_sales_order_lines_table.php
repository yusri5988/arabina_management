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
        Schema::table('sales_order_lines', function (Blueprint $table) {
            $table->foreignId('package_id')->nullable()->change();
            $table->unsignedInteger('package_quantity')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_order_lines', function (Blueprint $table) {
            $table->foreignId('package_id')->nullable(false)->change();
            $table->unsignedInteger('package_quantity')->nullable(false)->change();
        });
    }
};
