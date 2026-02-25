<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->decimal('length_m', 8, 2)->nullable();
            $table->string('unit')->default('pcs'); // pcs, set
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('item_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('color')->nullable();
            $table->integer('stock_initial')->default(0);
            $table->integer('stock_current')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_variants');
        Schema::dropIfExists('items');
    }
};
