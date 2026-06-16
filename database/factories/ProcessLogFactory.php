<?php

namespace Database\Factories;

use App\Models\ProcessLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProcessLogFactory extends Factory
{
    protected $model = ProcessLog::class;

    public function definition(): array
    {
        return [
            'request_id' => $this->faker->uuid(),
            'level' => $this->faker->randomElement(['info', 'warning', 'error']),
            'module' => $this->faker->randomElement(['Auth', 'System', 'Procurement']),
            'process' => $this->faker->word(),
            'status' => $this->faker->randomElement(['start', 'success', 'fail', 'completed']),
            'actor_id' => User::factory(),
            'endpoint' => $this->faker->url(),
            'method' => 'GET',
            'ip_address' => $this->faker->ipv4(),
            'environment' => 'testing',
            'message' => $this->faker->sentence(),
        ];
    }
}
