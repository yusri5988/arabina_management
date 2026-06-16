<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Str;
use App\Services\ProcessLogger;

class ProcessLogMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Generate or retrieve request ID
        // Only trust an external X-Request-ID if it looks like a valid UUID
        $incomingId = $request->header('X-Request-ID');
        $requestId = ($incomingId && Str::isUuid($incomingId)) ? $incomingId : Str::uuid()->toString();

        // 2. Set it in request attributes (accessible via request()->attributes->get('request_id'))
        $request->attributes->set('request_id', $requestId);

        // 3. Check if this route should be excluded from logging
        $routeName = $request->route()?->getName();
        $isIgnored = $routeName && in_array($routeName, config('processlog.ignored_routes', []), true);

        // 4. Log incoming request payload (conditional)
        if (!$isIgnored && config('processlog.log_request_payload', true)) {
            ProcessLogger::start('System', 'Incoming Request', 'handle_request', [
                'payload' => $request->except(['password', 'password_confirmation', 'token']),
            ]);
        }

        // 5. Process the request
        $response = $next($request);

        // 6. Attach request ID to response header
        $response->headers->set('X-Request-ID', $requestId);

        // 7. Log outgoing response (conditional)
        if (!$isIgnored && config('processlog.log_response', true)) {
            ProcessLogger::success('System', 'Outgoing Response', 'send_response', [
                'status_code' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
