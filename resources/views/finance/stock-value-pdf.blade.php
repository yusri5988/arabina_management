<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Stock Value Report</title>
    <style>
        body { font-family: sans-serif; font-size: 10px; }
        h1 { font-size: 16px; color: #1b580e; margin-bottom: 5px; }
        .subtitle { font-size: 10px; color: #666; margin-bottom: 15px; }
        .bom-section { margin-top: 14px; page-break-inside: avoid; }
        .bom-header { padding: 6px 10px; font-weight: bold; font-size: 12px; color: #1b580e; border: 1px solid #ddd; border-bottom: none; }
        .bom-cabin { background-color: #fef3c7; }
        .bom-hardware { background-color: #d1fae5; }
        .bom-hardware-site { background-color: #e0f2fe; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
        th { background-color: #1b580e; color: #fff; font-weight: bold; font-size: 9px; }
        .subtotal-row { font-weight: bold; font-style: italic; }
        .subtotal-cabin { background-color: #fef3c7; }
        .subtotal-hardware { background-color: #d1fae5; }
        .subtotal-hardware-site { background-color: #e0f2fe; }
        .grand-total { margin-top: 14px; }
        .grand-total-row { background-color: #1b580e; color: #fff; font-weight: bold; font-size: 12px; }
        .grand-total-row td { border: 1px solid #1b580e; padding: 8px 10px; }
        .text-right { text-align: right; }
        .empty-row { color: #999; font-style: italic; }
    </style>
</head>
<body>
    <h1>Stock Value Report</h1>
    <div class="subtitle">Generated at: {{ $generatedAt->format('d/m/Y H:i') }}</div>

    @foreach($groupedData as $group)
        @php $bomKey = str_replace('_', '-', $group['key']); @endphp
        <div class="bom-section">
            <div class="bom-header bom-{{ $bomKey }}">
                {{ $group['label'] }} — {{ count($group['items']) }} item{{ count($group['items']) !== 1 ? 's' : '' }}
            </div>
            @if(count($group['items']) > 0)
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Item Name</th>
                            <th>Unit</th>
                            <th class="text-right">Current Stock</th>
                            <th class="text-right">Avg Cost (MYR)</th>
                            <th class="text-right">Total Value (MYR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($group['items'] as $item)
                        <tr>
                            <td>{{ $item['sku'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ strtoupper($item['unit']) }}</td>
                            <td class="text-right">{{ number_format($item['current_stock'], 1) }}</td>
                            <td class="text-right">{{ number_format($item['average_cost'], 2) }}</td>
                            <td class="text-right">{{ number_format($item['total_value'], 2) }}</td>
                        </tr>
                        @endforeach
                        <tr class="subtotal-row subtotal-{{ $bomKey }}">
                            <td colspan="5" class="text-right">{{ $group['label'] }} Subtotal</td>
                            <td class="text-right">{{ number_format($group['subtotal'], 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Item Name</th>
                            <th>Unit</th>
                            <th class="text-right">Current Stock</th>
                            <th class="text-right">Avg Cost (MYR)</th>
                            <th class="text-right">Total Value (MYR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="text-center empty-row">No items in this BOM category.</td>
                        </tr>
                    </tbody>
                </table>
            @endif
        </div>
    @endforeach

    <div class="grand-total">
        <table>
            <tbody>
                <tr class="grand-total-row">
                    <td colspan="5" class="text-right">GRAND TOTAL (ALL BOM)</td>
                    <td class="text-right">{{ number_format($grandTotal, 2) }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
