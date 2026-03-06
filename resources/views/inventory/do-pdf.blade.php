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
    <div class="header">
        <h1>ARABINA INVENTORY</h1>
        <p>DELIVERY ORDER</p>
    </div>

    <table class="info-table">
        <tr>
            <td style="width: 50%;">
                <strong>Delivery To:</strong><br>
                {{ $transaction->salesOrder?->customer_name ?? 'N/A' }}<br>
                {{ $transaction->salesOrder?->customer_address ?? '' }}
            </td>
            <td style="width: 50%; text-align: right;">
                <strong>DO Number:</strong> {{ $doCode }}<br>
                <strong>SO Number:</strong> {{ $transaction->salesOrder?->code ?? 'N/A' }}<br>
                <strong>DO Date(s):</strong> {{ isset($doDates) ? $doDates->implode(' | ') : $transaction->created_at->format('d/m/Y H:i') }}<br>
                <strong>Created By:</strong> {{ $transaction->creator?->name ?? 'System' }}
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
                <td style="text-align: right;">{{ $line['quantity'] }} {{ $line['unit'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endforeach

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
