<?php

namespace App\Http\Controllers;

use App\Models\TransactionLog;
use Inertia\Inertia;
use Inertia\Response;

class LogsController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Logs', [
            'logs' => TransactionLog::with('user:id,name')->latest()->paginate(50),
        ]);
    }
}