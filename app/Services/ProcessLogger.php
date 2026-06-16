<?php

namespace App\Services;

use App\Models\ProcessLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class ProcessLogger
{
    /**
     * Keys whose values must never be stored in plain text.
     */
    private const SENSITIVE_KEYS = [
        'password', 'password_confirmation', 'current_password', 'new_password',
        'token', '_token', 'api_token', 'access_token', 'refresh_token',
        'authorization', 'bearer',
        'api_key', 'api_secret', 'app_secret', 'client_secret', 'secret',
        'cookie', 'session',
        'email', 'phone', 'mobile', 'telephone',
        'ic', 'nric', 'passport', 'ssn', 'mykad',
        'address', 'street', 'city', 'postcode', 'zip',
        'credit_card', 'card_number', 'cc_number', 'cvv', 'cvv2', 'card_cvv',
        'otp', 'pin', 'password_hint', 'security_answer',
    ];

    /**
     * Get or generate a unique request ID for the current lifecycle.
     */
    public static function getRequestId(): string
    {
        return request()->header('X-Request-ID')
            ?? request()->attributes->get('request_id')
            ?? \Illuminate\Support\Str::uuid()->toString();
    }

    /**
     * Determine whether the process logger is globally enabled.
     */
    public static function isEnabled(): bool
    {
        return config('processlog.enabled', true);
    }

    /**
     * Insert a log directly to database in a fail-safe way.
     */
    protected static function insertLog(array $data): void
    {
        if (! self::isEnabled()) {
            return;
        }

        // Sanitize context BEFORE the try block so the fallback file log
        // never receives raw sensitive data if the DB insert fails.
        if (isset($data['context']) && is_array($data['context'])) {
            $data['context'] = self::sanitizeContext($data['context']);
        }

        try {
            $baseData = [
                'request_id' => self::getRequestId(),
                'actor_id' => Auth::id(),
                'endpoint' => request()->path(),
                'method' => request()->method(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'environment' => app()->environment(),
            ];

            // Duration calculation if start time exists
            if (defined('LARAVEL_START')) {
                $baseData['duration_ms'] = round((microtime(true) - LARAVEL_START) * 1000);
            }

            ProcessLog::create(array_merge($baseData, $data));
        } catch (\Exception $e) {
            // Fallback to file log, don't crash the main flow
            // $data['context'] is already sanitized at this point
            Log::channel('single')->error('Failed to insert process log: ' . $e->getMessage(), array_merge($data, ['error' => $e->getMessage()]));
        }
    }

    /**
     * Recursively sanitize sensitive context data before logging.
     */
    protected static function sanitizeContext(array $context): array
    {
        $sensitiveKeys = self::SENSITIVE_KEYS;

        foreach ($context as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys, true)) {
                $context[$key] = '*** HIDDEN ***';
            } elseif (is_array($value)) {
                $context[$key] = self::sanitizeContext($value);
            }
        }

        // Limit context size to prevent massive payloads
        $maxBytes = (int) config('processlog.max_context_bytes', 5000);
        $encoded = json_encode($context, JSON_INVALID_UTF8_IGNORE | JSON_UNESCAPED_UNICODE);

        if (strlen($encoded) > $maxBytes) {
            return [
                '_warning' => 'Context truncated due to size limit',
                '_original_size' => strlen($encoded),
            ];
        }

        return $context;
    }

    /**
     * Log a START event.
     */
    public static function start(string $module, string $process, ?string $step = null, array $context = [], ?string $relatedType = null, ?string $relatedId = null): void
    {
        self::insertLog([
            'level' => 'info',
            'module' => $module,
            'process' => $process,
            'step' => $step,
            'status' => 'start',
            'context' => $context,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
        ]);
    }

    /**
     * Log a SUCCESS event.
     */
    public static function success(string $module, string $process, ?string $step = null, array $context = [], ?string $relatedType = null, ?string $relatedId = null): void
    {
        self::insertLog([
            'level' => 'info',
            'module' => $module,
            'process' => $process,
            'step' => $step,
            'status' => 'success',
            'context' => $context,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
        ]);
    }

    /**
     * Log a WARNING event.
     */
    public static function warning(string $module, string $process, ?string $step = null, string $message = '', array $context = [], ?string $relatedType = null, ?string $relatedId = null): void
    {
        self::insertLog([
            'level' => 'warning',
            'module' => $module,
            'process' => $process,
            'step' => $step,
            'status' => 'fail', // warning implies failure in validation usually based on requirements
            'message' => $message,
            'context' => $context,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
        ]);
    }

    /**
     * Log a FAIL event with exception/error details.
     * Internal file paths and stack traces are hidden in production.
     */
    public static function fail(string $module, string $process, ?string $step, \Throwable $error, array $context = [], ?string $relatedType = null, ?string $relatedId = null): void
    {
        $isProduction = app()->environment('production');
        $errorFile = $isProduction ? null : $error->getFile();
        $errorLine = $isProduction ? null : $error->getLine();
        $stackTrace = $isProduction ? null : $error->getTraceAsString();

        self::insertLog([
            'level' => 'error',
            'module' => $module,
            'process' => $process,
            'step' => $step,
            'status' => 'fail',
            'context' => $context,
            'error_message' => $error->getMessage(),
            'error_code' => $error->getCode(),
            'error_file' => $errorFile,
            'error_line' => $errorLine,
            'error_class' => get_class($error),
            'stack_trace' => $stackTrace,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
        ]);
    }

    /**
     * Re-sanitize existing context data for safe display in the UI.
     * This protects old log entries that may contain unsanitized data.
     */
    public static function sanitizeContextForDisplay(?array $context): ?array
    {
        if ($context === null) {
            return null;
        }

        return self::sanitizeContext($context);
    }

    /**
     * Log a COMPLETED event.
     */
    public static function completed(string $module, string $process, array $context = [], ?string $relatedType = null, ?string $relatedId = null): void
    {
        self::insertLog([
            'level' => 'info',
            'module' => $module,
            'process' => $process,
            'status' => 'completed',
            'context' => $context,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
        ]);
    }
}
