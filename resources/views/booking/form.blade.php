<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Buffet - {{ $tenant->name }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>
<body>

<div class="container">
    <div class="card">
        <div class="header">
            <h1>{{ $tenant->name }}</h1>
            <p>Tempahan Buffet Ramadhan</p>
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

        @if($tenant->policy)
            <div class="policy-box">
                <strong>Polisi:</strong> {{ $tenant->policy }}
            </div>
        @endif

        <form action="{{ route('booking.store', $tenant->slug) }}" method="POST">
            @csrf
            
            <div class="form-group">
                <label for="visit_date">Tarikh Berbuka</label>
                <input type="date" id="visit_date" name="visit_date" class="form-control" 
                       min="{{ date('Y-m-d') }}" required value="{{ old('visit_date') }}">
            </div>

            <div class="form-group">
                <label for="pax">Jumlah Pax</label>
                <input type="number" id="pax" name="pax" class="form-control" 
                       min="1" max="100" required value="{{ old('pax') }}" placeholder="Contoh: 5">
            </div>

            <div class="form-group">
                <label for="name">Nama Penuh</label>
                <input type="text" id="name" name="name" class="form-control" 
                       required value="{{ old('name') }}" placeholder="Nama anda">
            </div>

            <div class="form-group">
                <label for="phone">No. Telefon (WhatsApp)</label>
                <input type="tel" id="phone" name="phone" class="form-control" 
                       required value="{{ old('phone') }}" placeholder="0123456789">
            </div>

            <button type="submit" class="btn-primary">Hantar Tempahan</button>
        </form>
    </div>

    <footer>
        &copy; {{ date('Y') }} BuffetRamadhan System
    </footer>
</div>

</body>
</html>
