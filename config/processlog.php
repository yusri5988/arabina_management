<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Enable / Disable Process Logging
    |--------------------------------------------------------------------------
    |
    | Master switch for all process logging. When disabled, ProcessLogger
    | will skip writing to the database entirely. Laravel's default
    | exception handler still logs unhandled errors to storage/logs.
    |
    */

    'enabled' => env('PROCESS_LOG_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Middleware Request / Response Logging
    |--------------------------------------------------------------------------
    |
    | Set to false to skip logging the inbound request payload and the
    | outgoing response status code from ProcessLogMiddleware. This is
    | useful to reduce noise when debugging specific flows.
    |
    */

    'log_request_payload' => env('PROCESS_LOG_REQUEST_PAYLOAD', true),
    'log_response' => env('PROCESS_LOG_RESPONSE', true),

    /*
    |--------------------------------------------------------------------------
    | Maximum Context Bytes
    |--------------------------------------------------------------------------
    |
    | The maximum byte length of the context JSON before it is truncated.
    | The truncated value will still be a valid JSON object containing
    | a warning message along with the first N bytes of data.
    |
    */

    'max_context_bytes' => env('PROCESS_LOG_MAX_CONTEXT_BYTES', 5000),

    /*
    |--------------------------------------------------------------------------
    | Routes Excluded From Middleware Logging
    |--------------------------------------------------------------------------
    |
    | List of route names that should not be logged by ProcessLogMiddleware.
    | This prevents pages like the process log viewer from creating
    | log entries about viewing their own logs.
    |
    */

    'ignored_routes' => [
        'admin.logs.process',
    ],

    /*
    |--------------------------------------------------------------------------
    | Retention Policy
    |--------------------------------------------------------------------------
    |
    | Here you may configure the number of days you wish to retain
    | the process logs in the database. The `logs:clean-process`
    | artisan command uses this value as default.
    |
    */

    'retention_days' => env('PROCESS_LOG_RETENTION_DAYS', 30),
];
