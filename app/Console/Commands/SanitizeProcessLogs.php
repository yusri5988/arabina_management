<?php

namespace App\Console\Commands;

use App\Models\ProcessLog;
use App\Services\ProcessLogger;
use Illuminate\Console\Command;

class SanitizeProcessLogs extends Command
{
    protected $signature = 'logs:sanitize-process
                            {--dry-run : Show affected rows without saving}';

    protected $description = 'Re-sanitize context data in existing process logs to ensure sensitive keys are masked';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $total = ProcessLog::whereNotNull('context')->count();
        $updated = 0;

        $this->info("Found {$total} process log(s) with context data.");

        if ($total === 0) {
            return 0;
        }

        $progress = $this->output->createProgressBar($total);
        $progress->start();

        ProcessLog::whereNotNull('context')
            ->chunkById(200, function ($logs) use ($dryRun, &$updated, $progress) {
                foreach ($logs as $log) {
                    $context = $log->getRawOriginal('context');
                    if ($context === null) {
                        $progress->advance();
                        continue;
                    }

                    $decoded = json_decode($context, true);
                    if (!is_array($decoded)) {
                        $progress->advance();
                        continue;
                    }

                    $sanitized = ProcessLogger::sanitizeContextForDisplay($decoded);

                    if ($sanitized === $decoded) {
                        $progress->advance();
                        continue;
                    }

                    $updated++;

                    if (!$dryRun) {
                        $log->timestamps = false;
                        $log->context = $sanitized;
                        $log->save();
                    }

                    $progress->advance();
                }
            });

        $progress->finish();
        $this->newLine();

        if ($dryRun) {
            $this->info("[DRY-RUN] Would sanitize {$updated} log(s). Run without --dry-run to apply.");
        } else {
            $this->info("Successfully sanitized {$updated} log(s).");
        }

        return 0;
    }
}
