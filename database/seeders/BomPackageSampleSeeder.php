<?php

namespace Database\Seeders;

use App\Models\Bom;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Package;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BomPackageSampleSeeder extends Seeder
{
    public function run(): void
    {
        $userId = User::query()->orderBy('id')->value('id');

        if (! $userId) {
            $this->command->error('No user found. Please seed users first.');
            return;
        }

        $itemsByScope = [
            Bom::TYPE_CABIN => [
                ['sku' => 'CBN-SKU-001', 'name' => 'Cabin Component 01', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-002', 'name' => 'Cabin Component 02', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-003', 'name' => 'Cabin Component 03', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-004', 'name' => 'Cabin Component 04', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-005', 'name' => 'Cabin Component 05', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-006', 'name' => 'Cabin Component 06', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-007', 'name' => 'Cabin Component 07', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-008', 'name' => 'Cabin Component 08', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-009', 'name' => 'Cabin Component 09', 'unit' => 'pcs'],
                ['sku' => 'CBN-SKU-010', 'name' => 'Cabin Component 10', 'unit' => 'pcs'],
            ],
            Bom::TYPE_HARDWARE => [
                ['sku' => 'HDW-SKU-001', 'name' => 'Hardware Component 01', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-002', 'name' => 'Hardware Component 02', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-003', 'name' => 'Hardware Component 03', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-004', 'name' => 'Hardware Component 04', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-005', 'name' => 'Hardware Component 05', 'unit' => 'set'],
                ['sku' => 'HDW-SKU-006', 'name' => 'Hardware Component 06', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-007', 'name' => 'Hardware Component 07', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-008', 'name' => 'Hardware Component 08', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-009', 'name' => 'Hardware Component 09', 'unit' => 'pcs'],
                ['sku' => 'HDW-SKU-010', 'name' => 'Hardware Component 10', 'unit' => 'pcs'],
            ],
            Bom::TYPE_HARDWARE_SITE => [
                ['sku' => 'HDS-SKU-001', 'name' => 'Hardware Site Component 01', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-002', 'name' => 'Hardware Site Component 02', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-003', 'name' => 'Hardware Site Component 03', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-004', 'name' => 'Hardware Site Component 04', 'unit' => 'roll'],
                ['sku' => 'HDS-SKU-005', 'name' => 'Hardware Site Component 05', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-006', 'name' => 'Hardware Site Component 06', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-007', 'name' => 'Hardware Site Component 07', 'unit' => 'set'],
                ['sku' => 'HDS-SKU-008', 'name' => 'Hardware Site Component 08', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-009', 'name' => 'Hardware Site Component 09', 'unit' => 'pcs'],
                ['sku' => 'HDS-SKU-010', 'name' => 'Hardware Site Component 10', 'unit' => 'pcs'],
            ],
        ];

        DB::transaction(function () use ($itemsByScope, $userId) {
            foreach ($itemsByScope as $scope => $rows) {
                foreach ($rows as $row) {
                    $item = Item::updateOrCreate(
                        ['sku' => $row['sku']],
                        [
                            'name' => $row['name'],
                            'length_m' => null,
                            'unit' => $row['unit'],
                            'bom_scope' => $scope,
                            'created_by' => $userId,
                        ]
                    );

                    ItemVariant::firstOrCreate(
                        ['item_id' => $item->id, 'color' => null],
                        ['stock_initial' => 0, 'stock_current' => 0]
                    );
                }
            }

            for ($i = 1; $i <= 10; $i++) {
                $code = sprintf('BOM-DEMO-%02d', $i);

                $package = Package::updateOrCreate(
                    ['code' => $code],
                    [
                        'name' => 'BOM Demo Package ' . $i,
                        'is_active' => true,
                        'created_by' => $userId,
                    ]
                );

                $bomLines = [
                    Bom::TYPE_CABIN => collect(range(1, 10))->map(function ($n) use ($i) {
                        return [
                            'sku' => sprintf('CBN-SKU-%03d', $n),
                            'qty' => (float) (($i % 3) + $n),
                        ];
                    })->all(),
                    Bom::TYPE_HARDWARE => collect(range(1, 10))->map(function ($n) use ($i) {
                        return [
                            'sku' => sprintf('HDW-SKU-%03d', $n),
                            'qty' => (float) (($i % 4) + $n),
                        ];
                    })->all(),
                    Bom::TYPE_HARDWARE_SITE => collect(range(1, 10))->map(function ($n) use ($i) {
                        return [
                            'sku' => sprintf('HDS-SKU-%03d', $n),
                            'qty' => (float) (($i % 2) + $n),
                        ];
                    })->all(),
                ];

                $package->boms()->delete();

                foreach ($bomLines as $type => $lines) {
                    $bom = $package->boms()->create([
                        'code' => $package->code . '-' . strtoupper($type),
                        'name' => ucfirst(str_replace('_', ' ', $type)) . ' - ' . $package->name,
                        'is_active' => true,
                        'type' => $type,
                    ]);

                    foreach ($lines as $line) {
                        $item = Item::query()->where('sku', $line['sku'])->first();
                        if (! $item) {
                            continue;
                        }

                        $bom->bomItems()->create([
                            'item_id' => $item->id,
                            'quantity' => (float) $line['qty'],
                        ]);
                    }
                }

                $aggregated = $package->boms()
                    ->with('bomItems')
                    ->get()
                    ->flatMap(fn ($bom) => $bom->bomItems)
                    ->groupBy('item_id')
                    ->map(function ($rows, $itemId) {
                        return [
                            'item_id' => (int) $itemId,
                            'quantity' => (float) collect($rows)->sum('quantity'),
                        ];
                    })
                    ->values()
                    ->all();

                $package->packageItems()->delete();
                if ($aggregated !== []) {
                    $package->packageItems()->createMany($aggregated);
                }
            }
        });

        $this->command->info('BOM sample seeded: 30 SKUs + 10 demo packages (10 SKU per BOM).');
    }
}
