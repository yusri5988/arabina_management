<?php

namespace App\Console\Commands;

use App\Models\Package;
use Illuminate\Console\Command;

class InventoryBomBreakdown extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:bom-breakdown {package_code? : Optional package code to filter}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'List SKUs and their BOM breakdown by Package';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $packageCode = $this->argument('package_code');

        $query = Package::with([
            'packageItems.item',
            'boms.bomItems.item',
        ]);

        if ($packageCode) {
            $query->where('code', $packageCode);
        }

        $packages = $query->orderBy('code')->get();

        if ($packages->isEmpty()) {
            $this->error('No packages found.');
            return;
        }

        foreach ($packages as $package) {
            $this->newLine();
            $this->info("================================================================================");
            $this->info("PACKAGE: [{$package->code}] {$package->name}");
            $this->info("================================================================================");

            // 1. Direct Package Items
            if ($package->packageItems->isNotEmpty()) {
                $this->comment("DIRECT PACKAGE ITEMS:");
                $itemsTable = $package->packageItems->map(fn($pi) => [
                    'SKU' => $pi->item?->sku ?? 'N/A',
                    'Name' => $pi->item?->name ?? 'N/A',
                    'Quantity' => number_format($pi->quantity, 1),
                ]);
                $this->table(['SKU', 'Name', 'Qty'], $itemsTable);
            } else {
                $this->line("No direct package items.");
            }

            // 2. BOM Breakdowns
            if ($package->boms->isNotEmpty()) {
                foreach ($package->boms as $bom) {
                    $this->newLine();
                    $this->warn("BOM [{$bom->type}]: [{$bom->code}] {$bom->name}");
                    
                    if ($bom->bomItems->isNotEmpty()) {
                        $bomItemsTable = $bom->bomItems->map(fn($bi) => [
                            'SKU' => $bi->item?->sku ?? 'N/A',
                            'Name' => $bi->item?->name ?? 'N/A',
                            'Quantity' => number_format($bi->quantity, 1),
                        ]);
                        $this->table(['SKU', 'Name', 'Qty'], $bomItemsTable);
                    } else {
                        $this->line("   No items in this BOM.");
                    }
                }
            } else {
                $this->newLine();
                $this->line("No BOMs defined for this package.");
            }
        }

        $this->newLine();
        $this->info("Done.");
    }
}
