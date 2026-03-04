<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('contena_receiving_notes', function (Blueprint $table) {
            $table->date('eta')->nullable()->after('status');
            $table->string('status')->default('awaiting_shipping')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contena_receiving_notes', function (Blueprint $table) {
            $table->dropColumn('eta');
        });
    }
};
