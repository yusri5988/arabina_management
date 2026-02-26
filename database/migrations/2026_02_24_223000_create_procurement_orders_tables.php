<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procurement_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('status')->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('procurement_order_package_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('procurement_order_id')->constrained('procurement_orders')->cascadeOnDelete();
            $table->foreignId('package_id')->constrained('packages')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->unique(['procurement_order_id', 'package_id'], 'uniq_procurement_order_package');
        });

        Schema::create('procurement_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('procurement_order_id')->constrained('procurement_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->unsignedInteger('suggested_quantity')->default(0);
            $table->unsignedInteger('ordered_quantity');
            $table->unsignedInteger('received_quantity')->default(0);
            $table->unsignedInteger('rejected_quantity')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['procurement_order_id', 'item_id'], 'uniq_procurement_order_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_order_lines');
        Schema::dropIfExists('procurement_order_package_lines');
        Schema::dropIfExists('procurement_orders');
    }
};
