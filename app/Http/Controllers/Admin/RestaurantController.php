<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RestaurantController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        
        if (!$user->isAdmin()) {
            abort(403);
        }

        $restaurants = Restaurant::with('settings')->get();

        return Inertia::render('Admin/RestaurantsIndex', [
            'restaurants' => $restaurants,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        if (!$user->isAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $referralCode = strtoupper(Str::random(6));
        while (Restaurant::where('referral_code', $referralCode)->exists()) {
            $referralCode = strtoupper(Str::random(6));
        }

        $baseSlug = Str::slug($validated['name']) ?: 'restaurant';
        $slug = $baseSlug;
        $counter = 1;
        while (Restaurant::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        $restaurant = Restaurant::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'referral_code' => $referralCode,
            'is_active' => true,
        ]);

        $restaurant->settings()->create([
            'price_child' => 0,
            'price_adult' => 0,
            'price_senior' => 0,
            'daily_capacity' => 100,
        ]);

        $password = $validated['password'] ?? Str::random(12);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($password),
            'role' => 'restaurant',
            'restaurant_id' => $restaurant->id,
        ]);

        return redirect()->back()->with('success', 'Restaurant created successfully. Password: ' . $password);
    }

    public function update(Request $request, Restaurant $restaurant)
    {
        $user = Auth::user();
        
        if (!$user->isAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $restaurant->update($validated);

        return redirect()->back()->with('success', 'Restaurant updated successfully.');
    }
}
