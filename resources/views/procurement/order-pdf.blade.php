<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order - {{ $order->code }}</title>
    <style>
        @page {
            margin: 0;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #1e293b;
            line-height: 1.5;
            background-color: #ffffff;
        }
        .container {
            padding: 40px;
        }
        .header {
            border-bottom: 2px solid #0f5132;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header-content {
            display: table;
            width: 100%;
        }
        .brand {
            display: table-cell;
            vertical-align: middle;
        }
        .brand h1 {
            margin: 0;
            color: #0f5132;
            font-size: 28px;
            letter-spacing: -0.02em;
            font-weight: 900;
        }
        .brand p {
            margin: 0;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: #64748b;
            font-weight: bold;
        }
        .po-title {
            display: table-cell;
            text-align: right;
            vertical-align: middle;
        }
        .po-title h2 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #0f5132;
        }
        .meta-info {
            display: table;
            width: 100%;
            margin-bottom: 40px;
        }
        .meta-col {
            display: table-cell;
            width: 50%;
        }
        .meta-item {
            margin-bottom: 8px;
            font-size: 12px;
        }
        .meta-label {
            color: #64748b;
            font-weight: bold;
            width: 100px;
            display: inline-block;
        }
        .meta-value {
            color: #0f172a;
            font-weight: bold;
        }
        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #0f5132;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-weight: 900;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
            background-color: #f8fafc;
        }
        td {
            padding: 12px 15px;
            font-size: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .item-code {
            font-weight: bold;
            color: #0f172a;
        }
        .item-name {
            color: #64748b;
            font-size: 11px;
        }
        .qty-badge {
            font-weight: 900;
            color: #0f5132;
            text-align: right;
        }
        .footer {
            position: fixed;
            bottom: 40px;
            left: 40px;
            right: 40px;
        }
        .notes-section {
            margin-top: 20px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #e2e8f0;
        }
        .notes-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 5px;
        }
        .notes-content {
            font-size: 11px;
            color: #475569;
            font-style: italic;
        }
        .signature-table {
            width: 100%;
            margin-top: 50px;
        }
        .sig-cell {
            width: 50%;
            padding-top: 40px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
    </style>
</head>
<body>
    @php
        $formatQuantity = function ($quantity) {
            $normalized = round((float) $quantity, 1);

            if (abs($normalized - round($normalized)) < 0.00001) {
                return (string) (int) round($normalized);
            }

            return number_format($normalized, 1, '.', '');
        };

        // Logic to extract loose SKUs (same as frontend)
        $pkgLines = $order->packageLines;
        $allLines = $order->lines;
        
        $looseLines = $allLines->map(function($line) use ($pkgLines) {
            $looseQty = round((float) $line->ordered_quantity, 1);
            foreach ($pkgLines as $pLine) {
                if ($pLine->package && $pLine->package->packageItems) {
                    $pItem = $pLine->package->packageItems->firstWhere('item_id', $line->item_id);
                    if ($pItem) {
                        $looseQty = round($looseQty - ($pLine->quantity * $pItem->quantity), 1);
                    }
                }
            }
            return (object)[
                'sku' => $line->item->sku ?? '-',
                'name' => $line->item->name ?? '-',
                'qty' => $looseQty
            ];
        })->filter(function ($line) {
            return $line->qty > 0;
        });

        $bomGroups = [
            'cabin' => 'BOM Cabin',
            'hardware' => 'BOM Hardware',
            'hardware_site' => 'BOM Hardware Site',
        ];
        $knownScopes = array_keys($bomGroups);
    @endphp

    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="brand">
                    <h1>ARABINA</h1>
                    <p>Inventory Management System</p>
                </div>
                <div class="po-title">
                    <h2>Purchase Order</h2>
                </div>
            </div>
        </div>

        <div class="meta-info">
            <div class="meta-col">
                <div class="meta-item">
                    <span class="meta-label">PO Number:</span>
                    <span class="meta-value">{{ $order->code }}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Date:</span>
                    <span class="meta-value">{{ optional($order->created_at)->format('d F Y') }}</span>
                </div>
            </div>
            <div class="meta-col" style="text-align: right;">
                <div class="meta-item">
                    <span class="meta-label">Status:</span>
                    <span class="meta-value" style="text-transform: uppercase;">{{ $order->status }}</span>
                </div>
            </div>
        </div>

        <div class="section-title">Order Summary (Packages & Loose Items)</div>
        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th style="text-align: right;">Quantity</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($order->packageLines as $pLine)
                    <tr>
                        <td>
                            <div class="item-code">{{ $pLine->package->code ?? '-' }}</div>
                            <div class="item-name">{{ $pLine->package->name ?? '-' }}</div>
                        </td>
                        <td style="color: #3b82f6; font-weight: bold; font-size: 10px; text-transform: uppercase;">Package</td>
                        <td class="qty-badge">x{{ $formatQuantity($pLine->quantity) }}</td>
                    </tr>
                @endforeach

                @foreach ($looseLines as $lLine)
                    <tr>
                        <td>
                            <div class="item-code">{{ $lLine->sku }}</div>
                            <div class="item-name">{{ $lLine->name }}</div>
                        </td>
                        <td style="color: #10b981; font-weight: bold; font-size: 10px; text-transform: uppercase;">Loose SKU</td>
                        <td class="qty-badge">x{{ $formatQuantity($lLine->qty) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="section-title">Technical Detail (All Component SKUs)</div>
        @foreach ($bomGroups as $scope => $label)
            @php
                $scopedLines = $order->lines->filter(function ($line) use ($scope) {
                    return ($line->item->bom_scope ?? 'hardware') === $scope;
                });
            @endphp

            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #334155; margin-bottom: 8px; margin-top: 14px;">
                {{ $label }}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>SKU Code</th>
                        <th>Full Item Name</th>
                        <th>Unit</th>
                        <th style="text-align: right;">Total Qty</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($scopedLines as $line)
                        <tr>
                            <td class="item-code">{{ $line->item->sku ?? '-' }}</td>
                            <td class="item-name">{{ $line->item->name ?? '-' }}</td>
                            <td style="font-size: 10px; color: #64748b;">{{ $line->item_unit ?? ($line->item->unit ?? 'PCS') }}</td>
                            <td class="qty-badge">{{ $formatQuantity($line->ordered_quantity) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" style="text-align: center; color: #94a3b8;">No SKU in this BOM category.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        @endforeach

        @php
            $unclassifiedLines = $order->lines->filter(function ($line) use ($knownScopes) {
                $scope = optional($line->item)->bom_scope ?? 'hardware';
                return ! in_array($scope, $knownScopes, true);
            });
        @endphp

        @if ($unclassifiedLines->isNotEmpty())
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #334155; margin-bottom: 8px; margin-top: 14px;">
                Unclassified BOM
            </div>
            <table>
                <thead>
                    <tr>
                        <th>SKU Code</th>
                        <th>Full Item Name</th>
                        <th>Unit</th>
                        <th style="text-align: right;">Total Qty</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($unclassifiedLines as $line)
                        <tr>
                            <td class="item-code">{{ $line->item->sku ?? '-' }}</td>
                            <td class="item-name">{{ $line->item->name ?? '-' }}</td>
                            <td style="font-size: 10px; color: #64748b;">{{ $line->item_unit ?? ($line->item->unit ?? 'PCS') }}</td>
                            <td class="qty-badge">{{ $formatQuantity($line->ordered_quantity) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        @if($order->notes)
            <div class="notes-section">
                <div class="notes-title">Internal Notes</div>
                <div class="notes-content">"{{ $order->notes }}"</div>
            </div>
        @endif

        <div class="footer">
            <table class="signature-table">
                <tr>
                    <td class="sig-cell" style="border-bottom: none;">
                        Authorized Signature
                    </td>
                    <td style="width: 10%; border-bottom: none;"></td>
                    <td class="sig-cell" style="border-bottom: none;">
                        Supplier Acknowledgment
                    </td>
                </tr>
            </table>
            <div style="text-align: center; font-size: 9px; color: #cbd5e1; margin-top: 20px;">
                Generated by Arabina Inventory System on {{ now()->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>
