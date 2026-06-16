<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('fifo_cost_layers', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->after('exchange_rate');
        });
    }

    public function down(): void
    {
        Schema::table('fifo_cost_layers', function (Blueprint $table) {
            $table->dropColumn('invoice_number');
        });
    }
};
