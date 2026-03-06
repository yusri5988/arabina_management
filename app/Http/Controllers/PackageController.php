<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    public function index(): Response
    {
        $schemaReady = Schema::hasTable('packages') && Schema::hasTable('package_items');

        $items = Item::query()
            ->select(['id', 'sku', 'name', 'unit'])
            ->orderBy('sku')
            ->get();

        $packages = collect();
        if ($schemaReady) {
            $packages = Package::query()
                ->with([
                    'packageItems.item:id,sku,name,unit',
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
        if (! (Schema::hasTable('packages') && Schema::hasTable('package_items'))) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:packages,code'],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'distinct', 'exists:items,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $package = DB::transaction(function () use ($request, $validated) {
            $package = Package::create([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $request->user()->id,
            ]);

            $package->packageItems()->createMany(
                collect($validated['lines'])->map(function ($line) {
                    return [
                        'item_id' => $line['item_id'],
                        'quantity' => $line['quantity'],
                    ];
                })->all()
            );

            return $package;
        });

        return response()->json([
            'message' => 'Package created successfully.',
            'data' => Package::query()
                ->with(['packageItems.item:id,sku,name,unit'])
                ->findOrFail($package->id),
        ], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        if (! (Schema::hasTable('packages') && Schema::hasTable('package_items'))) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $validated = $request->validate([
            'packages' => ['required', 'array', 'min:1', 'max:2000'],
            'packages.*.package_code' => ['required', 'string', 'max:50'],
            'packages.*.package_name' => ['required', 'string', 'max:255'],
            'packages.*.sku' => ['required', 'string', 'max:100', 'exists:items,sku'],
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $rows = collect($validated['packages'])
            ->values()
            ->map(function (array $row) {
                return [
                    'package_code' => trim($row['package_code']),
                    'package_name' => trim($row['package_name']),
                    'is_active' => true,
                    'sku' => trim($row['sku']),
                    'quantity' => (int) $row['quantity'],
                ];
            });

        $grouped = $rows->groupBy('package_code');
        $errors = [];

        foreach ($grouped as $code => $packageRows) {
            $firstIndex = $packageRows->keys()->first();

            if ($code === '') {
                $errors["packages.$firstIndex.package_code"] = ['Package code is required.'];
            }

            $names = $packageRows->pluck('package_name')->unique()->values();
            if ($names->count() > 1) {
                $errors["packages.$firstIndex.package_name"] = ["Package code {$code} has multiple package names in the upload file."];
            }

            $duplicateSkus = $packageRows->pluck('sku')->countBy()->filter(fn ($count) => $count > 1)->keys()->values();
            if ($duplicateSkus->isNotEmpty()) {
                $errors["packages.$firstIndex.sku"] = ["Package code {$code} has duplicate SKU(s): {$duplicateSkus->implode(', ')}."];
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $existingCodes = Package::query()
            ->whereIn('code', $grouped->keys())
            ->pluck('code')
            ->all();

        $itemsBySku = Item::query()
            ->whereIn('sku', $rows->pluck('sku')->unique()->all())
            ->get(['id', 'sku'])
            ->keyBy('sku');

        $createdIds = [];
        $skipped = [];

        DB::transaction(function () use ($grouped, $existingCodes, $itemsBySku, $request, &$createdIds, &$skipped) {
            foreach ($grouped as $code => $packageRows) {
                if (in_array($code, $existingCodes, true)) {
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

                $package->packageItems()->createMany(
                    $packageRows->map(function ($row) use ($itemsBySku) {
                        return [
                            'item_id' => $itemsBySku[$row['sku']]->id,
                            'quantity' => $row['quantity'],
                        ];
                    })->values()->all()
                );

                $createdIds[] = $package->id;
            }
        });

        $createdPackages = Package::query()
            ->with(['packageItems.item:id,sku,name,unit'])
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
            'OSLO-10X10,Oslo 10x10,1PNL-ROOF-FLAT-298,4',
            'OSLO-10X10,Oslo 10x10,1PNL-WALL-264,9',
            'ACCESSORIES,Accessories,9ALU-TAPE,4',
            'ACCESSORIES,Accessories,9SCW-CAP,200',
        ]);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="package-bulk-template.csv"',
        ]);
    }

    public function update(Request $request, Package $package): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:packages,code,' . $package->id],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'distinct', 'exists:items,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($package, $validated) {
            $package->update([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $package->packageItems()->delete();
            $package->packageItems()->createMany(
                collect($validated['lines'])->map(function ($line) {
                    return [
                        'item_id' => $line['item_id'],
                        'quantity' => $line['quantity'],
                    ];
                })->all()
            );
        });

        return response()->json([
            'message' => 'Package updated successfully.',
            'data' => Package::query()
                ->with(['packageItems.item:id,sku,name,unit'])
                ->findOrFail($package->id),
        ]);
    }

    public function destroy(Package $package): JsonResponse
    {
        if (! (Schema::hasTable('packages') && Schema::hasTable('package_items'))) {
            return response()->json([
                'message' => 'Packages table is not ready. Please run php artisan migrate.',
            ], 503);
        }

        $package->delete();

        return response()->json([
            'message' => 'Package deleted successfully.',
        ]);
    }
}
