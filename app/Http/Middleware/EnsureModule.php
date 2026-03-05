<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModule
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Unauthorized.');
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (!$user->hasModuleAccess($module)) {
            abort(403, 'Unauthorized module.');
        }

        return $next($request);
    }
}

