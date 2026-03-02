import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../../lib/http';
import { ChevronDownIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline/index.js';

export default function CrnIndex({ pendingProcurements = [], notes = [], canManage = false }) {
  const [notification, setNotification] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [pendingList, setPendingList] = useState(pendingProcurements);
  const [forms, setForms] = useState({});

  const toggleOrder = (order) => {
    setOpenOrderId((prev) => (prev === order.id ? null : order.id));

    setForms((prev) => {
      if (prev[order.id]) {
        return prev;
      }

      const mapped = {};
      (order.lines ?? []).forEach((line) => {
        mapped[line.line_id] = {
          received_qty: Number(line.remaining_qty ?? 0),
          rejected_qty: 0,
          rejection_reason: '',
        };
      });

      return {
        ...prev,
        [order.id]: mapped,
      };
    });
  };

  const setLineValue = (orderId, lineId, field, value, remainingQty) => {
    setForms((prev) => {
      const existing = prev?.[orderId]?.[lineId] ?? {
        received_qty: Number(remainingQty ?? 0),
        rejected_qty: 0,
        rejection_reason: '',
      };

      let next = { ...existing, [field]: value };

      if (field === 'received_qty') {
        const received = Math.min(Math.max(Number(value || 0), 0), Number(remainingQty || 0));
        next.received_qty = received;
        next.rejected_qty = Math.max(Number(remainingQty ?? 0) - received, 0);
      }

      if (field === 'rejected_qty') {
        const rejected = Math.min(Math.max(Number(value || 0), 0), Number(remainingQty || 0));
        next.rejected_qty = rejected;
        next.received_qty = Math.max(Number(remainingQty ?? 0) - rejected, 0);
      }

      return {
        ...prev,
        [orderId]: {
          ...(prev[orderId] ?? {}),
          [lineId]: next,
        },
      };
    });
  };

  const submitSingleLine = async (order, line) => {
    const current = forms?.[order.id]?.[line.line_id] ?? {
      received_qty: Number(line.remaining_qty ?? 0),
      rejected_qty: 0,
      rejection_reason: '',
    };

    const linesPayload = [{
      line_id: line.line_id,
      received_qty: Number(current.received_qty || 0),
      rejected_qty: Number(current.rejected_qty || 0),
      rejection_reason: current.rejection_reason || null,
    }];

    setNotification(null);
    const procKey = `line-${order.id}-${line.line_id}`;
    setProcessingId(procKey);

    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/procurement/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines: linesPayload }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'SKU submitted.' });
        setPendingList((prev) => prev
          .map((po) => {
            if (po.id !== order.id) return po;
            return {
              ...po,
              lines: (po.lines ?? []).filter((x) => x.line_id !== line.line_id),
            };
          })
          .filter((po) => po.lines.length > 0)
        );
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Submit failed.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AuthenticatedLayout title="Contena Receiving Note (CRN)" backUrl="__back__">
      <Head title="CRN Checklist" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Stock Arrival Checklist</h2>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {pendingList.length} Pending PO
          </span>
        </div>

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="space-y-3">
          {pendingList.map((order) => {
            const isOpen = openOrderId === order.id;
            const orderForm = forms?.[order.id] ?? {};

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => toggleOrder(order)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{order.code}</p>
                    <p className="text-xs text-slate-500">{order.created_at} · {order.lines.length} SKU</p>
                  </div>
                  <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {(order.lines ?? []).map((line) => {
                      const current = orderForm?.[line.line_id] ?? {
                        received_qty: Number(line.remaining_qty ?? 0),
                        rejected_qty: 0,
                        rejection_reason: '',
                      };

                      return (
                        <div key={line.line_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-xs font-bold text-slate-700">{line.sku}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Expected</p>
                              <p className="text-sm font-bold text-slate-700">{line.remaining_qty}</p>
                            </div>
                            <QtyInput
                              label="Received"
                              value={current.received_qty}
                              onChange={(val) => setLineValue(order.id, line.line_id, 'received_qty', val, line.remaining_qty)}
                              min={0}
                              max={line.remaining_qty}
                            />
                            <QtyInput
                              label="Rejected"
                              value={current.rejected_qty}
                              onChange={(val) => setLineValue(order.id, line.line_id, 'rejected_qty', val, line.remaining_qty)}
                              min={0}
                              max={line.remaining_qty}
                            />
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Reason</label>
                              <input
                                type="text"
                                value={current.rejection_reason}
                                onChange={(e) => setLineValue(order.id, line.line_id, 'rejection_reason', e.target.value, line.remaining_qty)}
                                placeholder="If rejected"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => submitSingleLine(order, line)}
                                disabled={!canManage || processingId === `line-${order.id}-${line.line_id}`}
                                className="w-full rounded-lg bg-emerald-600 text-white text-xs font-bold py-2 hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {processingId === `line-${order.id}-${line.line_id}` ? '...' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {pendingList.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              No pending procurement order to receive.
            </div>
          )}
        </div>

        {notes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Latest CRN Logs</p>
            <div className="space-y-1">
              {notes.slice(0, 5).map((note) => (
                <p key={note.id} className="text-xs text-slate-600">
                  {note.crn_number} - {note.procurement_order?.code || 'Standalone'} ({note.status})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
