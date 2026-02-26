import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../../lib/http';
import { ChevronDownIcon } from '@heroicons/react/24/outline/index.js';

export default function CrnIndex({ pendingProcurements = [], notes = [], canManage = false }) {
  const [notification, setNotification] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [pendingList, setPendingList] = useState(pendingProcurements);
  const [forms, setForms] = useState({});
  const [processingSafeKey, setProcessingSafeKey] = useState(null);

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
        const received = Math.max(Number(value || 0), 0);
        next.received_qty = received;
        next.rejected_qty = Math.max(Number(remainingQty ?? 0) - received, 0);
      }

      if (field === 'rejected_qty') {
        const rejected = Math.max(Number(value || 0), 0);
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

  const markSafe = async (order, line) => {
    const key = `${order.id}-${line.line_id}`;
    setProcessingSafeKey(key);
    setNotification(null);

    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/procurement/${order.id}/lines/${line.line_id}/safe`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Safe line received.' });
        setPendingList((prev) => prev
          .map((po) => {
            if (po.id !== order.id) {
              return po;
            }

            return {
              ...po,
              lines: (po.lines ?? []).filter((x) => x.line_id !== line.line_id),
            };
          })
          .filter((po) => (po.lines ?? []).length > 0));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Safe action failed.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingSafeKey(null);
    }
  };

  const submitChecklist = async (order) => {
    const lineForms = forms?.[order.id] ?? {};
    const linesPayload = (order.lines ?? []).map((line) => {
      const current = lineForms?.[line.line_id] ?? {
        received_qty: Number(line.remaining_qty ?? 0),
        rejected_qty: 0,
        rejection_reason: '',
      };

      return {
        line_id: line.line_id,
        received_qty: Number(current.received_qty || 0),
        rejected_qty: Number(current.rejected_qty || 0),
        rejection_reason: current.rejection_reason || null,
      };
    });

    setNotification(null);
    setProcessingId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/procurement/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines: linesPayload }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Checklist submitted.' });
        setPendingList((prev) => prev.filter((x) => x.id !== order.id));
        setOpenOrderId(null);
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
                            <label className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-extrabold text-emerald-700">
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    markSafe(order, line);
                                  }
                                }}
                                disabled={processingSafeKey === `${order.id}-${line.line_id}` || !canManage}
                                className="h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              {processingSafeKey === `${order.id}-${line.line_id}` ? 'Saving...' : 'Safe'}
                            </label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Expected</p>
                              <p className="text-sm font-bold text-slate-700">{line.remaining_qty}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Received</label>
                              <input
                                type="number"
                                min="0"
                                max={line.remaining_qty}
                                value={current.received_qty}
                                onChange={(e) => setLineValue(order.id, line.line_id, 'received_qty', e.target.value, line.remaining_qty)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Rejected</label>
                              <input
                                type="number"
                                min="0"
                                max={line.remaining_qty}
                                value={current.rejected_qty}
                                onChange={(e) => setLineValue(order.id, line.line_id, 'rejected_qty', e.target.value, line.remaining_qty)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white"
                              />
                            </div>
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
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => submitChecklist(order)}
                      disabled={!canManage || processingId === order.id}
                      className="w-full rounded-2xl bg-[#1E3D1A] text-white py-4 text-base font-extrabold tracking-wide hover:bg-emerald-900 disabled:opacity-50"
                    >
                      {processingId === order.id ? 'Submitting...' : 'Submit Checklist'}
                    </button>
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
