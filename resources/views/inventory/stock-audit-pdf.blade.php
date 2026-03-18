<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Stock Audit Report</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 12px;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #1b580e;
            padding-bottom: 10px;
        }

        .header h1 {
            margin: 0;
            color: #1b580e;
            font-size: 22px;
        }

        .header p {
            margin: 4px 0;
            color: #666;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }

        th {
            background: #1b580e;
            color: #fff;
            text-align: left;
            padding: 8px;
            font-size: 10px;
            text-transform: uppercase;
        }

        td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }

        .text-right {
            text-align: right;
        }

        .short {
            color: #b91c1c;
            font-weight: bold;
        }

        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 8px;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>ARABINA INVENTORY</h1>
        <p>Stock Audit Report</p>
        <p>Audit Date: {{ optional($audit->audited_at)->format('d/m/Y H:i:s') }}</p>
        <p>Auditor: {{ optional($audit->auditor)->name ?? 'Unknown' }}</p>
        <p>Generated: {{ $generatedAt }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th width="18%">SKU</th>
                <th>Item Name</th>
                <th width="14%" class="text-right">Before</th>
                <th width="14%" class="text-right">Audited</th>
                <th width="12%" class="text-right">Diff</th>
                <th width="12%" class="text-right">Short</th>
            </tr>
        </thead>
        <tbody>
            @foreach($audit->lines as $line)
                <tr>
                    <td>{{ optional($line->item)->sku }}</td>
                    <td>{{ optional($line->item)->name }}</td>
                    <td class="text-right">{{ $line->stock_before }}</td>
                    <td class="text-right">{{ $line->audited_stock }}</td>
                    <td class="text-right">{{ $line->diff_quantity }}</td>
                    <td class="text-right {{ $line->short_quantity > 0 ? 'short' : '' }}">{{ $line->short_quantity }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Arabina Inventory System &copy; {{ date('Y') }}
    </div>
</body>

</html>