<?php

namespace App\Http\Controllers;

use Closure;

abstract class Controller
{
    protected function decimalQuantityRules(bool $allowZero = false): array
    {
        return [
            'required',
            'numeric',
            $allowZero ? 'gte:0' : 'gt:0',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! $this->hasSingleDecimalPrecision($value)) {
                    $fail('The ' . str_replace('_', ' ', $attribute) . ' field must have at most 1 decimal place.');
                }
            },
        ];
    }

    protected function normalizeQuantity(mixed $quantity): float
    {
        return round((float) $quantity, 1);
    }

    protected function formatQuantity(mixed $quantity): string
    {
        $normalized = $this->normalizeQuantity($quantity);

        if (abs($normalized - round($normalized)) < 0.00001) {
            return (string) (int) round($normalized);
        }

        return number_format($normalized, 1, '.', '');
    }

    protected function hasSingleDecimalPrecision(mixed $quantity): bool
    {
        return preg_match('/^\d+(?:\.\d)?$/', trim((string) $quantity)) === 1;
    }
}
