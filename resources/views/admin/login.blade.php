<!DOCTYPE html>
<html lang="ms">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Peniaga - BuffetRamadhan</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>

<body>

    <div class="container">
        <div class="card">
            <div class="header">
                <h1>Login Peniaga</h1>
                <p>Uruskan tempahan buffet anda</p>
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

            <form action="{{ route('admin.login.submit') }}" method="POST">
                @csrf

                <div class="form-group">
                    <label for="slug">Tenant Slug (ID Warung)</label>
                    <input type="text" id="slug" name="slug" class="form-control" required value="{{ old('slug') }}"
                        placeholder="Contoh: warungbambam">
                </div>

                <div class="form-group">
                    <label for="password">Kata Laluan</label>
                    <input type="password" id="password" name="password" class="form-control" required
                        placeholder="********">
                </div>

                <button type="submit" class="btn-primary">Log Masuk</button>
            </form>
        </div>
    </div>

</body>

</html>