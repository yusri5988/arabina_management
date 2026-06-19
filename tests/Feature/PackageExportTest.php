<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Package;
use App\Models\Item;
use App\Models\Bom;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class PackageExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_packages_export_excel_returns_xlsx_file_for_authorized_user(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::create([
            'sku' => 'SKU-EXPORT-001',
            'name' => 'Export Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $package = Package::create([
            'code' => 'PKG-EXPORT-001',
            'name' => 'Package to Export',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $package->packageItems()->create([
            'item_id' => $item->id,
            'quantity' => 10,
        ]);

        $response = $this->actingAs($user)->get('/packages/export');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        $contentDisposition = $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('attachment; filename=packages-list-', $contentDisposition);
        $this->assertStringEndsWith('.xlsx', $contentDisposition);
    }

    public function test_packages_export_excel_fails_for_unauthenticated_user(): void
    {
        $this->withMiddleware();

        $response = $this->get('/packages/export');
        $response->assertRedirect('/login');
    }

    public function test_single_package_export_excel_returns_xlsx_file_for_authorized_user(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $item = Item::create([
            'sku' => 'SKU-EXPORT-002',
            'name' => 'Export Item 2',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $package = Package::create([
            'code' => 'PKG-EXPORT-002',
            'name' => 'Package to Export 2',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $package->packageItems()->create([
            'item_id' => $item->id,
            'quantity' => 5,
        ]);

        $response = $this->actingAs($user)->get("/packages/{$package->id}/export");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        $contentDisposition = $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('attachment; filename=package-pkg-export-002-', $contentDisposition);
        $this->assertStringEndsWith('.xlsx', $contentDisposition);
    }

    public function test_single_package_export_excel_sorts_items_alphabetically_by_item_name(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $zebra = Item::create([
            'sku' => 'SKU-ZEBRA',
            'name' => 'Zebra Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $alpha = Item::create([
            'sku' => 'SKU-ALPHA',
            'name' => 'Alpha Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $package = Package::create([
            'code' => 'PKG-SORT-001',
            'name' => 'Package Sort Test',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $package->packageItems()->create([
            'item_id' => $zebra->id,
            'quantity' => 1,
        ]);
        $package->packageItems()->create([
            'item_id' => $alpha->id,
            'quantity' => 1,
        ]);

        $response = $this->actingAs($user)->get("/packages/{$package->id}/export");
        $path = tempnam(sys_get_temp_dir(), 'package-export-') . '.xlsx';
        file_put_contents($path, $response->streamedContent());

        $sheet = IOFactory::load($path)->getActiveSheet();

        $this->assertSame('Alpha Item', $sheet->getCell('B8')->getValue());
        $this->assertSame('Zebra Item', $sheet->getCell('B9')->getValue());

        @unlink($path);
    }

    public function test_packages_export_excel_sorts_packages_and_items_alphabetically(): void
    {
        $this->withMiddleware();

        $user = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $zebra = Item::create([
            'sku' => 'SKU-ZEBRA-BULK',
            'name' => 'Zebra Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $alpha = Item::create([
            'sku' => 'SKU-ALPHA-BULK',
            'name' => 'Alpha Item',
            'unit' => 'pcs',
            'bom_scope' => Bom::TYPE_HARDWARE,
            'created_by' => $user->id,
        ]);

        $zPackage = Package::create([
            'code' => 'PKG-Z',
            'name' => 'Zulu Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);
        $zPackage->packageItems()->create([
            'item_id' => $zebra->id,
            'quantity' => 1,
        ]);

        $aPackage = Package::create([
            'code' => 'PKG-A',
            'name' => 'Alpha Package',
            'is_active' => true,
            'created_by' => $user->id,
        ]);
        $aPackage->packageItems()->create([
            'item_id' => $zebra->id,
            'quantity' => 1,
        ]);
        $aPackage->packageItems()->create([
            'item_id' => $alpha->id,
            'quantity' => 1,
        ]);

        $response = $this->actingAs($user)->get('/packages/export');
        $path = tempnam(sys_get_temp_dir(), 'packages-export-') . '.xlsx';
        file_put_contents($path, $response->streamedContent());

        $sheet = IOFactory::load($path)->getActiveSheet();

        $this->assertSame('Alpha Package', $sheet->getCell('B2')->getValue());
        $this->assertSame('Alpha Item', $sheet->getCell('E2')->getValue());
        $this->assertSame('Alpha Package', $sheet->getCell('B3')->getValue());
        $this->assertSame('Zebra Item', $sheet->getCell('E3')->getValue());
        $this->assertSame('Zulu Package', $sheet->getCell('B4')->getValue());

        @unlink($path);
    }

    public function test_single_package_export_excel_fails_for_unauthenticated_user(): void
    {
        $this->withMiddleware();

        $response = $this->get('/packages/1/export');
        $response->assertRedirect('/login');
    }
}
