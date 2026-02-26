<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contena_receiving_notes', function (Blueprint $table) {
            $table->id();
            $table->string('crn_number')->unique();
            $table->foreignId('procurement_order_id')->nullable()->constrained('procurement_orders')->nullOnDelete();
            $table->string('status')->default('draft'); // draft, transferred
            $table->timestamp('received_at')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('crn_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crn_id')->constrained('contena_receiving_notes')->cascadeOnDelete();
            $table->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $table->unsignedInteger('expected_qty');
            $table->unsignedInteger('received_qty')->default(0);
            $table->unsignedInteger('rejected_qty')->default(0);
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crn_items');
        Schema::dropIfExists('contena_receiving_notes');
    }
};
