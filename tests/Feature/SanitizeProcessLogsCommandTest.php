<?php

namespace Tests\Feature;

use App\Models\ProcessLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanitizeProcessLogsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_does_not_modify_data(): void
    {
        ProcessLog::factory()->create([
            'context' => ['email' => 'user@example.com', 'ic' => '900101-01-1234'],
        ]);

        $this->artisan('logs:sanitize-process', ['--dry-run' => true])
            ->assertSuccessful();

        $log = ProcessLog::first();
        $this->assertSame('user@example.com', $log->context['email'],
            'Dry run should not modify the actual data'
        );
    }

    public function test_command_sanitizes_logs_with_sensitive_data(): void
    {
        ProcessLog::factory()->create([
            'context' => ['email' => 'user@example.com', 'phone' => 123456789, 'normal' => 'keep'],
        ]);

        $this->artisan('logs:sanitize-process')
            ->expectsOutputToContain('Successfully sanitized 1 log(s)')
            ->assertSuccessful();

        $log = ProcessLog::first();
        $this->assertSame('*** HIDDEN ***', $log->context['email']);
        $this->assertSame('*** HIDDEN ***', $log->context['phone']);
        $this->assertSame('keep', $log->context['normal']);
    }

    public function test_command_skips_already_sanitized_logs(): void
    {
        ProcessLog::factory()->create([
            'context' => ['normal' => 'only_visible'],
        ]);

        $this->artisan('logs:sanitize-process')
            ->expectsOutputToContain('Successfully sanitized 0 log(s)')
            ->assertSuccessful();
    }

    public function test_command_handles_null_context(): void
    {
        ProcessLog::factory()->create(['context' => null]);

        $this->artisan('logs:sanitize-process')
            ->assertSuccessful();
    }

    public function test_command_does_not_update_timestamps(): void
    {
        $original = ProcessLog::factory()->create([
            'context' => ['email' => 'old@example.com'],
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);

        $this->artisan('logs:sanitize-process')->assertSuccessful();

        $log = $original->fresh();
        $this->assertSame('*** HIDDEN ***', $log->context['email']);
        $this->assertEquals(
            $original->updated_at->format('Y-m-d H:i:s'),
            $log->updated_at->format('Y-m-d H:i:s')
        );
    }
}
