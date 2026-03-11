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
            $order = ProcurementOrder::with([
                'packageLines.package:id,code,name',
                'lines.item:id,sku,name,unit',
            ])->where('code', (string) $details['po_code'])->first();

            if ($order) {
                $data['procurement_order'] = $order;
            }
        }

        if (isset($details['po_code']) && in_array($log->action, ['mrn_po_received', 'srn_po_received'], true)) {
            $order = ProcurementOrder::with([
                'packageLines.package:id,code,name',
                'lines.item:id,sku,name,unit',
            ])->where('code', (string) $details['po_code'])->first();

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
}
