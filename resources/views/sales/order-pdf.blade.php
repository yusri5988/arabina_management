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

        .bom-title {
            margin: 14px 0 6px;
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            padding: 4px 8px;
            background: #e8f5e3;
            border-left: 3px solid #1b580e;
        }

        .package-header {
            margin: 24px 0 8px;
            padding: 8px 10px;
            background: #1b580e;
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
        }

        table.items th,
        table.items td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
        }

        table.items th {
            background: #f3f4f6;
            text-align: left;
            font-size: 11px;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
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

        .page-break {
            page-break-before: always;
        }

        .summary-badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 10px;
            border-radius: 4px;
            font-weight: bold;
        }

        .badge-package {
            background: #dbeafe;
            color: #1e40af;
        }

        .badge-loose {
            background: #fef3c7;
            color: #92400e;
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

    {{-- Order Summary --}}
    <div class="section-title">Order Summary</div>
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

    {{-- BOM Breakdown per Package --}}
    @php
        $bomTypeLabels = [
            'cabin' => 'Cabin',
            'hardware' => 'Hardware',
            'hardware_site' => 'Hardware Site',
        ];

        $packageLines = $order->lines->filter(fn($l) => $l->package_id);
    @endphp

    @if ($packageLines->isNotEmpty())
        <div class="page-break"></div>

        <div class="header">
            <h1>Package SKU Breakdown</h1>
            <p>Order: {{ $order->code }} &mdash; {{ $order->customer_name }}</p>
        </div>

        @foreach ($packageLines as $line)
            @php
                $package = $line->package;
                $qty = (int) $line->package_quantity;
            @endphp

            @if ($package)
                <div class="package-header">
                    {{ $package->code }} &mdash; {{ $package->name }} (x{{ $qty }})
                </div>

                @php
                    $boms = $package->boms->sortBy(function ($bom) {
                        $order = ['cabin' => 1, 'hardware' => 2, 'hardware_site' => 3];
                        return $order[$bom->type] ?? 99;
                    });
                @endphp

                @if ($boms->isEmpty())
                    <p class="muted" style="margin-left: 10px;">No BOM defined for this package.</p>
                @else
                    @foreach ($boms as $bom)
                        <div class="bom-title">
                            {{ $bomTypeLabels[$bom->type] ?? ucfirst($bom->type) }}
                            &mdash; {{ $bom->code }} {{ $bom->name }}
                        </div>

                        @if ($bom->bomItems->isEmpty())
                            <p class="muted" style="margin-left: 10px; font-size: 11px;">No items in this BOM.</p>
                        @else
                            <table class="items">
                                <thead>
                                    <tr>
                                        <th style="width: 8%;">No</th>
                                        <th style="width: 22%;">SKU</th>
                                        <th>Item Name</th>
                                        <th style="width: 12%;" class="text-center">Unit</th>
                                        <th style="width: 12%;" class="text-right">Qty/Pkg</th>
                                        <th style="width: 12%;" class="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($bom->bomItems as $bi => $bomItem)
                                        <tr>
                                            <td>{{ $bi + 1 }}</td>
                                            <td>{{ optional($bomItem->item)->sku ?? '-' }}</td>
                                            <td>{{ optional($bomItem->item)->name ?? '-' }}</td>
                                            <td class="text-center">{{ optional($bomItem->item)->unit ?? '-' }}</td>
                                            <td class="text-right">{{ $bomItem->quantity }}</td>
                                            <td class="text-right">{{ $bomItem->quantity * $qty }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        @endif
                    @endforeach
                @endif
            @endif
        @endforeach
    @endif

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