import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import QtyInput from '../../../components/QtyInput';
import { apiFetchJson } from '../../../lib/http';
import { ChevronDownIcon, PlusIcon, ArrowDownTrayIcon, CalendarDaysIcon } from '@heroicons/react/24/outline/index.js';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';

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
        window.location.reload();
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
        window.location.reload();
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
        window.location.reload();
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error.' });
    } finally {
      setProcessingId(null);
    }
  };

  const incomingCrns = crnList.filter(c => ['awaiting_shipping', 'shipping'].includes(c.status));

  return (
    <AuthenticatedLayout title="Container Receiving Note (CRN)" backUrl="__back__">
      <Head title="Container Receiving Note" />
      <div className="space-y-4">

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notification.message}</div>
        )}

        {/* ── Incoming Shipments ── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 pt-2 px-6 pb-2 md:pt-2.5 md:px-8 md:pb-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800">Incoming Shipments</h2>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border transition-colors ${
              incomingCrns.length > 0 
                ? 'bg-lime-400 text-lime-950 border-lime-500/20' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {incomingCrns.length} Active
            </span>
          </div>

          {incomingCrns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4 font-medium">No incoming shipments.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 md:-mx-8 mt-1">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">CRN Number</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Code</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">ETA Date</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {incomingCrns.map((crn) => (
                    <tr key={crn.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 md:px-8 py-4 text-xs font-bold text-slate-800">{crn.crn_number}</td>
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">
                        {crn.procurement_order?.code || <span className="text-slate-400 italic">Standalone</span>}
                      </td>
                      <td className="px-6 md:px-8 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block ${crn.status === 'awaiting_shipping' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                          {crn.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">
                        {crn.status === 'awaiting_shipping' ? (
                          <div className="flex items-center gap-2 relative">
                            <div className="relative w-36 group">
                              <DatePicker
                                selected={etaDates[crn.id] ? parseISO(etaDates[crn.id]) : null}
                                onChange={(date) => {
                                  if (date) {
                                    setEtaDates(prev => ({ ...prev, [crn.id]: format(date, 'yyyy-MM-dd') }));
                                  }
                                }}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Select ETA"
                                className="w-full text-xs rounded-xl border border-slate-200 py-2 pl-9 pr-3 bg-white focus:ring-2 focus:ring-arabina-accent/20 focus:border-arabina-accent transition-all cursor-pointer shadow-sm hover:border-slate-300 font-bold text-slate-700"
                                calendarClassName="!rounded-2xl !border-slate-100 !shadow-2xl !p-2 !font-sans"
                                popperPlacement="bottom-start"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                portalId="root-portal"
                              />
                              <style dangerouslySetInnerHTML={{ __html: `
                                .react-datepicker-popper {
                                  z-index: 9999 !important;
                                }
                                .react-datepicker {
                                  font-family: inherit;
                                  border-radius: 1rem !important;
                                  border: 1px solid #f1f5f9 !important;
                                  padding: 0.5rem !important;
                                }
                                .react-datepicker__header {
                                  background-color: white !important;
                                  border-bottom: 1px solid #f1f5f9 !important;
                                  border-top-left-radius: 1rem !important;
                                  border-top-right-radius: 1rem !important;
                                  padding-top: 10px !important;
                                }
                                .react-datepicker__day--selected {
                                  background-color: #10b981 !important;
                                  border-radius: 0.5rem !important;
                                }
                                .react-datepicker__day:hover {
                                  border-radius: 0.5rem !important;
                                }
                              `}} />
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-700">{crn.eta ? new Date(crn.eta).toLocaleDateString('en-GB') : '-'}</span>
                        )}
                      </td>
                      <td className="px-6 md:px-8 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {crn.procurement_order_id && (
                            <a
                              href={`/procurement/orders/${crn.procurement_order_id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition-all shadow-md active:scale-95 uppercase tracking-wider h-[36px] min-w-[80px]"
                            >
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              List
                            </a>
                          )}
                          {crn.status === 'awaiting_shipping' ? (
                            <button
                              onClick={() => submitEta(crn.id)}
                              disabled={!etaDates[crn.id] || processingId === `eta-${crn.id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-800 text-white text-xs font-black px-4 py-2 hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95 shadow-md uppercase tracking-wider h-[36px] min-w-[80px]"
                            >
                              Set ETA
                            </button>
                          ) : (
                            <button
                              onClick={() => markArrived(crn.id)}
                              disabled={processingId === `arrived-${crn.id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white text-xs font-black px-4 py-2 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95 shadow-md uppercase tracking-wider h-[36px] min-w-[80px]"
                            >
                              Mark Arrived
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Stock Arrival Checklist ── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 pt-2 px-6 pb-2 md:pt-2.5 md:px-8 md:pb-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800">Stock Arrival Checklist</h2>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border transition-colors ${
              pendingList.length > 0 
                ? 'bg-lime-400 text-lime-950 border-lime-500/20' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {pendingList.length} Pending PO
            </span>
          </div>

          {pendingList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4 font-medium">No pending procurement order to receive.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 md:-mx-8 mt-1">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Code</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">SKUs</th>
                    <th className="px-6 md:px-8 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingList.map((order) => {
                    const isOpen = openOrderId === order.id;
                    const orderForm = forms?.[order.id] ?? {};
                    return (
                      <>
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 md:px-8 py-4 text-xs font-bold text-slate-800">{order.code}</td>
                          <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">{order.created_at}</td>
                          <td className="px-6 md:px-8 py-4 text-xs font-medium text-slate-600">{order.lines.length} SKU</td>
                          <td className="px-6 md:px-8 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => toggleOrder(order)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              {isOpen ? 'Hide Checklist' : 'Show Checklist'}
                              <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${order.id}-form`}>
                            <td colSpan={4} className="px-6 md:px-8 py-4 bg-slate-50/60">
                              <div className="space-y-3">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => submitAllLines(order)}
                                    disabled={!canManage || processingId === `all-${order.id}`}
                                    className="rounded-lg bg-slate-800 text-white text-xs font-bold px-4 py-2 hover:bg-slate-900 disabled:opacity-50 transition-colors"
                                  >
                                    {processingId === `all-${order.id}` ? 'Submitting...' : 'Submit All'}
                                  </button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="bg-white border-b border-slate-100">
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU / Item</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Expected</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-emerald-500 uppercase tracking-wider text-center">Received</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-red-400 uppercase tracking-wider text-center">Rejected</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                      {order.lines.map((line) => {
                                        const current = orderForm?.[line.line_id] ?? { received_qty: Number(line.remaining_qty ?? 0), rejected_qty: 0, rejection_reason: '' };
                                        return (
                                          <tr key={line.line_id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3">
                                              <p className="text-xs font-bold text-slate-700">{line.sku}</p>
                                              <p className="text-[10px] text-slate-500">{line.name || line.item?.name || '-'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">{line.remaining_qty}</td>
                                            <td className="px-4 py-3 text-center">
                                              <QtyInput value={current.received_qty} onChange={(val) => setLineValue(order.id, line.line_id, 'received_qty', val, line.remaining_qty)} min={0} max={line.remaining_qty} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <QtyInput value={current.rejected_qty} onChange={(val) => setLineValue(order.id, line.line_id, 'rejected_qty', val, line.remaining_qty)} min={0} max={line.remaining_qty} />
                                            </td>
                                            <td className="px-4 py-3">
                                              <input
                                                type="text"
                                                value={current.rejection_reason}
                                                onChange={(e) => setLineValue(order.id, line.line_id, 'rejection_reason', e.target.value, line.remaining_qty)}
                                                placeholder="If rejected"
                                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-arabina-accent"
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Latest CRN History ── */}
        {notes.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 pt-2 px-6 pb-2 md:pt-2.5 md:px-8 md:pb-2">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">Latest CRN History</h2>
            </div>
            <div className="overflow-x-auto -mx-6 md:-mx-8 mt-1">
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
                            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all shadow-md hover:bg-slate-900 active:scale-95 h-[36px] min-w-[100px]"
                          >
                            View Details
                          </button>
                          <a
                            href={`/warehouse/crn/${note.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all shadow-md hover:bg-rose-700 active:scale-95 h-[36px] min-w-[60px]"
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

        {/* ── Modal View Details ── */}
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedNote.crn_number}</h3>
                  <p className="text-xs text-slate-500">Processed on {new Date(selectedNote.updated_at).toLocaleString('en-GB')}</p>
                </div>
                <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
                  className="bg-rose-600 text-white text-xs font-bold px-6 py-2 rounded-xl hover:bg-rose-700 flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                  </svg>
                  View PDF
                </a>
                <button onClick={() => setSelectedNote(null)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-6 py-2 rounded-xl hover:bg-slate-100 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
