<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_users_route_renders_for_user_with_admin_users_module(): void
    {
        $this->withMiddleware();

        $admin = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['admin_users'],
        ]);

        User::factory()->create([
            'name' => 'Managed Staff',
            'email' => 'managed.staff@example.com',
            'role' => User::ROLE_PROCUREMENT,
            'module_permissions' => ['procurement_cabin'],
        ]);

        $response = $this->actingAs($admin)->get('/admin/users');

        $response->assertOk();
        $response->assertSee('Admin\\/UserManagement', false);
        $response->assertSee('Managed Staff');
        $response->assertSee('admin_users');
    }

    public function test_admin_users_route_forbids_user_without_admin_users_module(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_STORE_KEEPER,
            'module_permissions' => ['stock_list'],
        ]);

        $response = $this->actingAs($user)->get('/admin/users');

        $response->assertForbidden();
    }

    public function test_admin_users_route_allows_super_admin_without_explicit_module_permission(): void
    {
        $this->withMiddleware();

        $superAdmin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
            'module_permissions' => [],
        ]);

        $response = $this->actingAs($superAdmin)->get('/admin/users');

        $response->assertOk();
        $response->assertSee('Admin\\/UserManagement', false);
    }
}