<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Order - {{ $doCode }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; color: #1b580e; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { vertical-align: top; padding: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { bg-color: #f5f5f5; font-weight: bold; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 10px; color: #777; border-top: 1px solid #eee; padding-top: 5px; }
        .signatures { margin-top: 50px; width: 100%; }
        .signatures td { width: 50%; text-align: center; }
        .signature-box { margin-top: 60px; border-top: 1px solid #333; display: inline-block; width: 150px; }
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
    @endphp

    <div class="header">
        <h1>ARABINA INVENTORY</h1>
        <p>DELIVERY ORDER</p>
    </div>

    <table class="info-table">
        <tr>
            <td style="width: 50%;">
                <strong>Delivery To:</strong><br>
                {{ optional($transaction->salesOrder)->customer_name ?? 'N/A' }}<br>
                {{ optional($transaction->salesOrder)->customer_address ?? '' }}
            </td>
            <td style="width: 50%; text-align: right;">
                <strong>DO Number:</strong> {{ $doCode }}<br>
                <strong>SO Number:</strong> {{ optional($transaction->salesOrder)->code ?? 'N/A' }}<br>
                <strong>DO Date(s):</strong> {{ isset($doDates) ? $doDates->implode(' | ') : $transaction->created_at->format('d/m/Y H:i') }}<br>
                <strong>Created By:</strong> {{ optional($transaction->creator)->name ?? 'System' }}
            </td>
        </tr>
    </table>

    @if($transaction->notes)
    <div style="margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-left: 4px solid #1b580e;">
        <strong>Notes:</strong><br>
        {{ $transaction->notes }}
    </div>
    @endif

    @foreach(($shipmentGroups ?? collect()) as $sIndex => $shipment)
    <div style="margin-bottom: 12px; padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
        <strong>Shipment {{ $sIndex + 1 }}:</strong>
        {{ $shipment['date'] }} | By: {{ $shipment['creator'] }}
    </div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">SKU</th>
                <th style="width: 55%;">Item Name</th>
                <th style="width: 15%; text-align: right;">Quantity</th>
            </tr>
        </thead>
        <tbody>
            @foreach(($shipment['lines'] ?? []) as $index => $line)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $line['sku'] }}</td>
                <td>{{ $line['name'] }}</td>
                <td style="text-align: right;">{{ $formatQuantity($line['quantity']) }} {{ $line['unit'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endforeach

    @if(($returnGroups ?? collect())->isNotEmpty())
    <div style="margin-top: 30px; border-top: 2px dashed #dc2626; padding-top: 15px;">
        <h2 style="font-size: 16px; color: #dc2626; margin-top: 0;">RETURN RECORDS</h2>
        @foreach($returnGroups as $rIndex => $return)
        <div style="margin-bottom: 12px; padding: 8px 10px; background: #fff1f2; border: 1px solid #fecaca;">
            <strong style="color: #be123c;">Return Transaction {{ $rIndex + 1 }}:</strong>
            {{ $return['date'] }} | By: {{ $return['creator'] }}
        </div>
        <table class="items-table" style="border: 1px solid #fecaca; margin-bottom: 25px;">
            <thead style="background-color: #fff1f2;">
                <tr>
                    <th style="width: 5%; color: #be123c;">No</th>
                    <th style="width: 25%; color: #be123c;">SKU</th>
                    <th style="width: 55%; color: #be123c;">Item Name</th>
                    <th style="width: 15%; text-align: right; color: #be123c;">Returned Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($return['lines'] as $index => $line)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line['sku'] }}</td>
                    <td>{{ $line['name'] }}</td>
                    <td style="text-align: right; font-weight: bold; color: #be123c;">{{ $formatQuantity($line['quantity']) }} {{ $line['unit'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endforeach
    </div>
    @endif

    <table class="signatures">
        <tr>
            <td>
                <p>Issued By,</p>
                <div class="signature-box"></div>
                <p>Warehouse Dept</p>
            </td>
            <td>
                <p>Received By,</p>
                <div class="signature-box"></div>
                <p>Customer Signature</p>
            </td>
        </tr>
    </table>

    <div class="footer">
        Generated on {{ $generatedAt }}
    </div>
</body>
</html>
