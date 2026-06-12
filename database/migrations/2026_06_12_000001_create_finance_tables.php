<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add cost fields to receiving note items
        $this->addCostColumnsToReceivingItems();

        // 2. Add currency/exchange rate to procurement_orders
        Schema::table('procurement_orders', function (Blueprint $table) {
            $table->string('currency', 3)->default('MYR')->after('procurement_scope');
            $table->decimal('exchange_rate', 12, 6)->nullable()->after('currency');
        });

        // 3. Add average_cost / total_stock_value to item_variants
        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('average_cost', 12, 2)->default(0)->after('stock_current');
            $table->decimal('total_stock_value', 14, 2)->default(0)->after('average_cost');
        });

        // 4. Create fifo_cost_layers table
        Schema::create('fifo_cost_layers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('item_variant_id');
            $table->unsignedBigInteger('inventory_transaction_line_id');
            $table->decimal('quantity', 12, 1);
            $table->decimal('quantity_consumed', 12, 1)->default(0);
            $table->decimal('unit_cost', 12, 2);
            $table->string('currency', 3)->default('MYR');
            $table->decimal('exchange_rate', 12, 6)->nullable();
            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();

            $table->foreign('item_variant_id')
                ->references('id')
                ->on('item_variants')
                ->onDelete('cascade');

            $table->foreign('inventory_transaction_line_id')
                ->references('id')
                ->on('inventory_transaction_lines')
                ->onDelete('cascade');

            $table->index(['item_variant_id', 'received_at']);
        });

        // 5. Create payment_transactions table
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('procurement_order_id');
            $table->date('payment_date');
            $table->decimal('amount_foreign', 14, 2);
            $table->string('foreign_currency', 3);
            $table->decimal('actual_exchange_rate', 12, 6);
            $table->decimal('amount_myr', 14, 2);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->foreign('procurement_order_id')
                ->references('id')
                ->on('procurement_orders')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('fifo_cost_layers');

        Schema::table('item_variants', function (Blueprint $table) {
            $table->dropColumn(['average_cost', 'total_stock_value']);
        });

        Schema::table('procurement_orders', function (Blueprint $table) {
            $table->dropColumn(['currency', 'exchange_rate']);
        });

        $this->dropCostColumnsFromReceivingItems();
    }

    private function addCostColumnsToReceivingItems(): void
    {
        $tables = [
            'crn_items',
            'material_receiving_note_items',
            'site_receiving_note_items',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->decimal('unit_cost', 12, 2)->nullable()->after('rejection_reason');
                $table->string('currency', 3)->default('MYR')->after('unit_cost');
                $table->string('invoice_number', 255)->nullable()->after('currency');
                $table->decimal('exchange_rate', 12, 6)->nullable()->after('invoice_number');
            });
        }
    }

    private function dropCostColumnsFromReceivingItems(): void
    {
        $tables = [
            'crn_items',
            'material_receiving_note_items',
            'site_receiving_note_items',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn(['unit_cost', 'currency', 'invoice_number', 'exchange_rate']);
            });
        }
    }
};
