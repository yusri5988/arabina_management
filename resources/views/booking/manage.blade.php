<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urus Tempahan - {{ $tenant->name }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <style>
         .section-title {
             font-size: 1.2rem;
             color: var(--primary);
             font-weight: 700;
             margin-top: 30px;
             margin-bottom: 15px;
             border-bottom: 1px solid #e5e7eb;
             padding-bottom: 5px;
         }
         .message-success {
             color: #065f46;
             background-color: #d1fae5;
             padding: 10px;
             border-radius: 8px;
             margin-bottom: 15px;
             text-align: center;
         }
    </style>
</head>
<body>

<div class="container">
    <div class="card">
        <div class="header">
            <h1>Urus Tempahan</h1>
            <p>{{ $booking->booking_ref }}</p>
        </div>

        @if (session('success'))
            <div class="message-success">
                {{ session('success') }}
            </div>
        @endif

        @if ($errors->any())
            <div class="alert-danger">
                <ul>
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <div class="booking-details">
             <div class="section-title">Maklumat Terkini</div>
             <p><strong>Nama:</strong> {{ $booking->name }}</p>
             <p><strong>Phone:</strong> {{ $booking->phone }}</p>
             <p><strong>Status:</strong> {{ ucfirst($booking->status) }}</p>
        </div>

        <div class="section-title">Lakukan Perubahan</div>

        <form action="{{ route('booking.update', ['slug' => $tenant->slug, 'bookingRef' => $booking->booking_ref]) }}" method="POST">
            @csrf
            @method('PUT')
            
            <div class="form-group">
                <label for="visit_date">Tarikh Berbuka</label>
                <input type="date" id="visit_date" name="visit_date" class="form-control" 
                       min="{{ date('Y-m-d') }}" required value="{{ old('visit_date', $booking->visit_date->format('Y-m-d')) }}">
            </div>

            <div class="form-group">
                <label for="pax">Jumlah Pax</label>
                <input type="number" id="pax" name="pax" class="form-control" 
                       min="1" max="100" required value="{{ old('pax', $booking->pax) }}">
            </div>

            <button type="submit" class="btn-primary">Kemaskini Tempahan</button>
        </form>

        <div style="margin-top: 30px; text-align: center;">
            <a href="{{ route('booking.form', $tenant->slug) }}" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                Masuk Booking ID Lain
            </a>
        </div>
    </div>

    <footer>
        &copy; {{ date('Y') }} BuffetRamadhan System
    </footer>
</div>

</body>
</html>
