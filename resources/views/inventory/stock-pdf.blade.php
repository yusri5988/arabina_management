<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Inventory Stock List</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1b580e; padding-bottom: 10px; }
        .header h1 { margin: 0; color: #1b580e; font-size: 24px; }
        .header p { margin: 5px 0 0; color: #666; }
        .section-title { background: #f8fafc; padding: 8px; font-weight: bold; border-left: 4px solid #1b580e; margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1b580e; color: white; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-error { background: #fee2e2; color: #b91c1c; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #999; padding: 10px 0; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ARABINA INVENTORY</h1>
        <p>Stock Status Report</p>
        <p style="font-size: 10px;">Generated on: {{ $generatedAt }}</p>
    </div>

    <div class="section-title">Package Availability</div>
    <table>
        <thead>
            <tr>
                <th width="15%">Code</th>
                <th>Package Name</th>
                <th width="15%" class="text-right">Available</th>
                <th width="15%">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach(collect($packages)->where('available_qty', '>', 0) as $pkg)
            <tr>
                <td class="font-bold">{{ $pkg['code'] }}</td>
                <td>{{ $pkg['name'] }}</td>
                <td class="text-right font-bold">{{ $pkg['available_qty'] }}</td>
                <td>
                    <span class="badge {{ $pkg['available_qty'] > 0 ? 'badge-success' : 'badge-error' }}">
                        {{ $pkg['available_qty'] > 0 ? 'READY' : 'OUT OF STOCK' }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">SKU Inventory List</div>
    @php
        $bomSections = [
            'cabin' => 'BOM Cabin',
            'hardware' => 'BOM Hardware',
            'hardware_site' => 'BOM Hardware Site',
        ];
    @endphp

    @foreach($bomSections as $scope => $label)
        @php
            $groupedItems = $items->filter(function ($item) use ($scope) {
                return ($item->bom_scope ?? 'hardware') === $scope;
            });
        @endphp

        <div class="section-title">{{ $label }}</div>
        <table>
            <thead>
                <tr>
                    <th width="15%">SKU</th>
                    <th>Item Name</th>
                    <th width="10%">Unit</th>
                    <th width="15%" class="text-right">Current Stock</th>
                </tr>
            </thead>
            <tbody>
                @forelse($groupedItems as $item)
                    <tr>
                        <td class="font-bold">{{ $item->sku }}</td>
                        <td>{{ $item->name }}</td>
                        <td>{{ strtoupper($item->unit) }}</td>
                        <td class="text-right font-bold">{{ $item->variants->sum('stock_current') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align: center; color: #64748b;">No SKU in this BOM category.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endforeach

    <div class="footer">
        Arabina Inventory System &copy; {{ date('Y') }} | Confidential Report
    </div>
</body>
</html>
