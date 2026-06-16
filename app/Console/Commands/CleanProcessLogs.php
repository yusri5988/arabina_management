<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProcessLog;
use Carbon\Carbon;

class CleanProcessLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logs:clean-process {--days= : The number of days to retain logs}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up old process logs based on retention policy';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = $this->option('days') ?: config('processlog.retention_days', 30);

        if (!is_numeric($days) || $days <= 0) {
            $this->error('Retention days must be a positive integer.');
            return 1;
        }

        $date = Carbon::now()->subDays((int)$days);

        $this->info("Deleting process logs older than {$days} days ({$date->toDateTimeString()})...");

        $deletedCount = ProcessLog::where('created_at', '<', $date)->delete();

        $this->info("Successfully deleted {$deletedCount} old process log(s).");

        return 0;
    }
}
