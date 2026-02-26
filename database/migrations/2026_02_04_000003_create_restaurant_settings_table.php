<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->unique()->constrained()->onDelete('cascade');
            $table->decimal('price_child', 8, 2)->default(0);
            $table->decimal('price_adult', 8, 2)->default(0);
            $table->decimal('price_senior', 8, 2)->default(0);
            $table->integer('daily_capacity')->default(100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_settings');
    }
};
