<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('boms')) {
            Schema::create('boms', function (Blueprint $table) {
                $table->id();
                $table->string('code', 100)->nullable();
                $table->string('name')->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
                $table->string('type', 32);
                $table->timestamps();

                $table->unique(['package_id', 'type']);
            });
        }

        if (! Schema::hasTable('bom_items')) {
            Schema::create('bom_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bom_id')->constrained('boms')->cascadeOnDelete();
                $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
                $table->decimal('quantity', 12, 1);
                $table->timestamps();

                $table->unique(['bom_id', 'item_id']);
                $table->index(['item_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_items');
        Schema::dropIfExists('boms');
    }
};
