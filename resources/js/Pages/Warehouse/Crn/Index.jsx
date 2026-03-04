import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import QtyInput from '../../../components/QtyInput';
import { apiFetchJson } from '../../../lib/http';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline/index.js';

export default function CrnIndex({ pendingProcurements = [], activeCrns = [], notes = [], canManage = false }) {
  const [notification, setNotification] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [pendingList, setPendingList] = useState(pendingProcurements);
  const [crnList, setCrnList] = useState(activeCrns);
  const [etaDates, setEtaDates] = useState({});
  const [forms, setForms] = useState({});
  const [selectedNote, setSelectedNote] = useState(null);

  const toggleOrder = (order) => {
    setOpenOrderId((prev) => (prev === order.id ? null : order.id));
    setForms((prev) => {
      if (prev[order.id]) return prev;
      const mapped = {};
      (order.lines ?? []).forEach((line) => {
        mapped[line.line_id] = {
          received_qty: Number(line.remaining_qty ?? 0),
          rejected_qty: 0,
          rejection_reason: '',
        };
      });
      return { ...prev, [order.id]: mapped };
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
      return { ...prev, [orderId]: { ...prev[orderId], [lineId]: next } };
    });
  };

  const submitSingleLine = async (order, line) => {
    const current = forms?.[order.id]?.[line.line_id] ?? {
      received_qty: Number(line.remaining_qty ?? 0),
      rejected_qty: 0,
      rejection_reason: '',
    };
    setNotification(null);
    setProcessingId(`line-${order.id}-${line.line_id}`);
    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/procurement/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          lines: [{
            line_id: line.line_id,
            received_qty: Number(current.received_qty || 0),
            rejected_qty: Number(current.rejected_qty || 0),
            rejection_reason: current.rejection_reason || null,
          }]
        }),
      });
      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'SKU submitted.' });
        router.reload();
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error.' });
    } finally {
      setProcessingId(null);
    }
  };

  const submitAllLines = async (order) => {
    const linesPayload = (order.lines ?? []).map(line => {
      const current = forms?.[order.id]?.[line.line_id] ?? { received_qty: Number(line.remaining_qty ?? 0), rejected_qty: 0, rejection_reason: '' };
      return { line_id: line.line_id, received_qty: Number(current.received_qty || 0), rejected_qty: Number(current.rejected_qty || 0), rejection_reason: current.rejection_reason || null };
    });
    setNotification(null);
    setProcessingId(`all-${order.id}`);
    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/procurement/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines: linesPayload }),
      });
      if (response.ok) {
        setNotification({ type: 'success', message: 'All SKU submitted.' });
        router.reload();
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error.' });
    } finally {
      setProcessingId(null);
    }
  };

  const submitEta = async (crnId) => {
    const eta = etaDates[crnId];
    if (!eta) return;
    setProcessingId(`eta-${crnId}`);
    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/${crnId}/eta`, {
        method: 'POST',
        body: JSON.stringify({ eta }),
      });
      if (response.ok) {
        setNotification({ type: 'success', message: 'ETA updated. Status: Shipping.' });
        router.reload();
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error.' });
    } finally {
      setProcessingId(null);
    }
  };

  const markArrived = async (crnId) => {
    setProcessingId(`arrived-${crnId}`);
    try {
      const { response, payload } = await apiFetchJson(`/warehouse/crn/${crnId}/arrived`, { method: 'POST' });
      if (response.ok) {
        setNotification({ type: 'success', message: 'Arrived! Checklist available below.' });
        router.reload();
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AuthenticatedLayout title="Container Receiving Note (CRN)" backUrl="__back__">
      <Head title="Container Receiving Note" />
      <div className="space-y-6">
        {crnList.filter(c => ['awaiting_shipping', 'shipping'].includes(c.status)).length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-xl font-bold text-slate-800">Incoming Shipments</h2>
            {crnList.filter(c => ['awaiting_shipping', 'shipping'].includes(c.status)).map((crn) => (
              <div key={crn.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${crn.status === 'awaiting_shipping' ? 'bg-amber-50' : 'bg-sky-50'}`}>
                      <PlusIcon className={`w-5 h-5 ${crn.status === 'awaiting_shipping' ? 'text-amber-600' : 'text-sky-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{crn.crn_number}</p>
                      <p className="text-xs text-slate-500">PO: {crn.procurement_order?.code || 'Standalone'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${crn.status === 'awaiting_shipping' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                      {crn.status.replace('_', ' ')}
                    </span>
                    {crn.status === 'awaiting_shipping' ? (
                      <div className="flex items-center gap-2">
                        <input type="date" className="text-xs rounded-lg border-slate-200 py-1.5" value={etaDates[crn.id] || ''} onChange={(e) => setEtaDates(prev => ({ ...prev, [crn.id]: e.target.value }))} />
                        <button onClick={() => submitEta(crn.id)} disabled={!etaDates[crn.id] || processingId === `eta-${crn.id}`} className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-900 disabled:opacity-50">Set ETA</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ETA Date</p>
                          <p className="text-sm font-bold text-slate-700">{crn.eta ? new Date(crn.eta).toLocaleDateString('en-GB') : '-'}</p>
                        </div>
                        <button onClick={() => markArrived(crn.id)} disabled={processingId === `arrived-${crn.id}`} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Mark as Arrived</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Stock Arrival Checklist</h2>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{pendingList.length} Pending PO</span>
        </div>

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notification.message}</div>
        )}

        <div className="space-y-3">
          {pendingList.map((order) => {
            const isOpen = openOrderId === order.id;
            const orderForm = forms?.[order.id] ?? {};
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <button type="button" onClick={() => toggleOrder(order)} className="w-full flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{order.code}</p>
                    <p className="text-xs text-slate-500">{order.created_at} · {order.lines.length} SKU</p>
                  </div>
                  <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-end">
                      <button type="button" onClick={() => submitAllLines(order)} disabled={!canManage || processingId === `all-${order.id}`} className="rounded-lg bg-slate-800 text-white text-xs font-bold px-3 py-2 hover:bg-slate-900 disabled:opacity-50">{processingId === `all-${order.id}` ? 'Submitting...' : 'Submit All'}</button>
                    </div>
                    {order.lines.map((line) => {
                      const current = orderForm?.[line.line_id] ?? { received_qty: Number(line.remaining_qty ?? 0), rejected_qty: 0, rejection_reason: '' };
                      return (
                        <div key={line.line_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2"><p className="text-xs font-bold text-slate-700">{line.sku}</p></div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Expected</p><p className="text-sm font-bold text-slate-700">{line.remaining_qty}</p></div>
                            <QtyInput label="Received" value={current.received_qty} onChange={(val) => setLineValue(order.id, line.line_id, 'received_qty', val, line.remaining_qty)} min={0} max={line.remaining_qty} />
                            <QtyInput label="Rejected" value={current.rejected_qty} onChange={(val) => setLineValue(order.id, line.line_id, 'rejected_qty', val, line.remaining_qty)} min={0} max={line.remaining_qty} />
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase">Reason</label><input type="text" value={current.rejection_reason} onChange={(e) => setLineValue(order.id, line.line_id, 'rejection_reason', e.target.value, line.remaining_qty)} placeholder="If rejected" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white" /></div>
                            <div><button type="button" onClick={() => submitSingleLine(order, line)} disabled={!canManage || processingId === `line-${order.id}-${line.line_id}`} className="w-full rounded-lg bg-emerald-600 text-white text-xs font-bold py-2 hover:bg-emerald-700 disabled:opacity-50">{processingId === `line-${order.id}-${line.line_id}` ? '...' : 'Submit'}</button></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {pendingList.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">No pending procurement order to receive.</div>}
        </div>

        {notes.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">Latest CRN History</h2>
            <div className="overflow-x-auto -mx-6 md:-mx-8">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">CRN Number</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Code</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Items Received</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">By</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(Array.isArray(notes) ? notes : (notes.data || [])).map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">
                        {note.received_at ? new Date(note.received_at).toLocaleDateString('en-GB') : new Date(note.updated_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 md:px-8 py-4 text-xs font-bold text-slate-800">{note.crn_number}</td>
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">
                        {note.procurement_order?.code || <span className="text-slate-400 italic">Standalone</span>}
                      </td>
                      <td className="px-6 md:px-8 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-600">
                            {note.items?.reduce((sum, i) => sum + Number(i.received_qty || 0), 0)} Items
                          </span>
                          <span className="text-[10px] text-slate-400">({note.items?.length || 0} SKU)</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">{note.creator?.name || 'System'}</td>
                      <td className="px-6 md:px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedNote(note)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                          >
                            View Details
                          </button>
                          <a
                            href={`/warehouse/crn/${note.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-rose-600 hover:text-rose-900 underline"
                          >
                            PDF
                          </a>

                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal View Details */}
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedNote.crn_number}</h3>
                  <p className="text-xs text-slate-500">Processed on {new Date(selectedNote.updated_at).toLocaleString('en-GB')}</p>
                </div>
                <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <ChevronDownIcon className="w-6 h-6 text-slate-400 rotate-180" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 md:p-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-3">SKU / Item</th>
                      <th className="pb-3 text-center">Expected</th>
                      <th className="pb-3 text-center text-emerald-600">Received</th>
                      <th className="pb-3 text-center text-red-600">Rejected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {selectedNote.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{item.item_variant?.item?.sku}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{item.item_variant?.item?.name}</p>
                        </td>
                        <td className="py-3 text-center font-medium text-slate-600">{item.expected_qty}</td>
                        <td className="py-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{item.received_qty}</td>
                        <td className="py-3 text-center font-bold text-red-600">{item.rejected_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <a
                  href={`/warehouse/crn/${selectedNote.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-rose-600 text-white text-xs font-bold px-6 py-2 rounded-xl hover:bg-rose-700 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                  </svg>
                  View PDF
                </a>
                <button onClick={() => setSelectedNote(null)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-6 py-2 rounded-xl hover:bg-slate-100">Close</button>
              </div>

            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
