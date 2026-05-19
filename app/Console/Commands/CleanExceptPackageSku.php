<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanExceptPackageSku extends Command
{
    protected $signature = 'app:clean-except-package-sku';
    protected $description = 'Truncate all tables except packages, items, and related master data';

    public function handle()
    {
        $this->warn('This will delete ALL transactional data. Master data (packages, items, users) will be kept.');

        if (!$this->confirm('Continue?')) {
            return Command::FAILURE;
        }

        $keep = [
            'users', 'password_reset_tokens',
            'items', 'item_variants',
            'packages', 'package_items',
            'boms', 'bom_items',
            'suppliers',
            'migrations',
        ];

        $tables = DB::select('SHOW TABLES');
        $dbName = DB::getDatabaseName();
        $key = "Tables_in_{$dbName}";

        $toTruncate = [];
        foreach ($tables as $table) {
            $name = $table->$key;
            if (!in_array($name, $keep)) {
                $toTruncate[] = $name;
            }
        }

        $this->info('Tables to truncate: ' . count($toTruncate));
        $this->line(implode(', ', $toTruncate));

        if (!$this->confirm('Proceed with truncation?')) {
            return Command::FAILURE;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ($toTruncate as $table) {
            DB::table($table)->truncate();
            $this->line("  ✓ {$table}");
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->info('Done. All transactional data cleared. Master data preserved.');
        return Command::SUCCESS;
    }
}
