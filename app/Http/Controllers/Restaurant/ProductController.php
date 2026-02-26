<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();

        if (!$user || !$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        $restaurant = Restaurant::findOrFail($user->restaurant_id);

        return Inertia::render('Restaurant/Products', [
            'products' => $restaurant->products()->latest()->get(),
        ]);
    }

    public function create(): Response
    {
        $this->authorizedRestaurant();

        return Inertia::render('Restaurant/ProductCreate');
    }

    public function store(Request $request)
    {
        $restaurant = $this->authorizedRestaurant();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::transaction(function () use ($request, $validated, $restaurant) {
            if ($request->hasFile('image')) {
                $validated['image_path'] = $request->file('image')->store('products', 'public');
            }

            $restaurant->products()->create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'price' => $validated['price'],
                'is_active' => $validated['is_active'],
                'image_path' => $validated['image_path'] ?? null,
            ]);
        });

        return redirect()->route('restaurant.products.index')->with('success', 'Product created successfully.');
    }

    public function update(Request $request, Product $product)
    {
        $restaurant = $this->authorizedRestaurant();
        $this->authorizeProduct($restaurant->id, $product);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::transaction(function () use ($request, $validated, $product) {
            if ($request->hasFile('image')) {
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }

                $validated['image_path'] = $request->file('image')->store('products', 'public');
            }

            $product->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'price' => $validated['price'],
                'is_active' => $validated['is_active'],
                'image_path' => $validated['image_path'] ?? $product->image_path,
            ]);
        });

        return redirect()->back()->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        $restaurant = $this->authorizedRestaurant();
        $this->authorizeProduct($restaurant->id, $product);

        DB::transaction(function () use ($product) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }

            $product->delete();
        });

        return redirect()->back()->with('success', 'Product deleted successfully.');
    }

    public function toggleActive(Product $product)
    {
        $restaurant = $this->authorizedRestaurant();
        $this->authorizeProduct($restaurant->id, $product);

        $product->update([
            'is_active' => !$product->is_active,
        ]);

        return redirect()->back()->with('success', 'Product status updated successfully.');
    }

    private function authorizedRestaurant(): Restaurant
    {
        $user = Auth::user();

        if (!$user || !$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        return Restaurant::findOrFail($user->restaurant_id);
    }

    private function authorizeProduct(int $restaurantId, Product $product): void
    {
        if ($product->restaurant_id !== $restaurantId) {
            abort(403);
        }
    }
}
