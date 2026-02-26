<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdmin = User::updateOrCreate([
            'email' => 'admin@arabina.com',
        ], [
            'name' => 'Super Admin',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => User::ROLE_SUPER_ADMIN,
            'email_verified_at' => now(),
        ]);

        User::updateOrCreate([
            'email' => 'user@arabina.com',
        ], [
            'name' => 'Store Keeper User',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => User::ROLE_STORE_KEEPER,
            'created_by' => $superAdmin->id,
            'email_verified_at' => now(),
        ]);
    }
}
