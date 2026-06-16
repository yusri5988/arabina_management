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
        Schema::create('process_logs', function (Blueprint $table) {
            $table->id();
            $table->string('request_id')->index();
            $table->string('trace_id')->nullable()->index();
            $table->string('level')->index(); // info, warning, error
            $table->string('module')->nullable()->index();
            $table->string('process')->index();
            $table->string('step')->nullable();
            $table->string('status')->index(); // start, success, fail, completed
            
            $table->unsignedBigInteger('actor_id')->nullable()->index();
            $table->string('related_type')->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            
            $table->string('endpoint')->nullable();
            $table->string('method')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            
            $table->integer('duration_ms')->nullable();
            $table->text('message')->nullable();
            $table->json('context')->nullable();
            
            $table->text('error_message')->nullable();
            $table->string('error_code')->nullable();
            $table->string('error_file')->nullable();
            $table->string('error_line')->nullable();
            $table->string('error_class')->nullable();
            $table->string('error_function')->nullable();
            $table->longText('stack_trace')->nullable();
            
            $table->string('environment')->nullable();

            $table->timestamps();

            // Composite index for polymorphic relations
            $table->index(['related_type', 'related_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('process_logs');
    }
};
