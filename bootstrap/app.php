<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureModule;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\ProcessLogMiddleware;
use App\Services\ProcessLogger;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureRole::class,
            'module' => EnsureModule::class,
        ]);

        $middleware->web(append: [
            ProcessLogMiddleware::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        
        $middleware->api(append: [
            ProcessLogMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->reportable(function (\Throwable $e) {
            try {
                if (request()) {
                    ProcessLogger::fail('System', 'Unhandled Exception', 'exception_handler', $e, [
                        'url' => request()->fullUrl(),
                        'input' => request()->except(['password', 'password_confirmation', 'token'])
                    ]);
                }
            } catch (\Exception $loggingException) {
                // Ignore if logging fails
            }
        });
    })->create();
