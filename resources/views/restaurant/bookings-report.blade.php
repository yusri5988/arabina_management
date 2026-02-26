<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <title>Laporan Tempahan - {{ $restaurant->name }}</title>
    <style>
        @page {
            margin: 1cm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10px;
            color: #1f2937;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }

        .header {
            border-bottom: 2px solid #064e3b;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .restaurant-name {
            font-size: 20px;
            font-weight: bold;
            color: #064e3b;
            text-transform: uppercase;
            margin: 0;
        }

        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin: 5px 0;
        }

        .report-meta {
            color: #6b7280;
            font-size: 9px;
        }

        .summary-grid {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }

        .summary-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: center;
        }

        .summary-label {
            display: block;
            font-size: 8px;
            text-transform: uppercase;
            color: #6b7280;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .summary-value {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #064e3b;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th {
            background-color: #064e3b;
            color: white;
            text-align: left;
            padding: 8px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
        }

        td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
        }

        .pax-details {
            font-size: 8px;
            color: #4b5563;
        }

        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            background: #f3f4f6;
        }

        .status-payment_done {
            background: #dcfce7;
            color: #166534;
        }

        .status-booked {
            background: #dbeafe;
            color: #1e40af;
        }

        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }

        .status-cancelled {
            background: #fee2e2;
            color: #991b1b;
        }

        .text-right {
            text-align: right;
        }

        .font-bold {
            font-weight: bold;
        }

        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 8px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 5px;
        }
    </style>
</head>

<body>
    <div class="header">
        <table style="width: 100%; border: none; margin-bottom: 0;">
            <tr>
                <td style="border: none; padding: 0;">
                    <h1 className="restaurant-name">{{ $restaurant->name }}</h1>
                    <div class="report-title">Laporan Tempahan Buffet Ramadhan</div>
                    <div class="report-meta">
                        Tarikh Buffet: {{ \Carbon\Carbon::parse($selectedDate)->format('d F Y') }}
                        @if($search) | Carian: "{{ $search }}" @endif
                    </div>
                </td>
                <td style="border: none; padding: 0; text-align: right; vertical-align: middle;">
                    <div style="font-size: 18px;">🌙</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="summary-grid">
        <tr>
            <td class="summary-card" style="width: 25%;">
                <span class="summary-label">Total Tempahan</span>
                <span class="summary-value">{{ $bookings->count() }}</span>
            </td>
            <td class="summary-card" style="width: 25%;">
                <span class="summary-label">Total Pax</span>
                <span class="summary-value">
                    {{ $bookings->sum(fn($b) => $b->adult_qty + $b->child_qty + $b->senior_qty) }}
                </span>
            </td>
            <td class="summary-card" style="width: 25%;">
                <span class="summary-label">Total Jualan (RM)</span>
                <span
                    class="summary-value">{{ number_format($bookings->where('status', '!=', 'cancelled')->sum('total_amount'), 2) }}</span>
            </td>
            <td class="summary-card" style="width: 25%;">
                <span class="summary-label">Total Dibayar (RM)</span>
                <span
                    class="summary-value">{{ number_format($bookings->where('status', '!=', 'cancelled')->sum('deposit_amount'), 2) }}</span>
            </td>
        </tr>
    </table>

    <table>
        <thead>
            <tr>
                <th style="width: 5%;">No.</th>
                <th style="width: 25%;">Pelanggan</th>
                <th style="width: 20%;">Jumlah Pax</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%; text-align: right;">Jumlah (RM)</th>
                <th style="width: 15%; text-align: right;">Bayaran (RM)</th>
                <th style="width: 5%; text-align: right;">Baki</th>
            </tr>
        </thead>
        <tbody>
            @forelse($bookings as $index => $booking)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <div class="font-bold">{{ $booking->customer_name }}</div>
                        <div style="color: #6b7280; font-size: 8px;">{{ $booking->customer_phone }}</div>
                    </td>
                    <td>
                        {{ $booking->adult_qty + $booking->child_qty + $booking->senior_qty }} pax
                    </td>
                    <td>
                        <span class="status-badge status-{{ $booking->status }}">
                            {{ str_replace('_', ' ', $booking->status) }}
                        </span>
                    </td>
                    <td class="text-right font-bold">{{ number_format($booking->total_amount, 2) }}</td>
                    <td class="text-right">{{ number_format($booking->deposit_amount ?: 0, 2) }}</td>
                    <td class="text-right font-bold"
                        style="color: {{ ($booking->total_amount - ($booking->deposit_amount ?: 0)) > 0 ? '#991b1b' : '#166534' }}">
                        {{ number_format($booking->total_amount - ($booking->deposit_amount ?: 0), 2) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #9ca3af;">
                        Tiada tempahan ditemui untuk kriteria ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Dicetak pada: {{ now()->format('d/m/Y H:i') }} | BuffetRamadhan System
    </div>
</body>

</html>