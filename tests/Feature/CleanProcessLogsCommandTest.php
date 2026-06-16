<?php

namespace Tests\Feature;

use App\Models\ProcessLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CleanProcessLogsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_deletes_old_logs(): void
    {
        ProcessLog::factory()->create(['created_at' => Carbon::now()->subDays(60)]);
        ProcessLog::factory()->create(['created_at' => Carbon::now()->subDays(15)]);
        ProcessLog::factory()->create(['created_at' => Carbon::now()]);

        $this->artisan('logs:clean-process', ['--days' => 30])
            ->expectsOutputToContain('deleted 1 old process log(s)')
            ->assertSuccessful();

        $this->assertDatabaseCount('process_logs', 2);
    }

    public function test_command_uses_config_default_days(): void
    {
        config(['processlog.retention_days' => 10]);

        ProcessLog::factory()->create(['created_at' => Carbon::now()->subDays(20)]);
        ProcessLog::factory()->create(['created_at' => Carbon::now()]);

        $this->artisan('logs:clean-process')
            ->expectsOutputToContain('deleted 1 old process log(s)')
            ->assertSuccessful();

        $this->assertDatabaseCount('process_logs', 1);
    }

    public function test_command_fails_with_invalid_days(): void
    {
        $this->artisan('logs:clean-process', ['--days' => -1])
            ->expectsOutputToContain('Retention days must be a positive integer')
            ->assertExitCode(1);
    }

    public function test_command_handles_empty_table(): void
    {
        $this->artisan('logs:clean-process')
            ->assertSuccessful();

        $this->assertDatabaseCount('process_logs', 0);
    }
}
