<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Inertia\Inertia;
use App\Services\ProcessLogger;

class AuthController extends Controller
{
    // Show login page
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        ProcessLogger::start('Auth', 'Login', 'validate_input', ['email' => $request->input('email')]);

        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        \Illuminate\Support\Facades\Log::info('Login attempt', ['email' => $credentials['email']]);

        if (Auth::attempt($credentials)) {
            \Illuminate\Support\Facades\Log::info('Login success', ['email' => $credentials['email']]);
            ProcessLogger::success('Auth', 'Login', 'success', ['email' => $credentials['email']], User::class, Auth::id());
            $request->session()->regenerate();
            return redirect()->intended('/dashboard');
        }

        \Illuminate\Support\Facades\Log::warning('Login failed', ['email' => $credentials['email']]);
        ProcessLogger::warning('Auth', 'Login', 'fail', 'Invalid credentials', ['email' => $credentials['email']]);
        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    // Show registration page
    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    // Handle registration
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Auth::login($user);

        ProcessLogger::success('Auth', 'Register', 'success', ['email' => $user->email], User::class, $user->id);

        return redirect('/dashboard');
    }

    public function logout(Request $request)
    {
        $userId = Auth::id();
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        ProcessLogger::success('Auth', 'Logout', 'success', [], User::class, $userId);

        return redirect('/');
    }
}
