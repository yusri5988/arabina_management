<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CsrfTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_loads()
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }

    public function test_login_fails_without_csrf()
    {
        $response = $this->call('POST', '/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors('email');
    }
}
