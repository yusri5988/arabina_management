<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Admin - {{ $tenant->name }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <style>
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: #fff;
            padding: 20px;
            border-radius: 12px;
            box-shadow: var(--shadow);
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
        }

        .stat-label {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th,
        td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        th {
            background-color: #f9fafb;
            font-weight: 600;
            color: var(--text-muted);
        }

        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .badge-pending {
            background-color: #fef3c7;
            color: #92400e;
        }

        .badge-booked {
            background-color: #dbeafe;
            color: #1e40af;
        }

        .badge-payment_done {
            background-color: #d1fae5;
            color: #065f46;
        }

        .badge-checked_in {
            background-color: #dbeafe;
            color: #1e40af;
        }

        .badge-cancelled {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 0.9rem;
            width: auto;
        }

        .logout-form {
            position: absolute;
            top: 20px;
            right: 20px;
        }
    </style>
</head>

<body>

    <div class="container" style="max-width: 800px;">

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: var(--primary);">{{ $tenant->name }}</h2>
            <form action="{{ route('admin.logout') }}" method="POST">
                @csrf
                <button type="submit"
                    style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: 600;">Log
                    Keluar</button>
            </form>
        </div>

        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-value">{{ $totalPaxToday }}</div>
                <div class="stat-label">Pax Hari Ini ({{ \Carbon\Carbon::parse($today)->format('d M') }})</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{ $tenant->bookings()->where('visit_date', $today)->count() }}</div>
                <div class="stat-label">Tempahan Hari Ini</div>
            </div>
        </div>

        <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <h3>Tempahan</h3>
            <form action="{{ route('admin.dashboard', $tenant->slug) }}" method="GET" style="display: flex; gap: 10px;">
                <input type="text" name="search" class="form-control" placeholder="Cari Nama / Phone / ID" value="{{ request('search') }}" style="width: 200px; padding: 8px;">
                <button type="submit" class="btn-primary btn-sm">Cari</button>
            </form>
        </div>
        <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Ref</th>
                            <th>Nama</th>
                            <th>Tarikh</th>
                            <th>Pax</th>
                            <th>Status</th>
                            <th>Tindakan</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($recentBookings as $booking)
                            <tr>
                                <td>{{ $booking->booking_ref }}</td>
                                <td>
                                    {{ $booking->name }}<br>
                                    <small class="text-muted">{{ $booking->phone }}</small>
                                </td>
                                <td>{{ \Carbon\Carbon::parse($booking->visit_date)->format('d/m') }}</td>
                                <td>{{ $booking->pax }}</td>
                                <td>
                                    <span class="badge badge-{{ $booking->status }}">
                                        {{ ucfirst($booking->status) }}
                                    </span>
                                </td>
                                <td>
                                    @if($booking->status == 'pending' || $booking->status == 'booked')
                                        <form
                                            action="{{ route('admin.checkin', ['slug' => $tenant->slug, 'bookingRef' => $booking->booking_ref]) }}"
                                            method="POST">
                                            @csrf
                                            <button type="submit" class="btn-primary btn-sm">Hadir</button>
                                        </form>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

        <footer>
            &copy; {{ date('Y') }} BuffetRamadhan System - Peniaga Dashboard
        </footer>
    </div>

</body>

</html>
