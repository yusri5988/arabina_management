<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // in | out
            $table->string('mode'); // package | alacarte
            $table->foreignId('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $table->unsignedInteger('package_quantity')->nullable();
            $table->foreignId('sales_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_transaction_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_transaction_id')->constrained('inventory_transactions')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_transaction_lines');
        Schema::dropIfExists('inventory_transactions');
    }
};
