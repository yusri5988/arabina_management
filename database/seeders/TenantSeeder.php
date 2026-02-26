<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant;

class TenantSeeder extends Seeder
{
    public function run()
    {
        Tenant::create([
            'slug' => 'warungbambam',
            'name' => 'Warung BamBam',
            'capacity_per_day' => 50,
            'price' => 35.00,
            'policy' => 'Sila datang 10 minit awal. No refund.',
            'password' => '12345678', // Simple password for MVP
        ]);

        Tenant::create([
            'slug' => 'test-kitchen',
            'name' => 'Test Kitchen',
            'capacity_per_day' => 10,
            'password' => 'password',
        ]);
    }
}
