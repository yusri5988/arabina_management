<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('items', 'bom_scope')) {
            Schema::table('items', function (Blueprint $table) {
                $table->string('bom_scope', 32)->default('hardware')->after('unit');
                $table->index('bom_scope');
            });

            DB::table('items')->whereNull('bom_scope')->update([
                'bom_scope' => 'hardware',
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex(['bom_scope']);
            $table->dropColumn('bom_scope');
        });
    }
};
