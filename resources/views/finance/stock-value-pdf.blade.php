<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Stock Value Report</title>
    <style>
        body { font-family: sans-serif; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
        th { background-color: #1b580e; color: #fff; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f0f0f0; }
        .text-right { text-align: right; }
        h1 { font-size: 16px; color: #1b580e; margin-bottom: 5px; }
        .subtitle { font-size: 10px; color: #666; margin-bottom: 15px; }
    </style>
</head>
<body>
    <h1>Stock Value Report</h1>
    <div class="subtitle">Generated at: {{ $generatedAt->format('d/m/Y H:i') }}</div>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th class="text-right">Current Stock</th>
                <th class="text-right">Avg Cost (MYR)</th>
                <th class="text-right">Total Value (MYR)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($stockData as $item)
            <tr>
                <td>{{ $item['sku'] }}</td>
                <td>{{ $item['name'] }}</td>
                <td>{{ ucfirst(str_replace('_', ' ', $item['bom_scope'] ?? '')) }}</td>
                <td>{{ strtoupper($item['unit']) }}</td>
                <td class="text-right">{{ number_format($item['current_stock'], 1) }}</td>
                <td class="text-right">{{ number_format($item['average_cost'], 2) }}</td>
                <td class="text-right">{{ number_format($item['total_value'], 2) }}</td>
            </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="6" class="text-right">TOTAL</td>
                <td class="text-right">{{ number_format($totalValueAll, 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
