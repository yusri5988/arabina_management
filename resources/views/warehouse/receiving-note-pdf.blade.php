<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }} - {{ $number }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; line-height: 1.5; }
        .header { margin-bottom: 30px; border-bottom: 2px solid #1b580e; padding-bottom: 10px; }
        .header h1 { color: #1b580e; margin: 0; font-size: 24px; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 4px 0; vertical-align: top; }
        .label { font-weight: bold; color: #666; width: 120px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .data-table th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .data-table td { border: 1px solid #e2e8f0; padding: 10px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e2e8f0; font-weight: bold; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Official stock arrival record for Arabina Inventory System</p>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">{{ $numberLabel }}:</td>
            <td><strong>{{ $number }}</strong></td>
            <td class="label">Date:</td>
            <td>{{ $note->received_at ? $note->received_at->format('d/m/Y H:i') : $note->updated_at->format('d/m/Y H:i') }}</td>
        </tr>
        <tr>
            <td class="label">PO Reference:</td>
            <td>{{ optional($note->procurementOrder)->code ?? 'Standalone' }}</td>
            <td class="label">Received By:</td>
            <td>{{ optional($note->creator)->name ?? 'System' }}</td>
        </tr>
        <tr>
            <td class="label">Status:</td>
            <td><span class="status-badge">{{ strtoupper($note->status) }}</span></td>
            <td class="label">Generated:</td>
            <td>{{ $generatedAt->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    @if($note->remarks)
    <div style="margin-bottom: 20px; padding: 10px; background: #fdfbf7; border: 1px solid #faedcd; border-radius: 8px;">
        <strong>Remarks:</strong><br>
        {{ $note->remarks }}
    </div>
    @endif

    @php
        $bomGroups = [
            'cabin' => 'BOM Cabin',
            'hardware' => 'BOM Hardware',
            'hardware_site' => 'BOM Hardware Site',
        ];
        $knownScopes = array_keys($bomGroups);
    @endphp

    @foreach($bomGroups as $scope => $label)
        @php
            $groupedItems = $note->items->filter(function ($item) use ($scope) {
                return (optional(optional($item->itemVariant)->item)->bom_scope ?? 'hardware') === $scope;
            });
        @endphp

        <div style="margin-top: 18px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; letter-spacing: 0.08em;">
            {{ $label }}
        </div>
        <table class="data-table" style="margin-top: 8px;">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Item Name</th>
                    <th class="text-center">Expected</th>
                    <th class="text-center">Received</th>
                    <th class="text-center">Rejected</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
                @forelse($groupedItems as $item)
                <tr>
                    <td><strong>{{ optional(optional($item->itemVariant)->item)->sku }}</strong></td>
                    <td>{{ optional(optional($item->itemVariant)->item)->name }}</td>
                    <td class="text-center">{{ $item->expected_qty }}</td>
                    <td class="text-center" style="background-color: #f0fdf4; font-weight: bold; color: #166534;">{{ $item->received_qty }}</td>
                    <td class="text-center" style="color: #991b1b;">{{ $item->rejected_qty }}</td>
                    <td><small>{{ $item->rejection_reason ?? '-' }}</small></td>
                </tr>
                @empty
                <tr>
                    <td colspan="6" class="text-center" style="color: #94a3b8;">No SKU in this BOM category.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    @endforeach

    @php
        $unclassifiedItems = $note->items->filter(function ($item) use ($knownScopes) {
            $scope = optional(optional($item->itemVariant)->item)->bom_scope ?? 'hardware';
            return ! in_array($scope, $knownScopes, true);
        });
    @endphp

    @if($unclassifiedItems->isNotEmpty())
        <div style="margin-top: 18px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; letter-spacing: 0.08em;">
            Unclassified BOM
        </div>
        <table class="data-table" style="margin-top: 8px;">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Item Name</th>
                    <th class="text-center">Expected</th>
                    <th class="text-center">Received</th>
                    <th class="text-center">Rejected</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
                @foreach($unclassifiedItems as $item)
                <tr>
                    <td><strong>{{ optional(optional($item->itemVariant)->item)->sku }}</strong></td>
                    <td>{{ optional(optional($item->itemVariant)->item)->name }}</td>
                    <td class="text-center">{{ $item->expected_qty }}</td>
                    <td class="text-center" style="background-color: #f0fdf4; font-weight: bold; color: #166534;">{{ $item->received_qty }}</td>
                    <td class="text-center" style="color: #991b1b;">{{ $item->rejected_qty }}</td>
                    <td><small>{{ $item->rejection_reason ?? '-' }}</small></td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
        <p>&copy; {{ date('Y') }} Arabina Management System. All rights reserved.</p>
    </div>
</body>
</html>
