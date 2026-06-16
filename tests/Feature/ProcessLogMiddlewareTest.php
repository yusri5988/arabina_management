<?php

namespace Tests\Feature;

use App\Models\ProcessLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcessLogMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withMiddleware();
    }

    public function test_middleware_attaches_x_request_id_header(): void
    {
        $response = $this->get('/');

        $response->assertHeader('X-Request-ID');
    }

    public function test_middleware_creates_process_logs_for_normal_route(): void
    {
        $response = $this->get('/');

        $this->assertDatabaseHas('process_logs', [
            'module' => 'System',
            'process' => 'Incoming Request',
            'status' => 'start',
        ]);

        $this->assertDatabaseHas('process_logs', [
            'module' => 'System',
            'process' => 'Outgoing Response',
            'status' => 'success',
        ]);
    }

    public function test_middleware_does_not_create_logs_for_ignored_route(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['admin_logs'],
        ]);

        $this->actingAs($user);

        $baseline = ProcessLog::count();

        $this->get('/admin/process-logs');

        $this->assertSame($baseline, ProcessLog::count(),
            'Ignored route should not create any process log entries'
        );
    }

    public function test_middleware_ignores_invalid_x_request_id(): void
    {
        $response = $this->withHeaders(['X-Request-ID' => 'not-a-uuid'])->get('/');

        $headerValue = $response->headers->get('X-Request-ID');
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $headerValue,
            'Invalid X-Request-ID should be replaced with a valid UUID'
        );
    }

    public function test_middleware_accepts_valid_x_request_id(): void
    {
        $uuid = '550e8400-e29b-41d4-a716-446655440000';

        $response = $this->withHeaders(['X-Request-ID' => $uuid])->get('/');

        $this->assertSame($uuid, $response->headers->get('X-Request-ID'));
    }

    public function test_middleware_respects_disabled_request_payload_config(): void
    {
        config(['processlog.log_request_payload' => false]);

        $this->get('/');

        $this->assertDatabaseMissing('process_logs', [
            'module' => 'System',
            'process' => 'Incoming Request',
        ]);
    }

    public function test_middleware_respects_disabled_response_config(): void
    {
        config(['processlog.log_response' => false]);

        $this->get('/');

        $this->assertDatabaseMissing('process_logs', [
            'module' => 'System',
            'process' => 'Outgoing Response',
        ]);
    }

    public function test_middleware_uses_request_attributes_in_logger(): void
    {
        $this->get('/', ['X-Request-ID' => 'aabbccdd-0011-2233-4455-66778899aabb']);

        $this->assertDatabaseHas('process_logs', [
            'request_id' => 'aabbccdd-0011-2233-4455-66778899aabb',
        ]);
    }

    public function test_middleware_respects_master_enabled_flag(): void
    {
        config(['processlog.enabled' => false]);

        $this->get('/');

        $this->assertDatabaseMissing('process_logs', [
            'module' => 'System',
            'process' => 'Incoming Request',
        ]);

        $this->assertDatabaseMissing('process_logs', [
            'module' => 'System',
            'process' => 'Outgoing Response',
        ]);
    }
}
