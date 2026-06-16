<?php

namespace Tests\Feature;

use App\Models\ProcessLog;
use App\Models\User;
use App\Services\ProcessLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcessLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanitize_context_masks_sensitive_string_values(): void
    {
        $context = [
            'email' => 'user@example.com',
            'phone' => '0123456789',
            'ic' => '900101-01-1234',
            'password' => 'secret123',
            'normal_key' => 'visible',
        ];

        $result = ProcessLogger::sanitizeContextForDisplay($context);

        $this->assertSame('*** HIDDEN ***', $result['email']);
        $this->assertSame('*** HIDDEN ***', $result['phone']);
        $this->assertSame('*** HIDDEN ***', $result['ic']);
        $this->assertSame('*** HIDDEN ***', $result['password']);
        $this->assertSame('visible', $result['normal_key']);
    }

    public function test_sanitize_context_masks_numeric_sensitive_values(): void
    {
        $context = [
            'phone' => 1234567890,
            'ic' => 900101011234,
            'otp' => 123456,
            'pin' => 5678,
        ];

        $result = ProcessLogger::sanitizeContextForDisplay($context);

        $this->assertSame('*** HIDDEN ***', $result['phone']);
        $this->assertSame('*** HIDDEN ***', $result['ic']);
        $this->assertSame('*** HIDDEN ***', $result['otp']);
        $this->assertSame('*** HIDDEN ***', $result['pin']);
    }

    public function test_sanitize_context_works_recursively(): void
    {
        $context = [
            'user' => [
                'email' => 'nested@example.com',
                'phone' => 123456789,
            ],
            'meta' => [
                'deep' => [
                    'token' => 'abc123',
                ],
            ],
        ];

        $result = ProcessLogger::sanitizeContextForDisplay($context);

        $this->assertSame('*** HIDDEN ***', $result['user']['email']);
        $this->assertSame('*** HIDDEN ***', $result['user']['phone']);
        $this->assertSame('*** HIDDEN ***', $result['meta']['deep']['token']);
    }

    public function test_sanitize_context_returns_null_for_null(): void
    {
        $this->assertNull(ProcessLogger::sanitizeContextForDisplay(null));
    }

    public function test_sanitize_context_truncates_large_context(): void
    {
        $largeContext = [
            'data' => str_repeat('x', 10000),
        ];

        $result = ProcessLogger::sanitizeContextForDisplay($largeContext);

        $this->assertArrayHasKey('_warning', $result);
        $this->assertArrayHasKey('_original_size', $result);
        $this->assertStringContainsString('truncated', $result['_warning']);
    }

    public function test_isEnabled_returns_true_by_default(): void
    {
        $this->assertTrue(ProcessLogger::isEnabled());
    }

    public function test_isEnabled_returns_false_when_config_disabled(): void
    {
        config(['processlog.enabled' => false]);
        $this->assertFalse(ProcessLogger::isEnabled());
        config(['processlog.enabled' => true]);
    }

    public function test_getRequestId_falls_back_to_uuid(): void
    {
        $requestId = ProcessLogger::getRequestId();
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $requestId);
    }

    public function test_insert_log_creates_process_log_entry(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_STORE_KEEPER]);
        $this->actingAs($user);

        ProcessLogger::start('TestModule', 'TestProcess', 'test_step', ['key' => 'value']);

        $this->assertDatabaseHas('process_logs', [
            'module' => 'TestModule',
            'process' => 'TestProcess',
            'step' => 'test_step',
            'status' => 'start',
            'level' => 'info',
            'actor_id' => $user->id,
        ]);
    }

    public function test_fail_log_hides_error_details_in_production(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_STORE_KEEPER]);
        $this->actingAs($user);

        $error = new \RuntimeException('Test error', 500);

        app()->detectEnvironment(fn () => 'production');
        ProcessLogger::fail('Test', 'FailProcess', 'step', $error);
        app()->detectEnvironment(fn () => 'testing');

        $this->assertDatabaseHas('process_logs', [
            'process' => 'FailProcess',
            'error_message' => 'Test error',
            'error_code' => 500,
        ]);

        $log = ProcessLog::where('process', 'FailProcess')->first();
        $this->assertNull($log->error_file);
        $this->assertNull($log->error_line);
        $this->assertNull($log->stack_trace);
    }

    public function test_sanitize_context_keys_are_case_insensitive(): void
    {
        $context = [
            'EMAIL' => 'upper@example.com',
            'Phone' => '0123456789',
            'IC' => '900101-01-1234',
        ];

        $result = ProcessLogger::sanitizeContextForDisplay($context);

        $this->assertSame('*** HIDDEN ***', $result['EMAIL']);
        $this->assertSame('*** HIDDEN ***', $result['Phone']);
        $this->assertSame('*** HIDDEN ***', $result['IC']);
    }
}
