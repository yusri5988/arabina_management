<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Sukses - {{ $tenant->name }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <style>
        .success-icon {
            color: var(--primary);
            font-size: 3rem;
            margin-bottom: 20px;
        }

        .ref-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            border: 2px dashed #d1d5db;
        }

        .ref-number {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--text-main);
            letter-spacing: 1px;
            margin-top: 5px;
            display: block;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 10px;
        }

        .detail-label {
            color: var(--text-muted);
        }

        .detail-value {
            font-weight: 600;
            text-align: right;
        }

        .screenshot-alert {
            background-color: #fffbeb;
            border: 1px solid #fcd34d;
            color: #92400e;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
            font-weight: 600;
        }
    </style>
</head>

<body>

    <div class="container">
        <div class="card">
            <div class="header">
                <div class="success-icon">✓</div>
                <h1>Tempahan Berjaya!</h1>
                <p>{{ $tenant->name }}</p>
            </div>

            <div class="ref-box">
                <small>Booking ID</small>
                <span class="ref-number">{{ $booking->booking_ref }}</span>
            </div>

            <div class="booking-details">
                <div class="detail-row">
                    <span class="detail-label">Tarikh</span>
                    <span class="detail-value">{{ \Carbon\Carbon::parse($booking->visit_date)->format('d M Y') }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Jumlah</span>
                    <span class="detail-value">{{ $booking->pax }} Pax</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nama</span>
                    <span class="detail-value">{{ $booking->name }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">{{ $booking->phone }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color: var(--primary)">{{ ucfirst($booking->status) }}</span>
                </div>
            </div>

            <div class="screenshot-alert">
                📸 Sila screenshot paparan ini sebagai bukti tempahan.
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="{{ route('booking.form', $tenant->slug) }}"
                    style="color: var(--primary); text-decoration: none; font-weight: 600;">
                    Tempah Lagi
                </a>
            </div>
        </div>

        <footer>
            &copy; {{ date('Y') }} BuffetRamadhan System
        </footer>
    </div>

</body>

</html>