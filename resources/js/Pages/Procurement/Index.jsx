import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

export default function ProcurementIndex({ databaseReady = true, canManage = false, canReceive = false, suggestion, orders = [] }) {
  const [notification, setNotification] = useState(null);
  const [processingCreate, setProcessingCreate] = useState(false);
  const [processingReceiveId, setProcessingReceiveId] = useState(null);
  const [processingDeleteId, setProcessingDeleteId] = useState(null);
  const [list, setList] = useState(orders);
  const [receiveForms, setReceiveForms] = useState({});

  const setReceiveValue = (orderId, lineId, value) => {
    setReceiveForms((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [lineId]: value,
      },
    }));
  };

  const createDraft = async () => {
    setNotification(null);
    setProcessingCreate(true);

    try {
      const { response, payload } = await apiFetchJson('/procurement/orders', {
        method: 'POST',
        body: JSON.stringify({
          package_lines: suggestion?.package_lines ?? [],
          sku_lines: (suggestion?.sku_lines ?? []).map((line) => ({
            item_id: line.item_id,
            quantity: line.quantity,
          })),
          source_order_ids: (suggestion?.source_orders ?? []).map((x) => x.id),
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Draft created.' });
        setList((prev) => [payload.data, ...prev]);
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to create draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingCreate(false);
    }
  };

  const submitReceive = async (order) => {
    setNotification(null);
    setProcessingReceiveId(order.id);

    const payloadLines = order.lines.map((line) => ({
      line_id: line.id,
      received_quantity: Number(receiveForms?.[order.id]?.[line.id] ?? line.received_quantity ?? 0),
    }));

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}/receive`, {
        method: 'PUT',
        body: JSON.stringify({ lines: payloadLines }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Receiving saved.' });
        setList((prev) => prev.map((x) => (x.id === order.id ? payload.data : x)));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to submit receiving.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingReceiveId(null);
    }
  };

  const copySuggestedToReceive = (order) => {
    const values = {};
    (order.lines ?? []).forEach((line) => {
      values[line.id] = line.ordered_quantity ?? line.suggested_quantity ?? 0;
    });

    setReceiveForms((prev) => ({
      ...prev,
      [order.id]: values,
    }));

    setNotification({ type: 'success', message: `Suggested quantities copied for ${order.code}.` });
  };

  const deleteDraft = async (order) => {
    if (!window.confirm(`Delete draft ${order.code}?`)) {
      return;
    }

    setNotification(null);
    setProcessingDeleteId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Draft deleted.' });
        setList((prev) => prev.filter((x) => x.id !== order.id));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to delete draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingDeleteId(null);
    }
  };

  return (
    <AuthenticatedLayout title="Procurement" backUrl="/dashboard">
      <Head title="Procurement" />

      <div className="space-y-6">
        {!databaseReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Database untuk procurement module belum siap. Jalankan <code>php artisan migrate</code> kemudian refresh semula.
          </div>
        )}

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-[#1E3D1A] p-6 md:p-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-3.447c.102-.62-.182-1.246-.703-1.583L5.1 10.83a1.59 1.59 0 0 1-.373-2.529l13.19-12.89a1.59 1.59 0 0 1 2.653 1.285l-1.57 15.39a1.59 1.59 0 0 1-2.347 1.316l-1.611-1.285Z" />
              </svg>
              Auto Shortage Suggestion
            </h2>
            <p className="text-emerald-100/60 text-sm mt-1">Smart replenishment based on active sales demand and current stock levels.</p>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                      SKU Shortage (Order to Supplier)
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase">
                      {(suggestion?.sku_lines ?? []).length} Items
                    </span>
                  </div>
                  
                  <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU / Item Name</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demand</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Stock</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Required</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {(suggestion?.sku_lines ?? []).map((line) => (
                          <tr key={line.item_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5">
                              <p className="text-sm font-bold text-slate-800">{line.sku}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{line.name}</p>
                            </td>
                            <td className="px-4 py-3.5 text-center text-sm text-slate-600 font-medium">{line.demand_quantity}</td>
                            <td className="px-4 py-3.5 text-center text-sm text-slate-600 font-medium">{line.stock_quantity}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 border border-emerald-100">
                                {line.quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(suggestion?.sku_lines ?? []).length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">No shortage at the moment.</p>
                                <p className="text-xs text-slate-400 mt-1">Sales demand is already covered by current stock.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                      Package Demand
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(suggestion?.package_lines ?? []).map((line) => (
                      <div key={line.package_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {line.quantity}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{line.package_code}</p>
                            <p className="text-[11px] text-slate-500">{line.package_name}</p>
                          </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    ))}
                    {(suggestion?.package_lines ?? []).length === 0 && <p className="text-sm text-slate-500 italic px-2">No pending package demand.</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-8 lg:border-l lg:border-slate-100 lg:pl-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                    Sales Source
                  </h3>
                  <div className="space-y-3">
                    {(suggestion?.source_orders ?? []).map((order) => (
                      <div key={order.id} className="relative pl-4 border-l-2 border-slate-200 py-1 hover:border-amber-400 transition-colors group">
                        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-amber-400 transition-colors"></div>
                        <p className="text-xs font-bold text-slate-800">{order.code}</p>
                        <p className="text-[11px] text-slate-500 truncate">{order.customer_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400">{order.order_date}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter">{order.status}</span>
                        </div>
                      </div>
                    ))}
                    {(suggestion?.source_orders ?? []).length === 0 && <p className="text-sm text-slate-500 italic">No open sales order source.</p>}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={createDraft}
                    disabled={
                      !databaseReady
                      || !canManage
                      || processingCreate
                      || (suggestion?.sku_lines ?? []).length === 0
                      || (suggestion?.source_orders ?? []).length === 0
                    }
                    className="group relative w-full overflow-hidden rounded-2xl bg-[#1E3D1A] p-4 text-white shadow-lg transition-all hover:bg-emerald-900 disabled:opacity-50 disabled:hover:bg-[#1E3D1A]"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-wider">
                        {processingCreate ? 'Generating...' : 'Generate Procurement Draft'}
                      </span>
                      {!processingCreate && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                    This will convert the suggestions above into a formal procurement draft.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Procurement Orders ({list.length})</h2>
          <div className="mt-5 space-y-4">
            {list.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-bold text-slate-800">{order.code}</p>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Package</h4>
                    <div className="space-y-1">
                      {(order.package_lines ?? []).map((line) => (
                        <p key={line.id} className="text-xs text-slate-600">
                          {line.package?.code} - {line.package?.name} x {line.quantity}
                        </p>
                      ))}
                      {(order.package_lines ?? []).length === 0 && <p className="text-xs text-slate-500">No package lines.</p>}
                    </div>

                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-3 mb-2">Source Sales Orders</h4>
                    <div className="space-y-1">
                      {(order.sales_orders ?? []).map((salesOrder) => (
                        <p key={salesOrder.id} className="text-xs text-slate-600">
                          {salesOrder.code} - {salesOrder.customer_name} ({salesOrder.order_date})
                        </p>
                      ))}
                      {(order.sales_orders ?? []).length === 0 && <p className="text-xs text-slate-500">No linked sales source.</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">SKU Receive Form</h4>
                    <div className="space-y-2">
                      {(order.lines ?? []).map((line) => (
                        <div key={line.id} className="grid grid-cols-12 gap-2 items-center rounded-xl bg-slate-50 border border-slate-200 px-2 py-2">
                          <div className="col-span-8 text-xs text-slate-700">
                            {line.item?.sku} x {line.ordered_quantity}
                          </div>
                          <div className="col-span-4">
                            <input
                              type="number"
                              min="0"
                              max={line.ordered_quantity}
                              value={receiveForms?.[order.id]?.[line.id] ?? line.received_quantity}
                              onChange={(e) => setReceiveValue(order.id, line.id, e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copySuggestedToReceive(order)}
                  disabled={(order.lines ?? []).length === 0}
                  className="mt-3 w-full bg-slate-100 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors"
                >
                  Copy Suggested Qty
                </button>

                <button
                  type="button"
                  onClick={() => submitReceive(order)}
                  disabled={!canReceive || processingReceiveId === order.id}
                  className="mt-2 w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  {processingReceiveId === order.id ? 'Saving...' : 'Submit Receiving'}
                </button>

                {(canManage && order.status === 'draft') && (
                  <button
                    type="button"
                    onClick={() => deleteDraft(order)}
                    disabled={processingDeleteId === order.id}
                    className="mt-2 w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-red-50 transition-colors"
                  >
                    {processingDeleteId === order.id ? 'Deleting...' : 'Delete Draft'}
                  </button>
                )}
              </div>
            ))}

            {list.length === 0 && <p className="text-sm text-slate-500">No procurement order yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
