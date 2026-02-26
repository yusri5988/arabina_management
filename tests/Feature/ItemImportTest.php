<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Database\Seeders\ItemImportSeeder;

class ItemImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_items_are_imported_correctly()
    {
        // Create an admin user for the seeder
        User::factory()->create(['role' => 'super_admin']);

        $this->seed(ItemImportSeeder::class);

        $this->assertEquals(76, Item::count());
        
        // Verify a specific item
        $item = Item::where('sku', '1PNL-DOOR-057')->first();
        $this->assertNotNull($item);
        $this->assertEquals('Panel - Door', $item->name);
        $this->assertEquals(0.57, $item->length_m);
        
        // Verify default variant was created
        $this->assertTrue($item->variants()->whereNull('color')->exists());
    }
}
