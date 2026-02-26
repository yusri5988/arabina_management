<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->whereIn('role', User::MANAGED_ROLES)
            ->latest('id')
            ->get(['id', 'name', 'email', 'role', 'created_at']);

        return Inertia::render('Admin/UserManagement', [
            'users' => $users
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:'.implode(',', User::MANAGED_ROLES)],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'created_by' => $request->user()->id,
            'email_verified_at' => now(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'User created successfully.',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at?->toISOString(),
                ],
            ], 201);
        }

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $this->ensureManagedUser($user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', 'in:'.implode(',', User::MANAGED_ROLES)],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'User updated successfully.',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at?->toISOString(),
                ],
            ]);
        }

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $this->ensureManagedUser($user);
        $user->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'User deleted successfully.',
            ]);
        }

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    private function ensureManagedUser(User $user): void
    {
        abort_unless(in_array($user->role, User::MANAGED_ROLES, true), 404);
    }
}
