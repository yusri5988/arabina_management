<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BuffetRamadhan - Tempah Buffet Berbuka Anda</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <style>
        body {
            background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
            min-height: 100vh;
        }

        .hero {
            text-align: center;
            padding: 60px 20px;
            color: white;
        }

        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .hero p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .container {
            max-width: 600px;
        }

        .tenant-grid {
            display: grid;
            gap: 20px;
            margin-top: 30px;
        }

        .tenant-card {
            background: white;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .tenant-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        }

        .tenant-name {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 8px;
        }

        .tenant-info {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .tenant-price {
            margin-top: 15px;
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--accent);
        }

        .admin-link {
            margin-top: 40px;
            text-align: center;
        }

        .admin-link a {
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-size: 0.9rem;
        }

        .admin-link a:hover {
            color: white;
        }

        footer {
            color: rgba(255, 255, 255, 0.6);
            margin-top: 40px;
        }
    </style>
</head>

<body>

    <div class="hero">
        <h1>🌙 BuffetRamadhan</h1>
        <p>Tempah buffet berbuka puasa anda dengan mudah!</p>
    </div>

    <div class="container">
        <div class="tenant-grid">
            @forelse($tenants as $tenant)
                <a href="{{ route('booking.form', $tenant->slug) }}" class="tenant-card">
                    <div class="tenant-name">{{ $tenant->name }}</div>
                    <div class="tenant-info">
                        Kapasiti: {{ $tenant->capacity_per_day }} pax/hari
                    </div>
                    @if($tenant->price)
                        <div class="tenant-price">RM {{ number_format($tenant->price, 2) }} / pax</div>
                    @endif
                </a>
            @empty
                <div class="card" style="text-align: center; padding: 40px;">
                    <p>Tiada warung tersedia buat masa ini.</p>
                </div>
            @endforelse
        </div>

        <div class="admin-link">
            <a href="{{ route('admin.login') }}">🔐 Login Peniaga</a>
        </div>

        <footer>
            &copy; {{ date('Y') }} BuffetRamadhan System
        </footer>
    </div>

</body>

</html>