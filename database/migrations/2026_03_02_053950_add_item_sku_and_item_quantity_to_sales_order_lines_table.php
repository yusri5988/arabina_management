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
            $table->string('item_sku')->nullable()->after('package_id');
            $table->unsignedInteger('item_quantity')->nullable()->after('item_sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_order_lines', function (Blueprint $table) {
            $table->dropColumn(['item_sku', 'item_quantity']);
        });
    }
};
