<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_receiving_notes', function (Blueprint $table) {
            $table->id();
            $table->string('mrn_number')->unique();
            $table->foreignId('procurement_order_id')->nullable()->constrained('procurement_orders')->nullOnDelete();
            $table->string('status')->default('draft');
            $table->date('eta')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('material_receiving_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mrn_id')->constrained('material_receiving_notes')->cascadeOnDelete();
            $table->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $table->decimal('expected_qty', 12, 1);
            $table->decimal('received_qty', 12, 1)->default(0);
            $table->decimal('rejected_qty', 12, 1)->default(0);
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('site_receiving_notes', function (Blueprint $table) {
            $table->id();
            $table->string('srn_number')->unique();
            $table->foreignId('procurement_order_id')->nullable()->constrained('procurement_orders')->nullOnDelete();
            $table->string('status')->default('draft');
            $table->date('eta')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('site_receiving_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('srn_id')->constrained('site_receiving_notes')->cascadeOnDelete();
            $table->foreignId('item_variant_id')->constrained('item_variants')->restrictOnDelete();
            $table->decimal('expected_qty', 12, 1);
            $table->decimal('received_qty', 12, 1)->default(0);
            $table->decimal('rejected_qty', 12, 1)->default(0);
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::table('rejected_items', function (Blueprint $table) {
            $table->foreignId('mrn_id')->nullable()->after('crn_id')->constrained('material_receiving_notes')->nullOnDelete();
            $table->foreignId('srn_id')->nullable()->after('mrn_id')->constrained('site_receiving_notes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rejected_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('srn_id');
            $table->dropConstrainedForeignId('mrn_id');
        });

        Schema::dropIfExists('site_receiving_note_items');
        Schema::dropIfExists('site_receiving_notes');
        Schema::dropIfExists('material_receiving_note_items');
        Schema::dropIfExists('material_receiving_notes');
    }
};
