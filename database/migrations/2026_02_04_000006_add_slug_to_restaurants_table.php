<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
        });

        DB::table('restaurants')
            ->whereNull('slug')
            ->orWhere('slug', '')
            ->orderBy('id')
            ->get()
            ->each(function ($restaurant) {
                $base = Str::slug($restaurant->name) ?: 'restaurant';
                $slug = $base;
                $counter = 1;
                while (DB::table('restaurants')->where('slug', $slug)->exists()) {
                    $slug = $base.'-'.$counter;
                    $counter++;
                }
                DB::table('restaurants')->where('id', $restaurant->id)->update(['slug' => $slug]);
            });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
