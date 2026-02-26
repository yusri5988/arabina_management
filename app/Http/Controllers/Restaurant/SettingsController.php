<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function show(): Response
    {
        $user = Auth::user();

        if (!$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        $restaurant = Restaurant::with('settings')->findOrFail($user->restaurant_id);
        $referralLink = url('/r/' . $restaurant->slug);

        return Inertia::render('Restaurant/Settings', [
            'restaurant' => $restaurant,
            'settings' => $restaurant->settings,
            'referralLink' => $referralLink,
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        if (!$user->isRestaurant() || !$user->restaurant_id) {
            abort(403);
        }

        $restaurant = Restaurant::findOrFail($user->restaurant_id);

        $validated = $request->validate([
            'daily_capacity' => ['required', 'integer', 'min:1'],
            'whatsapp_number' => ['nullable', 'string', 'max:20'],
        ]);

        $restaurant->settings()->updateOrCreate(
            ['restaurant_id' => $restaurant->id],
            $validated
        );

        return redirect()->back()->with('success', 'Settings updated successfully.');
    }
}
