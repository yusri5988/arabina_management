<?php

namespace Tests\Feature;

use App\Http\Controllers\PackageController;
use App\Models\Bom;
use App\Models\Item;
use App\Models\Package;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PackageBulkUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_upload_reports_the_csv_row_for_unknown_sku(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        Item::create([
            'sku' => 'SKU-VALID-001',
            'name' => 'Valid Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-001',
                    'package_name' => 'Package Alpha',
                    'sku' => 'SKU-VALID-001',
                    'quantity' => 1,
                ],
                [
                    'package_code' => 'PKG-001',
                    'package_name' => 'Package Alpha',
                    'sku' => 'SKU-MISSING-404',
                    'quantity' => 2,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['packages.1.sku']);

        $errors = $response->json('errors');

        $this->assertContains(
            'Row 3: SKU [SKU-MISSING-404] tidak wujud dalam item master.',
            $errors['packages.1.sku'] ?? []
        );
    }

    public function test_bulk_upload_reports_the_csv_row_for_invalid_quantity(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        Item::create([
            'sku' => 'SKU-VALID-002',
            'name' => 'Valid Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-002',
                    'package_name' => 'Package Beta',
                    'sku' => 'SKU-VALID-002',
                    'quantity' => 0,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['packages.0.quantity']);

        $errors = $response->json('errors');

        $this->assertContains(
            'Row 2 quantity mesti bukan 0.',
            $errors['packages.0.quantity'] ?? []
        );
    }

    public function test_bulk_upload_allows_negative_quantity(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        Item::create([
            'sku' => 'SKU-VALID-NEG-001',
            'name' => 'Negative Quantity Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-NEG-001',
                    'package_name' => 'Package Negative',
                    'sku' => 'SKU-VALID-NEG-001',
                    'quantity' => -2,
                ],
            ],
        ]);

        $response->assertCreated();

        $package = Package::query()
            ->with(['packageItems'])
            ->where('code', 'PKG-NEG-001')
            ->firstOrFail();

        $this->assertSame(-2.0, (float) $package->packageItems->first()?->quantity);
    }

    public function test_package_create_allows_negative_quantity_lines(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $cabin = Item::create([
            'sku' => 'SKU-CABIN-NEG-001',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_CABIN,
            'created_by' => $user->id,
        ]);

        $hardware = Item::create([
            'sku' => 'SKU-HARDWARE-NEG-001',
            'name' => 'Hardware Negative Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $hardwareSite = Item::create([
            'sku' => 'SKU-SITE-NEG-001',
            'name' => 'Hardware Site Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE_SITE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages', [
            'code' => 'PKG-MANUAL-NEG-001',
            'name' => 'Manual Negative Package',
            'boms' => [
                'cabin' => [
                    [
                        'item_id' => $cabin->id,
                        'quantity' => 1,
                    ],
                ],
                'hardware' => [
                    [
                        'item_id' => $hardware->id,
                        'quantity' => -1.5,
                    ],
                ],
                'hardware_site' => [
                    [
                        'item_id' => $hardwareSite->id,
                        'quantity' => 2,
                    ],
                ],
            ],
        ]);

        $response->assertCreated();

        $package = Package::query()
            ->with(['packageItems'])
            ->where('code', 'PKG-MANUAL-NEG-001')
            ->firstOrFail();

        $this->assertSame(
            -1.5,
            (float) $package->packageItems->firstWhere('item_id', $hardware->id)?->quantity
        );
    }

    public function test_package_create_allows_empty_bom_section_when_other_sections_have_skus(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $cabin = Item::create([
            'sku' => 'SKU-CABIN-EMPTY-001',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_CABIN,
            'created_by' => $user->id,
        ]);

        $hardware = Item::create([
            'sku' => 'SKU-HARDWARE-EMPTY-001',
            'name' => 'Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages', [
            'code' => 'PKG-EMPTY-SECTION-001',
            'name' => 'Package With Empty Section',
            'boms' => [
                'cabin' => [
                    [
                        'item_id' => $cabin->id,
                        'quantity' => 1,
                    ],
                ],
                'hardware' => [
                    [
                        'item_id' => $hardware->id,
                        'quantity' => 2,
                    ],
                ],
                'hardware_site' => [],
            ],
        ]);

        $response->assertCreated();

        $package = Package::query()
            ->with(['boms.bomItems', 'packageItems'])
            ->where('code', 'PKG-EMPTY-SECTION-001')
            ->firstOrFail();

        $this->assertSame(3, $package->boms->count());
        $this->assertSame(1, $package->boms->firstWhere('type', Bom::TYPE_CABIN)?->bomItems->count());
        $this->assertSame(1, $package->boms->firstWhere('type', Bom::TYPE_HARDWARE)?->bomItems->count());
        $this->assertSame(0, $package->boms->firstWhere('type', Bom::TYPE_HARDWARE_SITE)?->bomItems->count());
        $this->assertCount(2, $package->packageItems);
    }

    public function test_package_update_preserves_empty_bom_section(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $cabin = Item::create([
            'sku' => 'SKU-CABIN-UPDATE-001',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_CABIN,
            'created_by' => $user->id,
        ]);

        $hardware = Item::create([
            'sku' => 'SKU-HARDWARE-UPDATE-001',
            'name' => 'Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $createResponse = $this->actingAs($user)->postJson('/packages', [
            'code' => 'PKG-UPDATE-EMPTY-001',
            'name' => 'Package To Update',
            'boms' => [
                'cabin' => [
                    [
                        'item_id' => $cabin->id,
                        'quantity' => 1,
                    ],
                ],
                'hardware' => [
                    [
                        'item_id' => $hardware->id,
                        'quantity' => 2,
                    ],
                ],
                'hardware_site' => [],
            ],
        ]);

        $createResponse->assertCreated();

        $package = Package::query()->where('code', 'PKG-UPDATE-EMPTY-001')->firstOrFail();

        $updateResponse = $this->actingAs($user)->putJson("/packages/{$package->id}", [
            'code' => 'PKG-UPDATE-EMPTY-002',
            'name' => 'Package Updated',
            'boms' => [
                'cabin' => [
                    [
                        'item_id' => $cabin->id,
                        'quantity' => 1,
                    ],
                ],
                'hardware' => [
                    [
                        'item_id' => $hardware->id,
                        'quantity' => 2,
                    ],
                ],
                'hardware_site' => [],
            ],
        ]);

        $updateResponse->assertOk();

        $package = Package::query()
            ->with(['boms.bomItems', 'packageItems'])
            ->where('code', 'PKG-UPDATE-EMPTY-002')
            ->firstOrFail();

        $this->assertSame('Package Updated', $package->name);
        $this->assertSame(3, $package->boms->count());
        $this->assertSame(0, $package->boms->firstWhere('type', Bom::TYPE_HARDWARE_SITE)?->bomItems->count());
        $this->assertCount(2, $package->packageItems);
    }

    public function test_package_create_rejects_when_all_bom_sections_are_empty(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $response = $this->actingAs($user)->postJson('/packages', [
            'code' => 'PKG-EMPTY-ALL-001',
            'name' => 'Empty Package',
            'boms' => [
                'cabin' => [],
                'hardware' => [],
                'hardware_site' => [],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['boms']);

        $errors = $response->json('errors');

        $this->assertContains(
            'At least one SKU line is required in BOM.',
            $errors['boms'] ?? []
        );
    }

    public function test_bulk_upload_creates_package_boms_for_all_bom_types(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $cabin = Item::create([
            'sku' => 'SKU-CABIN-001',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_CABIN,
            'created_by' => $user->id,
        ]);

        $hardware = Item::create([
            'sku' => 'SKU-HARDWARE-001',
            'name' => 'Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $hardwareSite = Item::create([
            'sku' => 'SKU-SITE-001',
            'name' => 'Hardware Site Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE_SITE,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-003',
                    'package_name' => 'Package Gamma',
                    'sku' => $cabin->sku,
                    'quantity' => 1,
                ],
                [
                    'package_code' => 'PKG-003',
                    'package_name' => 'Package Gamma',
                    'sku' => $hardware->sku,
                    'quantity' => 2,
                ],
                [
                    'package_code' => 'PKG-003',
                    'package_name' => 'Package Gamma',
                    'sku' => $hardwareSite->sku,
                    'quantity' => 3,
                ],
            ],
        ]);

        $response->assertCreated();

        $package = Package::query()
            ->with(['boms.bomItems', 'packageItems'])
            ->where('code', 'PKG-003')
            ->firstOrFail();

        $this->assertSame(3, $package->boms->count());
        $this->assertSame(1, $package->boms->firstWhere('type', Bom::TYPE_CABIN)?->bomItems->count());
        $this->assertSame(1, $package->boms->firstWhere('type', Bom::TYPE_HARDWARE)?->bomItems->count());
        $this->assertSame(1, $package->boms->firstWhere('type', Bom::TYPE_HARDWARE_SITE)?->bomItems->count());
        $this->assertCount(3, $package->packageItems);
    }

    public function test_bulk_upload_reports_invalid_item_master_bom_scope(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        Item::create([
            'sku' => 'SKU-CABIN-002',
            'name' => 'Cabin Item',
            'unit' => 'pcs',
            'bom_scope' => 'unknown_scope',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-004',
                    'package_name' => 'Package Delta',
                    'sku' => 'SKU-CABIN-002',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['packages.0.sku']);

        $errors = $response->json('errors');

        $this->assertContains(
            'Row 2: SKU [SKU-CABIN-002] tidak mempunyai kategori BOM yang sah dalam item master.',
            $errors['packages.0.sku'] ?? []
        );
    }

    public function test_bulk_upload_allows_same_package_name_when_package_code_is_different(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::create([
            'sku' => 'SKU-HARDWARE-003',
            'name' => 'Hardware Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-005',
                    'package_name' => 'Shared Package Name',
                    'sku' => $item->sku,
                    'quantity' => 1,
                ],
            ],
        ])->assertCreated();

        $this->actingAs($user)->postJson('/packages/bulk', [
            'packages' => [
                [
                    'package_code' => 'PKG-006',
                    'package_name' => 'Shared Package Name',
                    'sku' => $item->sku,
                    'quantity' => 2,
                ],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('boms', [
            'code' => 'PKG-005-HARDWARE',
            'name' => 'Hardware - PKG-005 - Shared Package Name',
        ]);

        $this->assertDatabaseHas('boms', [
            'code' => 'PKG-006-HARDWARE',
            'name' => 'Hardware - PKG-006 - Shared Package Name',
        ]);
    }

    public function test_package_delete_returns_clear_message_when_package_is_used_in_sales_order(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $package = Package::create([
            'code' => 'PKG-007',
            'name' => 'Package In Order',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $salesOrder = SalesOrder::create([
            'code' => 'SO-001',
            'customer_name' => 'Customer A',
            'order_date' => now()->toDateString(),
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        DB::table('sales_order_lines')->insert([
            'sales_order_id' => $salesOrder->id,
            'package_id' => $package->id,
            'package_quantity' => 1,
            'shipped_quantity' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseHas('sales_order_lines', [
            'sales_order_id' => $salesOrder->id,
            'package_id' => $package->id,
        ]);

        $response = app(PackageController::class)->destroy($package);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame(
            'Package PKG-007 cannot be deleted because it is used in Sales Order: SO-001.',
            $response->getData(true)['message'] ?? null
        );
    }
}
