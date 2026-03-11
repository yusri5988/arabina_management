<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

class ProcurementSupplierTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Prepare Items with different suppliers
        $itemA = Item::where('bom_scope', 'hardware')->first();
        if ($itemA) {
            $itemA->update(['supplier' => 'Supplier A']);
            echo "Item A (SKU: {$itemA->sku}) set to Supplier A\n";
        }

        $itemB = Item::where('bom_scope', 'hardware')->skip(1)->first();
        if ($itemB) {
            $itemB->update(['supplier' => 'Supplier B']);
            echo "Item B (SKU: {$itemB->sku}) set to Supplier B\n";
        }

        echo "Test data prepared. Please try submitting a hardware procurement with these two SKUs.\n";
    }
}
