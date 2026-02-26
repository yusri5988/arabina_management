<?php

use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CrnController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.store');
});

Route::middleware('auth')->group(function () {
    Route::get('/csrf-token', function () {
        return response()->json([
            'token' => csrf_token(),
        ]);
    })->name('csrf.token');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/warehouse', function () {
        return Inertia::render('Warehouse/Index');
    })->name('warehouse.index');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');

    Route::get('/items', [ItemController::class, 'index'])->name('items.index');
    Route::get('/items/stocks', [ItemController::class, 'stockList'])->name('items.stocks.index');
    Route::post('/items', [ItemController::class, 'store'])->name('items.store');
    Route::get('/items/stock/in', [ItemController::class, 'stockInForm'])->name('items.stock.in.form');
    Route::get('/items/stock/out', [ItemController::class, 'stockOutForm'])->name('items.stock.out.form');
    Route::post('/items/stock/in', [ItemController::class, 'stockInStore'])->name('items.stock.in');
    Route::post('/items/stock/out', [ItemController::class, 'stockOutStore'])->name('items.stock.out');
    Route::get('/orders', [SalesOrderController::class, 'index'])->name('sales.orders.index');
    Route::get('/orders/history', [SalesOrderController::class, 'history'])->name('sales.orders.history');
    Route::post('/orders', [SalesOrderController::class, 'store'])->name('sales.orders.store');
    Route::get('/procurement', [ProcurementController::class, 'index'])->name('procurement.index');
    Route::post('/procurement/orders', [ProcurementController::class, 'store'])->name('procurement.orders.store');
    Route::get('/procurement/orders/{order}/pdf', [ProcurementController::class, 'pdf'])->name('procurement.orders.pdf');
    Route::post('/procurement/orders/{order}/lines', [ProcurementController::class, 'addLine'])->name('procurement.orders.lines.store');
    Route::put('/procurement/orders/{order}/receive', [ProcurementController::class, 'receive'])->name('procurement.orders.receive');
    Route::delete('/procurement/orders/{order}', [ProcurementController::class, 'destroy'])->name('procurement.orders.destroy');
    Route::get('/rejections', [ProcurementController::class, 'rejectedList'])->name('rejections.index');

    Route::prefix('warehouse')->group(function () {
        Route::get('/crn', [CrnController::class, 'index'])->name('warehouse.crn.index');
        Route::get('/crn/create', [CrnController::class, 'create'])->name('warehouse.crn.create');
        Route::post('/crn', [CrnController::class, 'store'])->name('warehouse.crn.store');
        Route::post('/crn/procurement/{order}/receive', [CrnController::class, 'receiveProcurement'])->name('warehouse.crn.procurement.receive');
        Route::post('/crn/procurement/{order}/lines/{line}/safe', [CrnController::class, 'safeProcurementLine'])->name('warehouse.crn.procurement.lines.safe');
        Route::post('/crn/{crn}/transfer', [CrnController::class, 'transfer'])->name('warehouse.crn.transfer');
    });

    Route::middleware('role:super_admin')->group(function () {
        Route::get('/packages', [PackageController::class, 'index'])->name('packages.index');
        Route::post('/packages', [PackageController::class, 'store'])->name('packages.store');
        Route::delete('/packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');
    });

    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

Route::middleware(['auth', 'role:super_admin'])->prefix('admin')->group(function () {
    Route::get('/users', [UserManagementController::class, 'index'])->name('admin.users.index');
    Route::post('/users', [UserManagementController::class, 'store'])->name('admin.users.store');
    Route::put('/users/{user}', [UserManagementController::class, 'update'])->name('admin.users.update');
    Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');
});
