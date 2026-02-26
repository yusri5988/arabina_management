<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_restaurant_without_price_and_capacity_fields(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'restaurant_id' => null,
        ]);

        $response = $this->actingAs($admin)->post('/admin/restaurants', [
            'name' => 'Restoran Uji',
            'email' => 'resto@example.com',
            'password' => 'password123',
        ]);

        $response->assertRedirect();

        $restaurant = Restaurant::where('name', 'Restoran Uji')->first();
        $this->assertNotNull($restaurant);
        $this->assertDatabaseHas('restaurant_settings', [
            'restaurant_id' => $restaurant->id,
            'price_child' => 0,
            'price_adult' => 0,
            'price_senior' => 0,
            'daily_capacity' => 100,
        ]);
    }

    public function test_restaurant_can_crud_product_with_image_and_is_blocked_from_other_restaurant_product(): void
    {
        Storage::fake('public');

        $restaurantA = Restaurant::create([
            'name' => 'A',
            'slug' => 'a',
            'referral_code' => 'AAAAAA',
            'is_active' => true,
        ]);
        $restaurantA->settings()->create([
            'price_child' => 0,
            'price_adult' => 0,
            'price_senior' => 0,
            'daily_capacity' => 100,
        ]);

        $restaurantB = Restaurant::create([
            'name' => 'B',
            'slug' => 'b',
            'referral_code' => 'BBBBBB',
            'is_active' => true,
        ]);
        $restaurantB->settings()->create([
            'price_child' => 0,
            'price_adult' => 0,
            'price_senior' => 0,
            'daily_capacity' => 100,
        ]);

        $userA = User::factory()->create([
            'role' => 'restaurant',
            'restaurant_id' => $restaurantA->id,
        ]);

        $createResponse = $this->actingAs($userA)->post('/restaurant/products', [
            'name' => 'Ayam Percik',
            'description' => 'Pedas manis',
            'price' => 12.50,
            'is_active' => 1,
            'image' => UploadedFile::fake()->image('ayam.jpg'),
        ]);

        $createResponse->assertRedirect();

        $product = Product::where('name', 'Ayam Percik')->firstOrFail();
        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);

        $this->actingAs($userA)->put("/restaurant/products/{$product->id}/toggle-active")
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);

        $otherProduct = Product::create([
            'restaurant_id' => $restaurantB->id,
            'name' => 'Laksa',
            'description' => null,
            'price' => 9.90,
            'is_active' => true,
        ]);

        $this->actingAs($userA)->delete("/restaurant/products/{$otherProduct->id}")
            ->assertForbidden();
    }

    public function test_public_booking_requires_items_and_calculates_total_from_products_only(): void
    {
        $restaurant = Restaurant::create([
            'name' => 'Resto Booking',
            'slug' => 'resto-booking',
            'referral_code' => 'REST01',
            'is_active' => true,
        ]);

        $restaurant->settings()->create([
            'price_child' => 99,
            'price_adult' => 99,
            'price_senior' => 99,
            'daily_capacity' => 100,
        ]);

        $productA = Product::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Nasi Arab',
            'price' => 20,
            'is_active' => true,
        ]);

        $productB = Product::create([
            'restaurant_id' => $restaurant->id,
            'name' => 'Air Sirap',
            'price' => 5,
            'is_active' => true,
        ]);

        $date = now()->addDay()->format('Y-m-d');

        $noItems = $this->post('/r/resto-booking', [
            'customer_name' => 'Ali',
            'customer_phone' => '0123456789',
            'booking_date' => $date,
            'child_qty' => 1,
            'adult_qty' => 1,
            'senior_qty' => 0,
            'items' => [],
        ]);

        $noItems->assertSessionHasErrors('items');

        $response = $this->post('/r/resto-booking', [
            'customer_name' => 'Ali',
            'customer_phone' => '0123456789',
            'booking_date' => $date,
            'child_qty' => 2,
            'adult_qty' => 3,
            'senior_qty' => 1,
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 2],
                ['product_id' => $productB->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('bookings', [
            'restaurant_id' => $restaurant->id,
            'total_amount' => 45.00,
            'child_qty' => 2,
            'adult_qty' => 3,
            'senior_qty' => 1,
        ]);

        $bookingId = $restaurant->bookings()->latest('id')->value('id');

        $this->assertDatabaseHas('booking_items', [
            'booking_id' => $bookingId,
            'product_id' => $productA->id,
            'quantity' => 2,
            'line_total' => 40.00,
        ]);
    }
}
