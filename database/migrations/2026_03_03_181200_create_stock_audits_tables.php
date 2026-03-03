<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audited_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('audited_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('audited_at');
        });

        Schema::create('stock_audit_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_audit_id')->constrained('stock_audits')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->restrictOnDelete();
            $table->integer('stock_before')->default(0);
            $table->integer('audited_stock')->default(0);
            $table->integer('diff_quantity')->default(0);
            $table->integer('short_quantity')->default(0);
            $table->timestamps();

            $table->index(['stock_audit_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_audit_lines');
        Schema::dropIfExists('stock_audits');
    }
};
