<?php

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$dryRun = in_array('--dry-run', $argv, true);
$args = array_values(array_filter(
    array_slice($argv, 1),
    fn (string $arg): bool => $arg !== '--dry-run'
));

$file = $args[0] ?? storage_path('app/imports/current stock BOM cabin.xlsx');

if (! is_file($file)) {
    fwrite(STDERR, "File not found: {$file}" . PHP_EOL);
    exit(1);
}

$adminId = User::query()->where('role', 'super_admin')->value('id')
    ?: User::query()->value('id');

if (! $adminId) {
    fwrite(STDERR, 'No user found for created_by.' . PHP_EOL);
    exit(1);
}

$sheet = IOFactory::load($file)->getSheet(0);
$rows = [];
$duplicates = [];

for ($row = 1; $row <= $sheet->getHighestDataRow(); $row++) {
    $sku = trim((string) $sheet->getCell('A' . $row)->getCalculatedValue());

    if ($sku === '' || strtolower($sku) === 'sku') {
        continue;
    }

    $name = trim((string) $sheet->getCell('B' . $row)->getCalculatedValue());
    $lengthRaw = $sheet->getCell('C' . $row)->getCalculatedValue();
    $unit = strtolower(trim((string) $sheet->getCell('D' . $row)->getCalculatedValue()));
    $stockRaw = $sheet->getCell('E' . $row)->getCalculatedValue();

    if ($name === '' || ! is_numeric($stockRaw)) {
        throw new RuntimeException("Invalid data at Excel row {$row} ({$sku}).");
    }

    if ($unit === '2/set') {
        $unit = 'set';
    }

    if (! isset($rows[$sku])) {
        $rows[$sku] = [
            'sku' => $sku,
            'name' => $name,
            'length_m' => is_numeric($lengthRaw) ? (float) $lengthRaw : null,
            'unit' => $unit ?: 'pcs',
            'stock' => 0.0,
            'source_rows' => [],
        ];
    } else {
        $duplicates[$sku] = true;
    }

    $rows[$sku]['stock'] += (float) $stockRaw;
    $rows[$sku]['source_rows'][] = $row;
}

$existing = Item::query()->withTrashed()->whereIn('sku', array_keys($rows))->count();

echo 'Import file: ' . $file . PHP_EOL;
echo 'Unique SKU: ' . count($rows) . PHP_EOL;
echo 'Existing SKU matches: ' . $existing . PHP_EOL;
echo 'New SKU to create: ' . (count($rows) - $existing) . PHP_EOL;
echo 'Duplicate SKU merged: ' . count($duplicates) . PHP_EOL;
echo 'Mode: ' . ($dryRun ? 'DRY RUN' : 'WRITE') . PHP_EOL;

DB::beginTransaction();

try {
    foreach ($rows as $row) {
        $item = Item::query()->withTrashed()->firstOrNew(['sku' => $row['sku']]);

        if ($item->exists && method_exists($item, 'trashed') && $item->trashed()) {
            $item->restore();
        }

        $item->name = $row['name'];
        $item->length_m = $row['length_m'];
        $item->unit = $row['unit'];
        $item->bom_scope = 'cabin';

        if (! $item->exists) {
            $item->created_by = $adminId;
        }

        $item->save();

        $variant = ItemVariant::query()
            ->where('item_id', $item->id)
            ->where(function ($query) {
                $query->whereNull('color')->orWhere('color', '');
            })
            ->first();

        if (! $variant) {
            $variant = new ItemVariant([
                'item_id' => $item->id,
                'color' => null,
            ]);
        }

        $variant->stock_initial = $row['stock'];
        $variant->stock_current = $row['stock'];
        $variant->total_stock_value = round(((float) ($variant->average_cost ?? 0)) * $row['stock'], 2);
        $variant->save();
    }

    if ($dryRun) {
        DB::rollBack();
        echo 'Dry run OK. No changes written.' . PHP_EOL;
    } else {
        DB::commit();
        echo 'Import completed.' . PHP_EOL;
    }
} catch (Throwable $exception) {
    DB::rollBack();
    throw $exception;
}
