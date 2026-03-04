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
        Schema::rename('contena_receiving_notes', 'container_receiving_notes');
    }

    public function down(): void
    {
        Schema::rename('container_receiving_notes', 'contena_receiving_notes');
    }
};
