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
        Schema::table('items', function (Blueprint $table) {
            $table->string('supplier')->nullable()->after('bom_scope');
        });

        Schema::table('procurement_orders', function (Blueprint $table) {
            $table->string('supplier_name')->nullable()->after('status');
            $table->string('procurement_scope')->nullable()->after('supplier_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('supplier');
        });

        Schema::table('procurement_orders', function (Blueprint $table) {
            $table->dropColumn(['supplier_name', 'procurement_scope']);
        });
    }
};
