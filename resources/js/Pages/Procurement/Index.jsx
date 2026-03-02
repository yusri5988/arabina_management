import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

export default function ProcurementIndex({ 
    databaseReady = true, 
    canManage = false, 
    canReceive = false, 
    orders = [], 
    items = [], 
    packages = [],
    suggestion = { package_lines: [], sku_lines: [], source_orders: [] }
}) {
  const [notification, setNotification] = useState(null);
  const [processingCreate, setProcessingCreate] = useState(false);
  const [processingReceiveId, setProcessingReceiveId] = useState(null);
  const [processingDeleteId, setProcessingDeleteId] = useState(null);
  const [processingAddSkuId, setProcessingAddSkuId] = useState(null);
  const [processingAddPackageId, setProcessingAddPackageId] = useState(null);
  const [processingSubmitId, setProcessingSubmitId] = useState(null);
  const [list, setList] = useState(orders);
  const [receiveForms, setReceiveForms] = useState({});
  const [draftSearchForms, setDraftSearchForms] = useState({});
  const [draftAddForms, setDraftAddForms] = useState({});
  const [draftAddPackageForms, setDraftAddPackageForms] = useState({});
  const [expandedReceiveForms, setExpandedReceiveForms] = useState({});

  const [newOrderPackageLines, setNewOrderPackageLines] = useState([]);
  const [newOrderSkuLines, setNewOrderSkuLines] = useState([]);
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [newOrderAddPackageForm, setNewOrderAddPackageForm] = useState({ package_id: '', quantity: '' });
  const [newOrderAddSkuForm, setNewOrderAddSkuForm] = useState({ item_id: '', quantity: '' });

  const toggleReceiveForm = (orderId) => {
    setExpandedReceiveForms((prev) => ({
      ...prev,
      [orderId]: !prev?.[orderId],
    }));
  };

  const addNewOrderPackageLine = () => {
    const packageId = Number(newOrderAddPackageForm.package_id);
    const quantity = Number(newOrderAddPackageForm.quantity);
    if (packageId && quantity > 0) {
      const pkg = packages.find(p => p.id === packageId);
      setNewOrderPackageLines(prev => [...prev, { package_id: packageId, quantity, package_code: pkg.code, package_name: pkg.name }]);
      setNewOrderAddPackageForm({ package_id: '', quantity: '' });
    }
  };

  const removeNewOrderPackageLine = (index) => {
    setNewOrderPackageLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateNewOrderPackageQuantity = (index, delta) => {
    setNewOrderPackageLines(prev => prev.map((line, i) => {
      if (i === index) {
        return { ...line, quantity: Math.max(1, line.quantity + delta) };
      }
      return line;
    }));
  };

  const addNewOrderSkuLine = () => {
    const itemId = Number(newOrderAddSkuForm.item_id);
    const quantity = Number(newOrderAddSkuForm.quantity);
    if (itemId && quantity > 0) {
      const item = items.find(i => i.id === itemId);
      setNewOrderSkuLines(prev => [...prev, { item_id: itemId, quantity, sku: item.sku, name: item.name }]);
      setNewOrderAddSkuForm({ item_id: '', quantity: '' });
    }
  };

  const removeNewOrderSkuLine = (index) => {
    setNewOrderSkuLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateNewOrderSkuQuantity = (index, delta) => {
    setNewOrderSkuLines(prev => prev.map((line, i) => {
      if (i === index) {
        return { ...line, quantity: Math.max(1, line.quantity + delta) };
      }
      return line;
    }));
  };

  const useSuggestion = () => {
    setNewOrderPackageLines(suggestion.package_lines.map(p => ({
        package_id: p.package_id,
        quantity: p.quantity,
        package_code: p.code,
        package_name: p.name
    })));
    setNewOrderSkuLines(suggestion.sku_lines.map(s => ({
        item_id: s.item_id,
        quantity: s.shortage_qty,
        sku: s.sku,
        name: s.name
    })));
    setNewOrderNotes(`Based on shortage suggestion for ${suggestion.source_orders.length} unfulfilled orders.`);
  };

  const createDraft = async () => {
    setNotification(null);
    setProcessingCreate(true);

    try {
      const { response, payload } = await apiFetchJson('/procurement/orders', {
        method: 'POST',
        body: JSON.stringify({
          package_lines: newOrderPackageLines.map(line => ({ package_id: line.package_id, quantity: line.quantity })),
          sku_lines: newOrderSkuLines.map(line => ({ item_id: line.item_id, quantity: line.quantity })),
          notes: newOrderNotes,
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Draft created.' });
        setList((prev) => [payload.data, ...prev]);
        setNewOrderPackageLines([]);
        setNewOrderSkuLines([]);
        setNewOrderNotes('');
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to create draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingCreate(false);
    }
  };

  const setDraftSearchValue = (orderId, value) => {
    setDraftSearchForms((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  };

  return (
    <AuthenticatedLayout title="Procurement" backUrl="__back__">
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

        {canManage && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4 space-y-6">
                {/* Shortage Suggestion Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-amber-600 p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            Shortage Suggestion
                        </h2>
                        <p className="text-amber-50/70 text-xs mt-1">Calculated from {suggestion.source_orders.length} unfulfilled orders.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {(suggestion.package_lines.length > 0 || suggestion.sku_lines.length > 0) ? (
                            <>
                                <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-2 custom-scrollbar">
                                    {suggestion.package_lines.map((p, idx) => (
                                        <div key={`pkg-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <div>
                                                <p className="text-xs font-black text-emerald-800">📦 {p.code}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold">{p.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-700">x{p.quantity}</p>
                                                <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-tighter">Package Set</p>
                                            </div>
                                        </div>
                                    ))}

                                    {suggestion.sku_lines.map((s, idx) => (
                                        <div key={`sku-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                                            <div>
                                                <p className="text-xs font-black text-blue-800">🧩 {s.sku}</p>
                                                <p className="text-[10px] text-blue-600 font-bold">{s.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-blue-700">+{s.shortage_qty}</p>
                                                <p className="text-[9px] text-blue-400 uppercase font-bold tracking-tighter">Loose / Component</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={useSuggestion}
                                    className="w-full bg-amber-600 text-white py-4 rounded-2xl text-xs font-black hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                                >
                                    AUTO-FILL ORDER FORM
                                </button>
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-500 font-bold">Stock is sufficient.</p>
                                <p className="text-[10px] text-slate-400 mt-1">No unfulfilled demand detected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Source Orders Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Source Orders</h3>
                    </div>
                    <div className="p-6 max-h-60 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                            {suggestion.source_orders.map(so => (
                                <div key={so.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                                        <span className="text-[11px] font-black text-slate-700">{so.code}</span>
                                        <span className="text-[10px] text-slate-400 truncate max-w-[100px] font-bold uppercase">{so.customer}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {so.packages.map((p, i) => (
                                            <div key={`p-${i}`} className="flex justify-between items-center text-[10px]">
                                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-400"/>
                                                    {p.code}
                                                </span>
                                                <span className="font-black text-slate-500 bg-emerald-50 px-1 rounded">x{p.qty}</span>
                                            </div>
                                        ))}
                                        {so.loose_skus.map((s, i) => (
                                            <div key={`s-${i}`} className="flex justify-between items-center text-[10px]">
                                                <span className="text-blue-700 font-bold flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-blue-400"/>
                                                    {s.sku}
                                                </span>
                                                <span className="font-black text-slate-500 bg-blue-50 px-1 rounded">x{s.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {suggestion.source_orders.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No open sales orders.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="xl:col-span-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-fit">
                <div className="bg-[#1E3D1A] p-6 md:p-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create New Procurement Order
                </h2>
                <p className="text-emerald-100/60 text-sm mt-1">Quickly create a new procurement order by specifying packages and individual SKUs.</p>
                </div>

                <div className="p-6 md:p-8">
                <div className="space-y-6">
                    <div>
                    <label htmlFor="new_order_notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                        id="new_order_notes"
                        value={newOrderNotes}
                        onChange={(e) => setNewOrderNotes(e.target.value)}
                        rows="3"
                        className="w-full rounded-lg border-slate-200 shadow-sm text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        placeholder="Optional notes for this procurement order"
                    ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                            Packages
                        </h3>
                        <div className="space-y-3 mb-4">
                            {newOrderPackageLines.map((line, index) => (
                            <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-400 text-[10px] font-bold">
                                    {index + 1}
                                </div>
                                <div className="max-w-[120px]">
                                    <p className="text-xs font-bold text-slate-800 truncate">{line.package_code}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{line.package_name}</p>
                                </div>
                                </div>
                                <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                    <button onClick={() => updateNewOrderPackageQuantity(index, -1)} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-400">-</button>
                                    <span className="min-w-[1.5rem] text-center text-xs font-bold">{line.quantity}</span>
                                    <button onClick={() => updateNewOrderPackageQuantity(index, 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-400">+</button>
                                </div>
                                <button onClick={() => removeNewOrderPackageLine(index)} className="text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                </div>
                            </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8">
                            <select
                                value={newOrderAddPackageForm.package_id}
                                onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, package_id: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                            >
                                <option value="">Select Package</option>
                                {packages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                    {pkg.code}
                                </option>
                                ))}
                            </select>
                            </div>
                            <div className="col-span-4">
                            <input
                                type="number"
                                value={newOrderAddPackageForm.quantity}
                                onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, quantity: e.target.value })}
                                placeholder="Qty"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white"
                            />
                            </div>
                            <button
                                type="button"
                                onClick={addNewOrderPackageLine}
                                className="col-span-12 rounded-lg bg-blue-600 text-white text-[10px] font-bold py-1.5 hover:bg-blue-700"
                            >
                                ADD PACKAGE
                            </button>
                        </div>
                        </div>

                        <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                            Individual SKUs
                        </h3>
                        <div className="space-y-3 mb-4">
                            {newOrderSkuLines.map((line, index) => (
                            <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                                    {index + 1}
                                </div>
                                <div className="max-w-[120px]">
                                    <p className="text-xs font-bold text-slate-800 truncate">{line.sku}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{line.name}</p>
                                </div>
                                </div>
                                <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                    <button onClick={() => updateNewOrderSkuQuantity(index, -1)} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-400">-</button>
                                    <span className="min-w-[1.5rem] text-center text-xs font-bold">{line.quantity}</span>
                                    <button onClick={() => updateNewOrderSkuQuantity(index, 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-400">+</button>
                                </div>
                                <button onClick={() => removeNewOrderSkuLine(index)} className="text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                </div>
                            </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8">
                            <select
                                value={newOrderAddSkuForm.item_id}
                                onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, item_id: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            >
                                <option value="">Select SKU</option>
                                {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.sku}
                                </option>
                                ))}
                            </select>
                            </div>
                            <div className="col-span-4">
                            <input
                                type="number"
                                value={newOrderAddSkuForm.quantity}
                                onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, quantity: e.target.value })}
                                placeholder="Qty"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white"
                            />
                            </div>
                            <button
                                type="button"
                                onClick={addNewOrderSkuLine}
                                className="col-span-12 rounded-lg bg-emerald-600 text-white text-[10px] font-bold py-1.5 hover:bg-emerald-700"
                            >
                                ADD SKU
                            </button>
                        </div>
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
                        || (newOrderPackageLines.length === 0 && newOrderSkuLines.length === 0)
                        }
                        className="group relative w-full overflow-hidden rounded-2xl bg-[#1E3D1A] p-4 text-white shadow-lg transition-all hover:bg-emerald-900 disabled:opacity-50"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-wider">
                            {processingCreate ? 'Creating...' : 'Create Procurement Order'}
                        </span>
                        {!processingCreate && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                        )}
                        </div>
                    </button>
                    </div>
                </div>
                </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Procurement Orders ({list.length})</h2>
          <div className="mt-5 space-y-4">
            {list.map((order) => {
              const isReceiveFormOpen = Boolean(expandedReceiveForms?.[order.id]);
              const draftSearch = (draftSearchForms?.[order.id] ?? '').trim().toLowerCase();
              const filteredOrderLines = (order.lines ?? []).filter((line) => {
                if (draftSearch === '') return true;
                return line.item?.sku?.toLowerCase().includes(draftSearch) || line.item?.name?.toLowerCase().includes(draftSearch);
              });

              return (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-bold text-slate-800">{order.code}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        order.status === 'received' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : order.status === 'partial' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Packages Ordered</h4>
                      <div className="space-y-2">
                        {order.package_lines?.map((line) => (
                          <div key={line.id} className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">
                              📦 {line.package?.code} x {line.quantity}
                            </p>
                            {line.package?.packageItems?.map((pItem) => (
                              <p key={pItem.id} className="ml-6 text-xs text-slate-600 pl-2 border-l border-slate-200">
                                {pItem.item.sku} x {pItem.quantity * line.quantity}
                              </p>
                            )) || <p className="ml-6 text-[10px] text-slate-400 italic">No items in package</p>}
                          </div>
                        )) || <p className="text-sm text-slate-400 italic">No packages ordered</p>}
                      </div>
                      {order.notes && <p className="mt-2 text-xs text-slate-500 italic">"{order.notes}"</p>}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => toggleReceiveForm(order.id)}
                        className="w-full mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">SKU List ({(order.lines ?? []).length})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-slate-500 transition-transform ${isReceiveFormOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {isReceiveFormOpen && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredOrderLines.map((line) => (
                              <div key={line.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                <div className="text-xs">
                                  <p className="font-bold text-slate-700">{line.item?.sku}</p>
                                  <p className="text-[10px] text-slate-400">{line.item?.name}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-slate-700">{line.ordered_quantity} {line.item?.unit}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <a
                      href={`/procurement/orders/${order.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-white border border-emerald-200 text-emerald-700 py-2 rounded-xl text-xs font-bold text-center hover:bg-emerald-50"
                    >
                      Download PDF
                    </a>
                    {canManage && order.status === 'draft' && (
                        <button 
                            onClick={() => deleteDraft(order)}
                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold hover:bg-red-100"
                        >
                            Delete
                        </button>
                    )}
                  </div>
                </div>
              );
            })}

            {list.length === 0 && <p className="text-sm text-slate-500">No procurement order yet.</p>}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E0; }
      `}} />
    </AuthenticatedLayout>
  );
}
