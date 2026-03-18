<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $moduleRegistry = config('modules.registry', []);
        $moduleKeys = array_keys($moduleRegistry);

        $columns = ['id', 'name', 'email', 'role', 'created_at'];
        $hasModulePermissionsColumn = Schema::hasColumn('users', 'module_permissions');
        if ($hasModulePermissionsColumn) {
            $columns[] = 'module_permissions';
        }

        $users = User::query()
            ->managed()
            ->latest('id')
            ->get($columns)
            ->map(function ($user) use ($hasModulePermissionsColumn, $moduleKeys) {
                if (!$hasModulePermissionsColumn) {
                    $user->module_permissions = [];
                    return $user;
                }

                $normalizedPermissions = [];
                foreach ($moduleKeys as $moduleKey) {
                    if ($user->hasModuleAccess($moduleKey)) {
                        $normalizedPermissions[] = $moduleKey;
                    }
                }
                $user->module_permissions = $normalizedPermissions;

                return $user;
            });

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'moduleOptions' => collect($moduleRegistry)
                ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])
                ->values(),
            'allModuleKeys' => $moduleKeys,
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(User::MANAGED_ROLES)],
            'module_permissions' => ['nullable', 'array'],
            'module_permissions.*' => ['string', Rule::in(array_keys(config('modules.registry', [])))],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'module_permissions' => array_values(array_unique($validated['module_permissions'] ?? [])),
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
                    'module_permissions' => $user->module_permissions ?? [],
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
            'role' => ['required', Rule::in(User::MANAGED_ROLES)],
            'module_permissions' => ['nullable', 'array'],
            'module_permissions.*' => ['string', Rule::in(array_keys(config('modules.registry', [])))],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];
        $user->module_permissions = array_values(array_unique($validated['module_permissions'] ?? []));

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
                    'module_permissions' => $user->module_permissions ?? [],
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
        abort_unless($user->hasRole(...User::MANAGED_ROLES), 404);
    }
}
