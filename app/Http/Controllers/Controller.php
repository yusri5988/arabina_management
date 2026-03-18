<?php

namespace App\Http\Controllers;

use Closure;

abstract class Controller
{
    protected function decimalQuantityRules(bool $allowZero = false, bool $allowNegative = false): array
    {
        return [
            'required',
            'numeric',
            function (string $attribute, mixed $value, Closure $fail) use ($allowZero, $allowNegative): void {
                $numeric = (float) $value;

                if ($allowNegative) {
                    if (abs($numeric) < 0.00001) {
                        $fail(':attribute mesti bukan 0.');
                        return;
                    }
                } elseif ($allowZero) {
                    if ($numeric < 0) {
                        $fail(':attribute mesti sekurang-kurangnya 0.');
                        return;
                    }
                } elseif ($numeric <= 0) {
                    $fail(':attribute mesti lebih besar daripada 0.');
                    return;
                }

                if (! $this->hasSingleDecimalPrecision($value)) {
                    $fail('The :attribute field must have at most 1 decimal place.');
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
        return preg_match('/^-?\d+(?:\.\d)?$/', trim((string) $quantity)) === 1;
    }
}
