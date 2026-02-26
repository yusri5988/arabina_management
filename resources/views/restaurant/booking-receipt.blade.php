<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <title>Resit Tempahan #{{ $booking->id }}</title>
    <style>
        @page {
            margin: 0cm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #1f2937;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        .container {
            padding: 2cm;
        }
        .header {
            border-bottom: 3px solid #064e3b;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .restaurant-name {
            font-size: 24px;
            font-weight: bold;
            color: #064e3b;
            margin: 0;
            text-transform: uppercase;
        }
        .restaurant-info {
            font-size: 10px;
            color: #6b7280;
            margin-top: 5px;
        }
        .receipt-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .info-table {
            width: 100%;
            margin-bottom: 40px;
        }
        .info-td {
            vertical-align: top;
            width: 50%;
        }
        .label {
            font-size: 9px;
            font-weight: bold;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .value {
            font-size: 12px;
            font-weight: bold;
            color: #111827;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
            text-align: left;
            padding: 12px 10px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #4b5563;
        }
        .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 11px;
        }
        
        .summary-wrapper {
            float: right;
            width: 40%;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-table td {
            padding: 8px 0;
            font-size: 11px;
        }
        .summary-label {
            color: #6b7280;
        }
        .summary-value {
            text-align: right;
            font-weight: bold;
            color: #111827;
        }
        .total-row td {
            border-top: 2px solid #064e3b;
            padding-top: 15px;
            font-size: 14px;
            font-weight: 200;
        }
        .total-label {
            font-weight: bold;
            color: #064e3b;
            text-transform: uppercase;
        }
        .total-value {
            font-size: 20px;
            font-weight: 900;
            color: #064e3b;
            text-align: right;
        }

        .status-stamp {
            position: absolute;
            top: 150px;
            right: 100px;
            border: 4px double #064e3b;
            color: #064e3b;
            font-size: 20px;
            font-weight: bold;
            padding: 10px 20px;
            transform: rotate(-15deg);
            opacity: 0.2;
            text-transform: uppercase;
            border-radius: 10px;
        }

        .footer {
            margin-top: 100px;
            padding-top: 20px;
            border-top: 1px solid #f3f4f6;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
        }
        .clearfix {
            clear: both;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status-stamp">{{ str_replace('_', ' ', $booking->status) }}</div>

        <div class="header">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 60%;">
                        <div class="restaurant-name">{{ $restaurant->name }}</div>
                        <div class="restaurant-info">
                            Portal Tempahan Buffet Ramadhan<br>
                            Sistem BuffetRamadhan
                        </div>
                    </td>
                    <td style="width: 40%; text-align: right; vertical-align: middle;">
                        <div class="receipt-title">Resit Tempahan</div>
                        <div class="value" style="color: #064e3b;">#{{ str_pad($booking->id, 6, '0', STR_PAD_LEFT) }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <table class="info-table">
            <tr>
                <td class="info-td">
                    <div class="label">Disediakan Untuk</div>
                    <div class="value">{{ $booking->customer_name }}</div>
                    <div class="value" style="font-weight: normal;">{{ $booking->customer_phone }}</div>
                </td>
                <td class="info-td" style="text-align: right;">
                    <div class="label">Tarikh Buffet</div>
                    <div class="value">{{ \Carbon\Carbon::parse($booking->booking_date)->format('d F Y') }}</div>
                    <div class="label" style="margin-top: 10px;">Masa</div>
                    <div class="value">Waktu Berbuka Puasa</div>
                </td>
            </tr>
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Perkara</th>
                    <th style="text-align: center;">Kuantiti</th>
                    <th style="text-align: right;">Harga Unit (RM)</th>
                    <th style="text-align: right;">Jumlah (RM)</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($booking->items as $item)
                    <tr>
                        <td>{{ $item->product_name_snapshot }}</td>
                        <td style="text-align: center;">{{ $item->quantity }}</td>
                        <td style="text-align: right;">{{ number_format($item->unit_price_snapshot, 2) }}</td>
                        <td style="text-align: right;">{{ number_format($item->line_total, 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align: center; color: #6b7280;">Tiada item produk.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="summary-wrapper">
            <table class="summary-table">
                <tr>
                    <td class="summary-label">Jumlah Keseluruhan</td>
                    <td class="summary-value">RM {{ number_format($total, 2) }}</td>
                </tr>
                <tr>
                    <td class="summary-label">Bayaran Diterima (Paid)</td>
                    <td class="summary-value" style="color: #166534;">- RM {{ number_format($deposit, 2) }}</td>
                </tr>
                <tr class="total-row">
                    <td class="total-label">Baki Bayaran</td>
                    <td class="total-value">RM {{ number_format($balance, 2) }}</td>
                </tr>
            </table>
        </div>
        
        <div class="clearfix"></div>

        <div class="footer">
            <p>Terima kasih kerana memilih <strong>{{ $restaurant->name }}</strong>.</p>
            <p>Sila simpan resit ini untuk rujukan semasa pendaftaran masuk (check-in) nanti.</p>
            <div style="margin-top: 20px; font-style: italic; color: #d1d5db;">
                Dicetak secara digital pada {{ now()->format('d/m/Y H:i:s') }}
            </div>
        </div>
    </div>
</body>
</html>
