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
use App\Http\Controllers\LogsController;
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

    Route::middleware('module:item_catalog')->group(function () {
        Route::get('/items', [ItemController::class, 'index'])->name('items.index');
        Route::post('/items', [ItemController::class, 'store'])->name('items.store');
        Route::post('/items/bulk', [ItemController::class, 'bulkStore'])->name('items.bulk.store');
        Route::put('/items/{item}', [ItemController::class, 'update'])->name('items.update');
        Route::delete('/items/{item}', [ItemController::class, 'destroy'])->name('items.destroy');
    });

    Route::middleware('module:stock_list')->group(function () {
        Route::get('/items/stocks', [ItemController::class, 'stockList'])->name('items.stocks.index');
        Route::get('/items/stocks/audit', [ItemController::class, 'stockAuditForm'])->name('items.stocks.audit.form');
        Route::post('/items/stocks/audit', [ItemController::class, 'stockAuditStore'])->name('items.stocks.audit.store');
        Route::get('/items/stocks/audit/pdf', [ItemController::class, 'downloadStockAuditPdf'])->name('items.stocks.audit.pdf');
        Route::get('/items/stocks/pdf', [ItemController::class, 'downloadStockPdf'])->name('items.stocks.pdf');
    });

    Route::middleware('module:stock_in')->group(function () {
        Route::get('/items/stock/in', [ItemController::class, 'stockInForm'])->name('items.stock.in.form');
        Route::post('/items/stock/in', [ItemController::class, 'stockInStore'])->name('items.stock.in');
        Route::get('/items/stock/in/history', [ItemController::class, 'stockInHistory'])->name('items.stock.in.history');
    });

    Route::middleware('module:delivery_order')->group(function () {
        Route::get('/items/stock/out', [ItemController::class, 'stockOutForm'])->name('items.stock.out.form');
        Route::get('/items/stock/out/history', [ItemController::class, 'stockOutHistory'])->name('items.stock.out.history');
        Route::post('/items/stock/out', [ItemController::class, 'stockOutStore'])->name('items.stock.out');
        Route::get('/items/stock/out/delivery-orders', [ItemController::class, 'deliveryOrdersIndex'])->name('items.stock.out.delivery-orders');
        Route::get('/items/stock/out/do/{id}', [ItemController::class, 'downloadDoPdf'])->name('items.stock.out.do');
    });

    Route::middleware('module:sales_orders')->group(function () {
        Route::get('/orders', [SalesOrderController::class, 'index'])->name('sales.orders.index');
        Route::get('/orders/history', [SalesOrderController::class, 'history'])->name('sales.orders.history');
        Route::get('/orders/search-item', [SalesOrderController::class, 'searchItem'])->name('sales.orders.search.item');
        Route::post('/orders', [SalesOrderController::class, 'store'])->name('sales.orders.store');
    });

    Route::middleware('module:procurement')->group(function () {
        Route::get('/procurement', [ProcurementController::class, 'index'])->name('procurement.index');
        Route::post('/procurement/orders', [ProcurementController::class, 'store'])->name('procurement.orders.store');
        Route::get('/procurement/orders/{order}/pdf', [ProcurementController::class, 'pdf'])->name('procurement.orders.pdf');
        Route::post('/procurement/orders/{order}/lines', [ProcurementController::class, 'addLine'])->name('procurement.orders.lines.store');
        Route::post('/procurement/orders/{order}/packages', [ProcurementController::class, 'addPackageLine'])->name('procurement.orders.packages.store');
        Route::put('/procurement/orders/{order}/submit', [ProcurementController::class, 'submit'])->name('procurement.orders.submit');
        Route::put('/procurement/orders/{order}/receive', [ProcurementController::class, 'receive'])->name('procurement.orders.receive');
        Route::delete('/procurement/orders/{order}', [ProcurementController::class, 'destroy'])->name('procurement.orders.destroy');
    });

    Route::prefix('warehouse')->group(function () {
        Route::middleware('module:crn')->group(function () {
            Route::get('/crn', [CrnController::class, 'index'])->name('warehouse.crn.index');
            Route::get('/crn/{crn}/pdf', [CrnController::class, 'downloadPdf'])->name('warehouse.crn.pdf');
            Route::post('/crn/{crn}/eta', [CrnController::class, 'updateEta'])->name('warehouse.crn.eta');
            Route::post('/crn/{crn}/arrived', [CrnController::class, 'markAsArrived'])->name('warehouse.crn.arrived');
            Route::get('/crn/create', [CrnController::class, 'create'])->name('warehouse.crn.create');
            Route::post('/crn', [CrnController::class, 'store'])->name('warehouse.crn.store');
            Route::post('/crn/procurement/{order}/receive', [CrnController::class, 'receiveProcurement'])->name('warehouse.crn.procurement.receive');
            Route::post('/crn/procurement/{order}/lines/{line}/safe', [CrnController::class, 'safeProcurementLine'])->name('warehouse.crn.procurement.lines.safe');
            Route::post('/crn/{crn}/transfer', [CrnController::class, 'transfer'])->name('warehouse.crn.transfer');
        });
        Route::get('/rejections', [ProcurementController::class, 'rejectedList'])->middleware('module:rejected_list')->name('warehouse.rejections.index');
    });

    Route::middleware('module:create_package')->group(function () {
        Route::get('/packages', [PackageController::class, 'index'])->name('packages.index');
        Route::get('/packages/bulk/template', [PackageController::class, 'downloadBulkTemplate'])->name('packages.bulk.template');
        Route::post('/packages', [PackageController::class, 'store'])->name('packages.store');
        Route::post('/packages/bulk', [PackageController::class, 'bulkStore'])->name('packages.bulk.store');
        Route::put('/packages/{package}', [PackageController::class, 'update'])->name('packages.update');
        Route::delete('/packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');
    });

    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

Route::middleware(['auth'])->prefix('admin')->group(function () {
    Route::middleware('module:admin_users')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index'])->name('admin.users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('admin.users.store');
        Route::put('/users/{user}', [UserManagementController::class, 'update'])->name('admin.users.update');
        Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');
    });

    Route::middleware('module:admin_logs')->group(function () {
        Route::get('/logs', [LogsController::class, 'index'])->name('admin.logs.index');
        Route::get('/logs/{log}/pdf', [LogsController::class, 'pdf'])->name('admin.logs.pdf');
    });
});
