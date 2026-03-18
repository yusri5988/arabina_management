<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('boms')) {
            return;
        }

        Schema::table('boms', function (Blueprint $table) {
            if (! Schema::hasColumn('boms', 'code')) {
                $table->string('code', 100)->nullable()->after('id');
            }

            if (! Schema::hasColumn('boms', 'name')) {
                $table->string('name')->nullable()->after('code');
            }

            if (! Schema::hasColumn('boms', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('name');
            }

            if (! Schema::hasColumn('boms', 'package_id')) {
                $table->foreignId('package_id')->nullable()->after('is_active')->constrained('packages')->cascadeOnDelete();
            }

            if (! Schema::hasColumn('boms', 'type')) {
                $table->string('type', 32)->nullable()->after('package_id');
            }
        });

    }

    public function down(): void
    {
        // Keep rollback non-destructive because this migration backfills legacy schemas.
    }
};
