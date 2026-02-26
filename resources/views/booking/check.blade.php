<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Semak Tempahan - {{ $tenant->name }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>

<body>

    <div class="container">
        <div class="card">
            <div class="header">
                <h1>Semak Tempahan</h1>
                <p>{{ $tenant->name }}</p>
            </div>

            @if ($errors->any())
                <div class="alert-danger">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            @if (session('error'))
                <div class="alert-danger">
                    {{ session('error') }}
                </div>
            @endif

            <form action="{{ route('booking.process_check', $tenant->slug) }}" method="POST">
                @csrf

                <div class="form-group">
                    <label for="booking_ref">ID Tempahan</label>
                    <input type="text" id="booking_ref" name="booking_ref" class="form-control" required
                        value="{{ old('booking_ref') }}" placeholder="Contoh: REF-ABC1234">
                </div>

                <div class="form-group">
                    <label for="phone">No. Telefon</label>
                    <input type="tel" id="phone" name="phone" class="form-control" required value="{{ old('phone') }}"
                        placeholder="0123456789">
                </div>

                <button type="submit" class="btn-primary">Semak</button>
            </form>

            <div style="margin-top: 20px; text-align: center;">
                <a href="{{ route('booking.form', $tenant->slug) }}"
                    style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                    ← Kembali ke Tempahan Baru
                </a>
            </div>
        </div>

        <footer>
            &copy; {{ date('Y') }} BuffetRamadhan System
        </footer>
    </div>

</body>

</html>