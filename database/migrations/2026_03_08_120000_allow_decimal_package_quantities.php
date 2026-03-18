<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('package_items', function (Blueprint $table) {
            $table->decimal('quantity', 12, 1)->change();
        });

        Schema::table('inventory_transaction_lines', function (Blueprint $table) {
            $table->decimal('quantity', 12, 1)->change();
        });

        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('stock_initial', 12, 1)->default(0)->change();
            $table->decimal('stock_current', 12, 1)->default(0)->change();
        });

        Schema::table('sales_order_lines', function (Blueprint $table) {
            $table->decimal('shipped_quantity', 12, 1)->default(0)->change();
        });

        Schema::table('procurement_order_lines', function (Blueprint $table) {
            $table->decimal('suggested_quantity', 12, 1)->default(0)->change();
            $table->decimal('ordered_quantity', 12, 1)->change();
            $table->decimal('received_quantity', 12, 1)->default(0)->change();
            $table->decimal('rejected_quantity', 12, 1)->default(0)->change();
        });

        Schema::table('crn_items', function (Blueprint $table) {
            $table->decimal('expected_qty', 12, 1)->change();
            $table->decimal('received_qty', 12, 1)->default(0)->change();
            $table->decimal('rejected_qty', 12, 1)->default(0)->change();
        });

        Schema::table('rejected_items', function (Blueprint $table) {
            $table->decimal('quantity', 12, 1)->change();
        });
    }

    public function down(): void
    {
        DB::table('rejected_items')->update([
            'quantity' => DB::raw('ROUND(quantity, 0)'),
        ]);

        DB::table('crn_items')->update([
            'expected_qty' => DB::raw('ROUND(expected_qty, 0)'),
            'received_qty' => DB::raw('ROUND(received_qty, 0)'),
            'rejected_qty' => DB::raw('ROUND(rejected_qty, 0)'),
        ]);

        DB::table('procurement_order_lines')->update([
            'suggested_quantity' => DB::raw('ROUND(suggested_quantity, 0)'),
            'ordered_quantity' => DB::raw('ROUND(ordered_quantity, 0)'),
            'received_quantity' => DB::raw('ROUND(received_quantity, 0)'),
            'rejected_quantity' => DB::raw('ROUND(rejected_quantity, 0)'),
        ]);

        DB::table('item_variants')->update([
            'stock_initial' => DB::raw('ROUND(stock_initial, 0)'),
            'stock_current' => DB::raw('ROUND(stock_current, 0)'),
        ]);

        DB::table('sales_order_lines')->update([
            'shipped_quantity' => DB::raw('ROUND(shipped_quantity, 0)'),
        ]);

        DB::table('inventory_transaction_lines')->update([
            'quantity' => DB::raw('ROUND(quantity, 0)'),
        ]);

        DB::table('package_items')->update([
            'quantity' => DB::raw('ROUND(quantity, 0)'),
        ]);

        Schema::table('rejected_items', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->change();
        });

        Schema::table('crn_items', function (Blueprint $table) {
            $table->unsignedInteger('expected_qty')->change();
            $table->unsignedInteger('received_qty')->default(0)->change();
            $table->unsignedInteger('rejected_qty')->default(0)->change();
        });

        Schema::table('procurement_order_lines', function (Blueprint $table) {
            $table->unsignedInteger('suggested_quantity')->default(0)->change();
            $table->unsignedInteger('ordered_quantity')->change();
            $table->unsignedInteger('received_quantity')->default(0)->change();
            $table->unsignedInteger('rejected_quantity')->default(0)->change();
        });

        Schema::table('item_variants', function (Blueprint $table) {
            $table->integer('stock_initial')->default(0)->change();
            $table->integer('stock_current')->default(0)->change();
        });

        Schema::table('sales_order_lines', function (Blueprint $table) {
            $table->unsignedInteger('shipped_quantity')->default(0)->change();
        });

        Schema::table('inventory_transaction_lines', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->change();
        });

        Schema::table('package_items', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->change();
        });
    }
};
