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
        Schema::table('procurement_order_lines', function (Blueprint $table) {
            $table->string('item_unit', 50)->nullable()->after('rejected_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('procurement_order_lines', function (Blueprint $table) {
            $table->dropColumn('item_unit');
        });
    }
};
