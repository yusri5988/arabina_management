<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procurement_order_sales_order', function (Blueprint $table) {
            $table->id();
            $table->foreignId('procurement_order_id')->constrained('procurement_orders')->cascadeOnDelete();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['procurement_order_id', 'sales_order_id'], 'uniq_procurement_sales_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_order_sales_order');
    }
};
