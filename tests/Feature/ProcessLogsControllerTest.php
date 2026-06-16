<?php

namespace Tests\Feature;

use App\Models\ProcessLog;
use App\Models\User;
use App\Services\ProcessLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcessLogsControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['admin_logs'],
        ]);
    }

    public function test_process_logs_route_redirects_unauthenticated(): void
    {
        $this->withMiddleware();
        $response = $this->get('/admin/process-logs');

        $response->assertRedirect('/login');
    }

    public function test_process_logs_route_forbids_without_module(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['item_catalog'],
        ]);

        $response = $this->actingAs($user)->get('/admin/process-logs');

        $response->assertForbidden();
    }

    public function test_process_logs_returns_inertia_page(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->create([
            'module' => 'TestModule',
            'process' => 'TestProcess',
            'status' => 'success',
            'level' => 'info',
            'message' => 'Test message',
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/ProcessLogs')
            ->has('logs.data', 1)
            ->has('actors')
            ->has('filters')
        );
    }

    public function test_process_logs_excludes_stack_trace(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->create([
            'stack_trace' => 'This is a sensitive stack trace',
            'context' => ['key' => 'value'],
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->missing('logs.data.0.stack_trace')
        );
    }

    public function test_process_logs_sanitizes_context(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->create([
            'context' => ['email' => 'leak@example.com', 'phone' => 123456789, 'normal' => 'ok'],
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->where('logs.data.0.context.email', '*** HIDDEN ***')
            ->where('logs.data.0.context.phone', '*** HIDDEN ***')
            ->where('logs.data.0.context.normal', 'ok')
        );
    }

    public function test_process_logs_hides_error_file_and_line_from_non_developer(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->create([
            'error_file' => '/var/www/app/SomeController.php',
            'error_line' => 42,
            'error_class' => 'RuntimeException',
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->where('logs.data.0.error_file', null)
            ->where('logs.data.0.error_line', null)
            ->where('logs.data.0.error_class', 'RuntimeException')
        );
    }

    public function test_process_logs_shows_error_file_and_line_for_developer(): void
    {
        $this->withMiddleware();

        $dev = User::factory()->create([
            'role' => User::ROLE_DEVELOPER,
            'module_permissions' => ['admin_logs'],
        ]);

        ProcessLog::factory()->create([
            'error_file' => '/var/www/app/SomeController.php',
            'error_line' => 42,
            'error_class' => 'RuntimeException',
        ]);

        $response = $this->actingAs($dev)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->where('logs.data.0.error_file', '/var/www/app/SomeController.php')
            ->where('logs.data.0.error_line', '42')
        );
    }

    public function test_process_logs_date_filter_uses_range(): void
    {
        $this->withMiddleware();

        $todayLog = ProcessLog::factory()->create(['created_at' => now()]);
        $yesterdayLog = ProcessLog::factory()->create(['created_at' => now()->subDay()]);
        $tomorrowLog = ProcessLog::factory()->create(['created_at' => now()->addDay()]);

        $today = now()->format('Y-m-d');
        $response = $this->actingAs($this->adminUser)->get("/admin/process-logs?date={$today}");

        $response->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.id', $todayLog->id)
        );
    }

    public function test_process_logs_actors_list_includes_only_users_with_logs(): void
    {
        $this->withMiddleware();

        $actor = User::factory()->create(['name' => 'Actor User']);
        $noLogUser = User::factory()->create(['name' => 'No Log User']);

        ProcessLog::factory()->create(['actor_id' => $actor->id]);
        ProcessLog::factory()->create(['actor_id' => $actor->id]);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->has('actors', 1)
            ->where('actors.0.name', 'Actor User')
        );
    }

    public function test_process_logs_filters_by_module(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->create(['module' => 'Auth']);
        ProcessLog::factory()->create(['module' => 'Procurement']);

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs?module=Auth');

        $response->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.module', 'Auth')
        );
    }

    public function test_process_logs_paginates(): void
    {
        $this->withMiddleware();

        ProcessLog::factory()->count(60)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/process-logs');

        $response->assertInertia(fn ($page) => $page
            ->has('logs.data', 50)
            ->has('logs.links')
        );
    }
}
