<?php

namespace App\Http\Controllers;

use App\Models\ContainerReceivingNote;
use App\Models\InventoryTransaction;
use App\Models\MaterialReceivingNote;
use App\Models\ProcurementOrder;
use App\Models\SalesOrder;
use App\Models\SiteReceivingNote;
use App\Models\TransactionLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use App\Models\ProcessLog;
use Illuminate\Http\Request;

class LogsController extends Controller
{
    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Logs', [
            'logs' => TransactionLog::query()
                ->select(['id', 'user_id', 'action', 'created_at'])
                ->with('user:id,name')
                ->latest()
                ->paginate(50),
        ]);
    }

    public function processLogs(Request $request)
    {
        $user = auth()->user();
        $isDeveloper = $user && method_exists($user, 'isDeveloper') && $user->isDeveloper();

        $query = ProcessLog::query()->with('actor:id,name');

        if ($request->filled('request_id')) {
            $query->where('request_id', $request->request_id);
        }
        if ($request->filled('trace_id')) {
            $query->where('trace_id', $request->trace_id);
        }
        if ($request->filled('actor_id')) {
            $query->where('actor_id', $request->actor_id);
        }
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('process')) {
            $query->where('process', $request->process);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('level')) {
            $query->where('level', $request->level);
        }
        if ($request->filled('date')) {
            $request->validate(['date' => ['date_format:Y-m-d']]);
            $date = \Carbon\Carbon::parse($request->date);
            $query->where('created_at', '>=', $date->startOfDay())
                  ->where('created_at', '<', $date->copy()->addDay()->startOfDay());
        }

        // Only select fields needed by the UI; exclude stack_trace entirely
        // Error file/line are only included for developers
        $selectFields = [
            'id', 'request_id', 'trace_id', 'level', 'module', 'process', 'step',
            'status', 'actor_id', 'related_type', 'related_id',
            'endpoint', 'method', 'ip_address', 'user_agent',
            'duration_ms', 'message', 'context',
            'error_message', 'error_code', 'error_class',
            'environment', 'created_at',
        ];
        if ($isDeveloper) {
            $selectFields = array_merge($selectFields, ['error_file', 'error_line']);
        }

        $query->select($selectFields);

        $logs = $query->latest()->paginate(50)->through(function ($log) use ($isDeveloper) {
            // Re-sanitize context to protect against old unsanitized entries
            if (isset($log->context) && is_array($log->context)) {
                $log->context = \App\Services\ProcessLogger::sanitizeContextForDisplay($log->context);
            }
            // Non-developers never see internal paths, even in non-production
            if (!$isDeveloper) {
                $log->error_file = null;
                $log->error_line = null;
            }
            return $log;
        })->withQueryString();

        // Build actor list for the dropdown filter
        $actors = ProcessLog::query()
            ->select('actor_id')
            ->whereNotNull('actor_id')
            ->distinct()
            ->with('actor:id,name')
            ->get()
            ->pluck('actor')
            ->filter()
            ->values()
            ->map(fn ($a) => ['id' => $a->id, 'name' => $a->name])
            ->sortBy('name')
            ->values();

        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json($logs);
        }

        return Inertia::render('Admin/ProcessLogs', [
            'logs' => $logs,
            'filters' => $request->only(['request_id', 'actor_id', 'module', 'process', 'status', 'level', 'date']),
            'actors' => $actors,
        ]);
    }

    public function pdf(TransactionLog $log): Response
    {
        $payload = $this->resolvePayload($log);

        return Pdf::loadView('logs.transaction-pdf', [
            'log' => $log,
            'payload' => $payload,
            'generatedAt' => now(),
        ])->download('log-' . $log->id . '.pdf');
    }

    private function resolvePayload(TransactionLog $log): array
    {
        $details = is_array($log->details) ? $log->details : [];
        $data = [];

        if (isset($details['id']) && in_array($log->action, ['sales_order_created'], true)) {
            $order = SalesOrder::with(['lines.package:id,code,name', 'lines.item:sku,name,unit'])
                ->find((int) $details['id']);

            if ($order) {
                $data['sales_order'] = $order;
            }
        }

        if (isset($details['id']) && in_array($log->action, ['procurement_order_created', 'procurement_order_received', 'procurement_order_submitted'], true)) {
            $order = ProcurementOrder::with([
                'packageLines.package:id,code,name',
                'lines.item:id,sku,name,unit',
            ])->find((int) $details['id']);

            if ($order) {
                $data['procurement_order'] = $order;
            }
        }

        if (isset($details['po_code']) && in_array($log->action, ['crn_po_received', 'crn_po_safe_receive'], true)) {
            $order = $this->resolveProcurementOrder($details);

            if ($order) {
                $data['procurement_order'] = $order;
            }
        }

        if (isset($details['po_code']) && in_array($log->action, ['mrn_po_received', 'srn_po_received'], true)) {
            $order = $this->resolveProcurementOrder($details);

            if ($order) {
                $data['procurement_order'] = $order;
            }
        }

        if (isset($details['id']) && in_array($log->action, ['stock_in', 'stock_out'], true)) {
            $transaction = InventoryTransaction::with([
                'lines.item:id,sku,name,unit',
                'lines.itemVariant:id,color',
                'package:id,code,name',
                'salesOrder:id,code,customer_name,site_id',
            ])->find((int) $details['id']);

            if ($transaction) {
                $data['inventory_transaction'] = $transaction;
            }
        }

        if (isset($details['id']) && in_array($log->action, ['crn_created', 'crn_transferred'], true)) {
            $crn = ContainerReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->find((int) $details['id']);

            if ($crn) {
                $data['crn'] = $crn;
            }
        }

        if (isset($details['id']) && in_array($log->action, ['mrn_created'], true)) {
            $mrn = MaterialReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->find((int) $details['id']);

            if ($mrn) {
                $data['mrn'] = $mrn;
            }
        }

        if (isset($details['id']) && in_array($log->action, ['srn_created'], true)) {
            $srn = SiteReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->find((int) $details['id']);

            if ($srn) {
                $data['srn'] = $srn;
            }
        }

        if (isset($details['crn_number']) && in_array($log->action, ['crn_po_received'], true)) {
            $crn = ContainerReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->where('crn_number', (string) $details['crn_number'])->first();

            if ($crn) {
                $data['crn'] = $crn;
            }
        }

        if (isset($details['mrn_number']) && in_array($log->action, ['mrn_po_received'], true)) {
            $mrn = MaterialReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->where('mrn_number', (string) $details['mrn_number'])->first();

            if ($mrn) {
                $data['mrn'] = $mrn;
            }
        }

        if (isset($details['srn_number']) && in_array($log->action, ['srn_po_received'], true)) {
            $srn = SiteReceivingNote::with([
                'items.itemVariant.item:id,sku,name,unit',
                'procurementOrder:id,code,status',
            ])->where('srn_number', (string) $details['srn_number'])->first();

            if ($srn) {
                $data['srn'] = $srn;
            }
        }

        return [
            'details' => $details,
            'data' => $data,
        ];
    }

    private function resolveProcurementOrder(array $details): ?ProcurementOrder
    {
        $query = ProcurementOrder::with([
            'packageLines.package:id,code,name',
            'lines.item:id,sku,name,unit',
        ]);

        if (isset($details['procurement_order_id'])) {
            return $query->find((int) $details['procurement_order_id']);
        }

        return $query->where('code', (string) $details['po_code'])->latest('id')->first();
    }
}
