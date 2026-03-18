<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Order - {{ $order->code }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #1f2937;
        }

        .header {
            border-bottom: 2px solid #1b580e;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1b580e;
        }

        .header p {
            margin: 4px 0 0;
            font-size: 11px;
            color: #6b7280;
        }

        .meta {
            width: 100%;
            margin-bottom: 20px;
        }

        .meta td {
            width: 50%;
            vertical-align: top;
            padding: 4px 0;
        }

        .label {
            font-weight: bold;
            color: #374151;
        }

        .section-title {
            margin: 20px 0 10px;
            font-size: 13px;
            font-weight: bold;
            color: #1b580e;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
        }

        table.items th,
        table.items td {
            border: 1px solid #d1d5db;
            padding: 8px;
        }

        table.items th {
            background: #f3f4f6;
            text-align: left;
            font-size: 11px;
        }

        .text-right {
            text-align: right;
        }

        .muted {
            color: #6b7280;
        }

        .notes {
            margin-top: 16px;
            padding: 10px;
            background: #f9fafb;
            border-left: 4px solid #1b580e;
        }

        .footer {
            margin-top: 24px;
            font-size: 10px;
            color: #6b7280;
            text-align: right;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Sales Order</h1>
        <p>Arabina Inventory Management System</p>
    </div>

    <table class="meta">
        <tr>
            <td>
                <div><span class="label">Order No:</span> {{ $order->code }}</div>
                <div><span class="label">Customer:</span> {{ $order->customer_name }}</div>
                <div><span class="label">Site ID:</span> {{ $order->site_id ?: '-' }}</div>
            </td>
            <td>
                <div><span class="label">Order Date:</span> {{ optional($order->order_date)->format('d/m/Y') }}</div>
                <div><span class="label">Status:</span> {{ strtoupper((string) $order->status) }}</div>
                <div><span class="label">Created By:</span> {{ optional($order->creator)->name ?? 'System' }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">Order Details</div>
    <table class="items">
        <thead>
            <tr>
                <th style="width: 8%;">No</th>
                <th style="width: 18%;">Type</th>
                <th style="width: 24%;">Code</th>
                <th>Description</th>
                <th style="width: 15%;" class="text-right">Quantity</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->lines as $index => $line)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line->package_id ? 'Package' : 'Loose SKU' }}</td>
                    <td>{{ $line->package_id ? (optional($line->package)->code ?? '-') : ($line->item_sku ?? '-') }}</td>
                    <td>{{ $line->package_id ? (optional($line->package)->name ?? '-') : (optional($line->item)->name ?? 'Loose item') }}</td>
                    <td class="text-right">
                        {{ $line->package_id ? (int) $line->package_quantity : (int) $line->item_quantity }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if ($order->notes)
        <div class="notes">
            <div class="label">Notes</div>
            <div class="muted">{{ $order->notes }}</div>
        </div>
    @endif

    <div class="footer">
        Generated at {{ $generatedAt->format('d/m/Y H:i') }}
    </div>
</body>

</html>