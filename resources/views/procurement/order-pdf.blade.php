<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Procurement Order {{ $order->code }}</title>
    <style>
        :root {
            color-scheme: light;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            color: #0f172a;
            background: #f8fafc;
        }

        .page {
            max-width: 960px;
            margin: 24px auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
        }

        .header {
            padding: 24px;
            background: linear-gradient(135deg, #0f5132, #166534);
            color: #ffffff;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 0.02em;
        }

        .header p {
            margin: 8px 0 0;
            opacity: 0.9;
            font-size: 13px;
        }

        .meta {
            padding: 20px 24px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        .meta-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 12px;
        }

        .meta-card .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
            margin-bottom: 6px;
        }

        .meta-card .value {
            font-size: 13px;
            font-weight: 600;
        }

        .section {
            padding: 20px 24px;
        }

        .section h2 {
            margin: 0 0 12px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #334155;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
        }

        th,
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            vertical-align: top;
        }

        th {
            background: #f1f5f9;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #334155;
            text-align: left;
            font-size: 11px;
        }

        .text-right {
            text-align: right;
        }

        .muted {
            color: #64748b;
            font-size: 11px;
        }

        @media (max-width: 900px) {
            .meta {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>Bulk Procurement Order</h1>
            <p>Order No: {{ $order->code }}</p>
        </div>

        <div class="meta">
            <div class="meta-card">
                <div class="label">Status</div>
                <div class="value">{{ strtoupper($order->status) }}</div>
            </div>
            <div class="meta-card">
                <div class="label">Created Date</div>
                <div class="value">{{ optional($order->created_at)->format('d M Y') }}</div>
            </div>
            <div class="meta-card">
                <div class="label">Printed At</div>
                <div class="value">{{ $printedAt->format('d M Y H:i') }}</div>
            </div>
            <div class="meta-card">
                <div class="label">Total SKU Lines</div>
                <div class="value">{{ $order->lines->count() }}</div>
            </div>
        </div>

        <div class="section">
            <h2>SKU Order Lines</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 46px;">#</th>
                        <th>SKU</th>
                        <th>Item Name</th>
                        <th>Unit</th>
                        <th class="text-right">Ordered Qty</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($order->lines as $index => $line)
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $line->item?->sku }}</td>
                            <td>{{ $line->item?->name }}</td>
                            <td>{{ $line->item?->unit }}</td>
                            <td class="text-right">{{ $line->ordered_quantity }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="muted">No SKU line found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if ($order->notes)
            <div class="section">
                <h2>Notes</h2>
                <p class="muted">{{ $order->notes }}</p>
            </div>
        @endif

    </div>
</body>
</html>
