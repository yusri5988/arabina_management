<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
