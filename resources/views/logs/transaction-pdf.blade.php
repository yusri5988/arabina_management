<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Transaction Log #{{ $log->id }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #0f172a;
            font-size: 12px;
        }

        h1,
        h2 {
            margin: 0 0 8px 0;
        }

        .card {
            border: 1px solid #cbd5e1;
            padding: 12px;
            margin-bottom: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }

        th,
        td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            font-size: 11px;
            text-align: left;
        }

        th {
            background: #f1f5f9;
        }

        .muted {
            color: #64748b;
        }
    </style>
</head>

<body>
    <h1>Transaction Form Snapshot</h1>
    <div class="card">
        <div><strong>Log ID:</strong> {{ $log->id }}</div>
        <div><strong>Action:</strong> {{ $log->action }}</div>
        <div><strong>User:</strong> {{ optional($log->user)->name ?? 'System' }}</div>
        <div><strong>Timestamp:</strong> {{ optional($log->created_at)->format('d/m/Y H:i:s') }}</div>
        <div><strong>Generated:</strong> {{ $generatedAt->format('d/m/Y H:i:s') }}</div>
    </div>

    @if(!empty($payload['data']['sales_order']))
    @php($order = $payload['data']['sales_order'])
    <div class="card">
        <h2>Sales Order Form</h2>
        <div><strong>Code:</strong> {{ $order->code }}</div>
        <div><strong>Customer:</strong> {{ $order->customer_name }}</div>
        <div><strong>Site ID:</strong> {{ $order->site_id ?? '-' }}</div>
        <div><strong>Status:</strong> {{ $order->status }}</div>
        <div><strong>Order Date:</strong> {{ optional($order->order_date)->format('d/m/Y') }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Code/SKU</th>
                    <th>Description</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->lines as $i => $line)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $line->package_id ? 'Package' : 'Loose SKU' }}</td>
                        <td>{{ optional($line->package)->code ?? $line->item_sku }}</td>
                        <td>{{ optional($line->package)->name ?? optional($line->item)->name }}</td>
                        <td>{{ $line->package_quantity ?? $line->item_quantity }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(!empty($payload['data']['procurement_order']))
    @php($order = $payload['data']['procurement_order'])
    <div class="card">
        <h2>Procurement Order Form</h2>
        <div><strong>Code:</strong> {{ $order->code }}</div>
        <div><strong>Status:</strong> {{ $order->status }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Ordered Qty</th>
                    <th>Received Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->lines as $i => $line)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ optional($line->item)->sku }}</td>
                        <td>{{ optional($line->item)->name }}</td>
                        <td>{{ $line->ordered_quantity }}</td>
                        <td>{{ $line->received_quantity }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(!empty($payload['data']['inventory_transaction']))
    @php($tx = $payload['data']['inventory_transaction'])
    <div class="card">
        <h2>Inventory Transaction Form</h2>
        <div><strong>Type:</strong> {{ strtoupper($tx->type) }}</div>
        <div><strong>Mode:</strong> {{ $tx->mode }}</div>
        <div><strong>Package:</strong> {{ optional($tx->package)->code ?? '-' }}</div>
        <div><strong>Sales Order:</strong> {{ optional($tx->salesOrder)->code ?? '-' }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Variant</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($tx->lines as $i => $line)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ optional($line->item)->sku }}</td>
                        <td>{{ optional($line->item)->name }}</td>
                        <td>{{ optional($line->itemVariant)->color ?? '-' }}</td>
                        <td>{{ $line->quantity }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(!empty($payload['data']['crn']))
    @php($crn = $payload['data']['crn'])
    <div class="card">
        <h2>CRN Form</h2>
        <div><strong>CRN Number:</strong> {{ $crn->crn_number }}</div>
        <div><strong>Status:</strong> {{ $crn->status }}</div>
        <div><strong>PO Code:</strong> {{ optional($crn->procurementOrder)->code ?? '-' }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Expected</th>
                    <th>Received</th>
                    <th>Rejected</th>
                </tr>
            </thead>
            <tbody>
                @foreach($crn->items as $i => $item)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->sku }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->name }}</td>
                        <td>{{ $item->expected_qty }}</td>
                        <td>{{ $item->received_qty }}</td>
                        <td>{{ $item->rejected_qty }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(!empty($payload['data']['mrn']))
    @php($mrn = $payload['data']['mrn'])
    <div class="card">
        <h2>MRN Form</h2>
        <div><strong>MRN Number:</strong> {{ $mrn->mrn_number }}</div>
        <div><strong>Status:</strong> {{ $mrn->status }}</div>
        <div><strong>PO Code:</strong> {{ optional($mrn->procurementOrder)->code ?? '-' }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Expected</th>
                    <th>Received</th>
                    <th>Rejected</th>
                </tr>
            </thead>
            <tbody>
                @foreach($mrn->items as $i => $item)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->sku }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->name }}</td>
                        <td>{{ $item->expected_qty }}</td>
                        <td>{{ $item->received_qty }}</td>
                        <td>{{ $item->rejected_qty }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(!empty($payload['data']['srn']))
    @php($srn = $payload['data']['srn'])
    <div class="card">
        <h2>SRN Form</h2>
        <div><strong>SRN Number:</strong> {{ $srn->srn_number }}</div>
        <div><strong>Status:</strong> {{ $srn->status }}</div>
        <div><strong>PO Code:</strong> {{ optional($srn->procurementOrder)->code ?? '-' }}</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Expected</th>
                    <th>Received</th>
                    <th>Rejected</th>
                </tr>
            </thead>
            <tbody>
                @foreach($srn->items as $i => $item)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->sku }}</td>
                        <td>{{ optional(optional($item->itemVariant)->item)->name }}</td>
                        <td>{{ $item->expected_qty }}</td>
                        <td>{{ $item->received_qty }}</td>
                        <td>{{ $item->rejected_qty }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(empty($payload['data']))
        <div class="card muted">
            No linked transaction form found for this log action.
        </div>
    @endif
</body>

</html>
