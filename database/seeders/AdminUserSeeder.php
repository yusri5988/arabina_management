<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@arabina.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('123456'),
                'role' => 'super_admin',
            ]
        );
    }
}
