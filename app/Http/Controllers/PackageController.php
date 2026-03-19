<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Item;
use App\Models\Package;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    public function index(): Response
    {
        $schemaReady = $this->isSchemaReady();

        $items = Item::query()
            ->select(['id', 'sku', 'name', 'unit', 'bom_scope'])
            ->orderBy('sku')
            ->get();

        $packages = collect();
        if ($schemaReady) {
            $packages = Package::query()
                ->with([
                    'packageItems.item:id,sku,name,unit',
                    'boms.bomItems.item:id,sku,name,unit',
                ])
                ->latest('id')
                ->get();
        }

        return Inertia::render('Packages/Index', [
            'items' => $items,
            'packages' => $packages,
            'schemaReady' => $schemaReady,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->isSchemaReady()) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $validated = $this->validatePackagePayload($request, true);
        $normalizedBoms = $this->normalizeBomPayload($validated);
        $this->validateBomRules($normalizedBoms);

        $package = DB::transaction(function () use ($request, $validated, $normalizedBoms) {
            $package = Package::create([
                'code' => strtoupper($validated['code']),
                'name' => $validated['name'],
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $request->user()->id,
            ]);

            $this->syncBomAndPackageItems($package, $normalizedBoms);

            return $package;
        });

        return response()->json([
            'message' => 'Package created successfully.',
            'data' => Package::query()
                ->with(['packageItems.item:id,sku,name,unit', 'boms.bomItems.item:id,sku,name,unit'])
                ->findOrFail($package->id),
        ], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        if (! $this->isSchemaReady()) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $this->normalizeBulkPackageInput($request);

        $validated = $this->makeBulkPackageValidator($request)->validate();
        $rows = $this->normalizeBulkPackageRows($validated['packages']);
        $grouped = $rows->groupBy('package_code');

        $existingCodes = Package::query()
            ->whereIn('code', $grouped->keys())
            ->pluck('code')
            ->map(fn ($code) => strtoupper($code))
            ->all();

        $itemsBySku = Item::query()
            ->whereIn('sku', $rows->pluck('sku')->unique()->all())
            ->get(['id', 'sku', 'bom_scope'])
            ->keyBy('sku');

        $createdIds = [];
        $skipped = [];

        DB::transaction(function () use ($grouped, $existingCodes, $itemsBySku, $request, &$createdIds, &$skipped) {
            foreach ($grouped as $code => $packageRows) {
                if (in_array(strtoupper($code), $existingCodes, true)) {
                    $skipped[] = $code;
                    continue;
                }

                $firstRow = $packageRows->first();

                $package = Package::create([
                    'code' => $firstRow['package_code'],
                    'name' => $firstRow['package_name'],
                    'is_active' => $firstRow['is_active'],
                    'created_by' => $request->user()->id,
                ]);

                $boms = collect(Bom::TYPES)
                    ->mapWithKeys(function (string $type) use ($packageRows, $itemsBySku) {
                        $lines = $packageRows
                            ->filter(fn ($row) => (string) ($itemsBySku[$row['sku']]->bom_scope ?? '') === $type)
                            ->map(function ($row) use ($itemsBySku) {
                                return [
                                    'item_id' => $itemsBySku[$row['sku']]->id,
                                    'quantity' => $row['quantity'],
                                ];
                            })
                            ->values()
                            ->all();

                        return [$type => $lines];
                    })
                    ->all();

                $this->syncBomAndPackageItems($package, $boms);

                $createdIds[] = $package->id;
            }
        });

        $createdPackages = Package::query()
            ->with(['packageItems.item:id,sku,name,unit', 'boms.bomItems.item:id,sku,name,unit'])
            ->whereIn('id', $createdIds)
            ->latest('id')
            ->get();

        $message = $createdPackages->count() . ' package(s) created successfully.';
        if (count($skipped) > 0) {
            $message .= ' ' . count($skipped) . ' skipped because package code already exists.';
        }

        return response()->json([
            'message' => $message,
            'data' => $createdPackages,
            'skipped' => $skipped,
        ], 201);
    }

    public function downloadBulkTemplate()
    {
        $csv = implode("\n", [
            'package_code,package_name,sku,quantity',
            'OSLO-10X10,Oslo 10x10,1PNL-DOOR-057,1',
            'OSLO-10X10,Oslo 10x10,9SCW-CAP,200',
            'OSLO-10X10,Oslo 10x10,9ALU-TAPE,4',
            'ACCESSORIES,Accessories,9SCW-CAP,200',
            'ACCESSORIES,Accessories,9ALU-TAPE,4',
        ]);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="package-bulk-template.csv"',
        ]);
    }

    public function update(Request $request, $package): JsonResponse
    {
        $packageModel = $package instanceof Package
            ? $package
            : Package::query()->findOrFail((int) $package);

        $validated = $this->validatePackagePayload($request, false, $packageModel);
        $normalizedBoms = $this->normalizeBomPayload($validated);
        $this->validateBomRules($normalizedBoms);

        DB::transaction(function () use ($packageModel, $validated, $normalizedBoms) {
            Package::query()
                ->whereKey($packageModel->id)
                ->update([
                    'code' => strtoupper($validated['code']),
                    'name' => $validated['name'],
                    'is_active' => $validated['is_active'] ?? true,
                ]);

            $freshPackage = Package::query()->findOrFail($packageModel->id);
            $this->syncBomAndPackageItems($freshPackage, $normalizedBoms);
        });

        return response()->json([
            'message' => 'Package updated successfully.',
            'data' => Package::query()
                ->with(['packageItems.item:id,sku,name,unit', 'boms.bomItems.item:id,sku,name,unit'])
                ->findOrFail($packageModel->id),
        ]);
    }

    public function destroy(Package $package): JsonResponse
    {
        if (! $this->isSchemaReady()) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $deleteBlockers = $this->getPackageDeleteBlockers($package);
        if ($deleteBlockers !== []) {
            return response()->json([
                'message' => implode(' ', $deleteBlockers),
            ], 422);
        }

        try {
            $package->delete();
        } catch (QueryException $exception) {
            return response()->json([
                'message' => "Package {$package->code} cannot be deleted because it is still referenced by another transaction.",
            ], 422);
        }

        return response()->json([
            'message' => 'Package deleted successfully.',
        ]);
    }

    private function validatePackagePayload(Request $request, bool $isCreate, ?Package $package = null): array
    {
        $this->normalizePackageBomInput($request);

        $rules = [
            'code' => [
                'required',
                'string',
                'max:50',
                $package
                    ? Rule::unique('packages', 'code')->ignore($package->getKey(), $package->getKeyName())
                    : Rule::unique('packages', 'code'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ];

        if ($request->has('boms')) {
            $rules = array_merge($rules, [
                'boms' => ['required', 'array'],
                'boms.cabin' => ['present', 'array'],
                'boms.hardware' => ['present', 'array'],
                'boms.hardware_site' => ['present', 'array'],
                'boms.cabin.*.item_id' => ['required', 'integer', 'exists:items,id'],
                'boms.cabin.*.quantity' => $this->decimalQuantityRules(false, true),
                'boms.hardware.*.item_id' => ['required', 'integer', 'exists:items,id'],
                'boms.hardware.*.quantity' => $this->decimalQuantityRules(false, true),
                'boms.hardware_site.*.item_id' => ['required', 'integer', 'exists:items,id'],
                'boms.hardware_site.*.quantity' => $this->decimalQuantityRules(false, true),
            ]);
        } else {
            $rules = array_merge($rules, [
                'lines' => ['required', 'array', 'min:1'],
                'lines.*.item_id' => ['required', 'integer', 'distinct', 'exists:items,id'],
                'lines.*.quantity' => $this->decimalQuantityRules(false, true),
            ]);
        }

        if ($isCreate) {
            return $request->validate($rules);
        }

        return $request->validate($rules);
    }

    private function normalizePackageBomInput(Request $request): void
    {
        if (! $request->has('boms')) {
            return;
        }

        $boms = $request->input('boms');
        if (! is_array($boms)) {
            return;
        }

        $request->merge([
            'boms' => [
                Bom::TYPE_CABIN => is_array($boms[Bom::TYPE_CABIN] ?? null) ? $boms[Bom::TYPE_CABIN] : [],
                Bom::TYPE_HARDWARE => is_array($boms[Bom::TYPE_HARDWARE] ?? null) ? $boms[Bom::TYPE_HARDWARE] : [],
                Bom::TYPE_HARDWARE_SITE => is_array($boms[Bom::TYPE_HARDWARE_SITE] ?? null) ? $boms[Bom::TYPE_HARDWARE_SITE] : [],
            ],
        ]);
    }

    private function makeBulkPackageValidator(Request $request): ValidatorContract
    {
        $data = $request->all();
        $rows = $this->normalizeBulkPackageRows($data['packages'] ?? []);

        $attributes = [];
        foreach ($rows as $row) {
            $attributes["packages.{$row['_index']}.package_code"] = "Row {$row['_row']} package_code";
            $attributes["packages.{$row['_index']}.package_name"] = "Row {$row['_row']} package_name";
            $attributes["packages.{$row['_index']}.sku"] = "Row {$row['_row']} sku";
            $attributes["packages.{$row['_index']}.quantity"] = "Row {$row['_row']} quantity";
        }

        $validator = Validator::make($data, [
            'packages' => ['required', 'array', 'min:1', 'max:2000'],
            'packages.*.package_code' => ['required', 'string', 'max:50'],
            'packages.*.package_name' => ['required', 'string', 'max:255'],
            'packages.*.sku' => ['required', 'string', 'max:100'],
            'packages.*.quantity' => $this->decimalQuantityRules(false, true),
        ], [
            'packages.required' => 'Upload package mesti mengandungi sekurang-kurangnya 1 row.',
            'packages.array' => 'Format upload package tidak sah.',
            'packages.min' => 'Upload package mesti mengandungi sekurang-kurangnya 1 row.',
            'packages.max' => 'Upload package maksimum 2000 row sekali jalan.',
            'packages.*.package_code.required' => ':attribute wajib diisi.',
            'packages.*.package_name.required' => ':attribute wajib diisi.',
            'packages.*.sku.required' => ':attribute wajib diisi.',
            'packages.*.quantity.required' => ':attribute wajib diisi.',
            'packages.*.quantity.numeric' => ':attribute mesti nombor.',
        ], $attributes);

        $validator->after(function (ValidatorContract $validator) use ($rows): void {
            $itemsBySku = Item::query()
                ->whereIn('sku', $rows->pluck('sku')->filter()->unique()->all())
                ->get(['sku', 'bom_scope'])
                ->keyBy('sku');

            foreach ($rows as $row) {
                $skuKey = "packages.{$row['_index']}.sku";

                if (
                    $row['sku'] === ''
                    || $validator->errors()->has($skuKey)
                ) {
                    continue;
                }

                $item = $itemsBySku->get($row['sku']);
                if (! $item) {
                    $validator->errors()->add($skuKey, "Row {$row['_row']}: SKU [{$row['sku']}] tidak wujud dalam item master.");
                    continue;
                }

                if (! in_array((string) $item->bom_scope, Bom::TYPES, true)) {
                    $validator->errors()->add(
                        $skuKey,
                        "Row {$row['_row']}: SKU [{$row['sku']}] tidak mempunyai kategori BOM yang sah dalam item master."
                    );
                }
            }

            foreach ($rows->groupBy('package_code') as $code => $packageRows) {
                if ($code === '') {
                    continue;
                }

                $rowNumbers = $packageRows->pluck('_row')->implode(', ');
                $names = $packageRows->pluck('package_name')->filter()->unique()->values();
                if ($names->count() > 1) {
                    foreach ($packageRows as $row) {
                        $validator->errors()->add(
                            "packages.{$row['_index']}.package_name",
                            "Package code [{$code}] mempunyai package_name berbeza pada row {$rowNumbers}."
                        );
                    }
                }

                foreach ($packageRows->groupBy('sku') as $sku => $skuRows) {
                    if ($sku === '' || $skuRows->count() <= 1) {
                        continue;
                    }

                    $duplicateRows = $skuRows->pluck('_row')->implode(', ');
                    foreach ($skuRows as $row) {
                        $validator->errors()->add(
                            "packages.{$row['_index']}.sku",
                            "Package code [{$code}] mengandungi SKU duplikat [{$sku}] pada row {$duplicateRows}."
                        );
                    }
                }
            }
        });

        return $validator;
    }

    private function normalizeBulkPackageRows(array $rows)
    {
        return collect($rows)
            ->values()
            ->map(function ($row, int $index) {
                $row = is_array($row) ? $row : [];

                return [
                    '_index' => $index,
                    '_row' => $index + 2,
                    'package_code' => strtoupper(trim((string) ($row['package_code'] ?? ''))),
                    'package_name' => trim((string) ($row['package_name'] ?? '')),
                    'is_active' => true,
                    'sku' => strtoupper(trim((string) ($row['sku'] ?? ''))),
                    'quantity' => $this->normalizeQuantity($row['quantity'] ?? 0),
                ];
            });
    }

    private function isSchemaReady(): bool
    {
        return Schema::hasTable('packages')
            && Schema::hasTable('package_items')
            && Schema::hasTable('boms')
            && Schema::hasTable('bom_items');
    }

    private function normalizeBomPayload(array $validated): array
    {
        if (isset($validated['boms']) && is_array($validated['boms'])) {
            return [
                Bom::TYPE_CABIN => $this->normalizeBomLines($validated['boms'][Bom::TYPE_CABIN] ?? []),
                Bom::TYPE_HARDWARE => $this->normalizeBomLines($validated['boms'][Bom::TYPE_HARDWARE] ?? []),
                Bom::TYPE_HARDWARE_SITE => $this->normalizeBomLines($validated['boms'][Bom::TYPE_HARDWARE_SITE] ?? []),
            ];
        }

        return [
            Bom::TYPE_CABIN => [],
            Bom::TYPE_HARDWARE => $this->normalizeBomLines($validated['lines'] ?? []),
            Bom::TYPE_HARDWARE_SITE => [],
        ];
    }

    private function normalizeBomLines(array $lines): array
    {
        return collect($lines)
            ->map(function ($line) {
                return [
                    'item_id' => (int) ($line['item_id'] ?? 0),
                    'quantity' => $this->normalizeQuantity($line['quantity'] ?? 0),
                ];
            })
            ->filter(fn ($line) => $line['item_id'] > 0 && abs($line['quantity']) > 0)
            ->values()
            ->all();
    }

    private function validateBomRules(array $boms): void
    {
        $totalLines = collect($boms)->flatten(1)->count();
        if ($totalLines === 0) {
            throw ValidationException::withMessages([
                'boms' => ['At least one SKU line is required in BOM.'],
            ]);
        }

        foreach ($boms as $type => $lines) {
            $duplicates = collect($lines)
                ->pluck('item_id')
                ->countBy()
                ->filter(fn ($count) => $count > 1)
                ->keys()
                ->all();

            if ($duplicates !== []) {
                throw ValidationException::withMessages([
                    "boms.$type" => ['Duplicate SKU in ' . str_replace('_', ' ', $type) . ' BOM is not allowed.'],
                ]);
            }
        }

        $itemIds = collect($boms)->flatten(1)->pluck('item_id')->unique()->values();
        if ($itemIds->isEmpty()) {
            return;
        }

        $itemScopes = Item::query()
            ->whereIn('id', $itemIds->all())
            ->pluck('bom_scope', 'id');

        foreach ($boms as $type => $lines) {
            foreach ($lines as $line) {
                $scope = (string) ($itemScopes[$line['item_id']] ?? '');
                if ($scope !== $type) {
                    throw ValidationException::withMessages([
                        "boms.$type" => [
                            'SKU tidak boleh cross BOM. Pastikan setiap SKU didaftarkan dengan kategori BOM yang sama.',
                        ],
                    ]);
                }
            }
        }
    }

    private function syncBomAndPackageItems(Package $package, array $boms): void
    {
        $package->boms()->delete();

        foreach (Bom::TYPES as $type) {
            $lines = $boms[$type] ?? [];
            $bom = $package->boms()->create([
                'code' => $package->code . '-' . strtoupper($type),
                'name' => ucfirst(str_replace('_', ' ', $type)) . ' - ' . $package->code . ' - ' . $package->name,
                'is_active' => true,
                'type' => $type,
            ]);

            if ($lines !== []) {
                $bom->bomItems()->createMany($lines);
            }
        }

        $aggregated = collect($boms)
            ->flatten(1)
            ->groupBy('item_id')
            ->map(function ($lines, $itemId) {
                return [
                    'item_id' => (int) $itemId,
                    'quantity' => $this->normalizeQuantity(collect($lines)->sum('quantity')),
                ];
            })
            ->values()
            ->all();

        $package->packageItems()->delete();
        if ($aggregated !== []) {
            $package->packageItems()->createMany($aggregated);
        }
    }

    private function getPackageDeleteBlockers(Package $package): array
    {
        $messages = [];

        $salesOrderCodes = DB::table('sales_order_lines')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_lines.sales_order_id')
            ->where('sales_order_lines.package_id', $package->id)
            ->distinct()
            ->pluck('sales_orders.code')
            ->filter()
            ->values();

        if ($salesOrderCodes->isNotEmpty()) {
            $messages[] = "Package {$package->code} cannot be deleted because it is used in Sales Order: {$salesOrderCodes->implode(', ')}.";
        }

        $procurementOrderCodes = DB::table('procurement_order_package_lines')
            ->join('procurement_orders', 'procurement_orders.id', '=', 'procurement_order_package_lines.procurement_order_id')
            ->where('procurement_order_package_lines.package_id', $package->id)
            ->distinct()
            ->pluck('procurement_orders.code')
            ->filter()
            ->values();

        if ($procurementOrderCodes->isNotEmpty()) {
            $messages[] = "Package {$package->code} cannot be deleted because it is used in Procurement Order: {$procurementOrderCodes->implode(', ')}.";
        }

        return $messages;
    }

    private function normalizeBulkPackageInput(Request $request): void
    {
        $packages = $request->input('packages');

        if (! is_array($packages)) {
            return;
        }

        $request->merge([
            'packages' => collect($packages)
                ->map(function ($row) {
                    if (! is_array($row)) {
                        return $row;
                    }

                    foreach (['package_code', 'package_name', 'sku'] as $field) {
                        if (array_key_exists($field, $row) && $row[$field] !== null) {
                            $row[$field] = trim((string) $row[$field]);
                            if (in_array($field, ['package_code', 'sku'], true)) {
                                $row[$field] = strtoupper($row[$field]);
                            }
                        }
                    }

                    return $row;
                })
                ->all(),
        ]);
    }
}
