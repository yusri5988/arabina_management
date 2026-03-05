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

  const deleteDraft = async (order) => {
    if (!confirm(`Are you sure you want to delete draft ${order.code}?`)) return;
    setProcessingDeleteId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Draft deleted.' });
        setList((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to delete draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingDeleteId(null);
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
          <div className="flex flex-col gap-8">
            {/* Row 1: Demand Analysis */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Demand & Shortage Analysis
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Analyzing {suggestion.source_orders.length} unfulfilled sales orders for stock requirements</p>
                    </div>
                    {suggestion.source_orders.length > 0 && (
                        <button 
                            onClick={useSuggestion}
                            className="w-full md:w-auto text-[11px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.572-.325Zm-14.444-2.848a7 7 0 0 0 11.712 3.138.75.75 0 0 0-1.572-.325 5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311Z" clipRule="evenodd" />
                            </svg>
                            Auto-Fill Procurement Form
                        </button>
                    )}
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recommended Replenishment</h3>
                            {(suggestion.package_lines.length > 0 || suggestion.sku_lines.length > 0) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {suggestion.package_lines.map((p, idx) => (
                                        <div key={`pkg-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 hover:border-emerald-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                                    📦
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-emerald-900 leading-tight">{p.code}</p>
                                                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">{p.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-700">x{p.quantity}</p>
                                                <p className="text-[8px] text-emerald-500/70 font-bold uppercase">Package Set</p>
                                            </div>
                                        </div>
                                    ))}

                                    {suggestion.sku_lines.map((s, idx) => (
                                        <div key={`sku-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:border-blue-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                                    🧩
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-blue-900 leading-tight">{s.sku}</p>
                                                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">{s.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-blue-700">+{s.shortage_qty}</p>
                                                <p className="text-[8px] text-blue-500/70 font-bold uppercase">Loose SKU</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200 text-center">
                                    <p className="text-xs text-slate-500 font-bold">No stock shortage detected</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Inventory levels match current demand</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pending Demand Source</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {suggestion.source_orders.map(so => (
                                    <div key={so.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[11px] font-black text-slate-800">{so.code}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{so.customer}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {so.packages.map((p, i) => (
                                                <span key={`p-${i}`} className="text-[8px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-black border border-emerald-100/50">
                                                    {p.code} (x{p.qty})
                                                </span>
                                            ))}
                                            {so.loose_skus.map((s, i) => (
                                                <span key={`s-${i}`} className="text-[8px] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-black border border-blue-100/50">
                                                    {s.sku} (x{s.qty})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {suggestion.source_orders.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-8">No unfulfilled sales orders</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Order Builder */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
                                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                    </svg>
                                </div>
                                Create Procurement Order
                            </h2>
                            <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">Draft a new request for inventory replenishment based on current analysis</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex flex-col gap-10">
                        {/* Section: Packages */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1">
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                                    Package Sets Configuration
                                </h3>
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                    {newOrderPackageLines.length} Items
                                </span>
                            </div>

                            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4 md:p-6 space-y-4">
                                <div className="flex flex-col md:flex-row gap-2">
                                    <div className="flex-1">
                                        <select
                                            value={newOrderAddPackageForm.package_id}
                                            onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, package_id: e.target.value })}
                                            className="w-full rounded-xl border-slate-200 text-xs font-bold focus:ring-blue-500/20 focus:border-blue-500 bg-white h-12 px-4 shadow-sm"
                                        >
                                            <option value="">Select Package...</option>
                                            {packages.map((pkg) => (
                                                <option key={pkg.id} value={pkg.id}>{pkg.code} — {pkg.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full md:w-24">
                                        <input
                                            type="number"
                                            value={newOrderAddPackageForm.quantity}
                                            onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, quantity: e.target.value })}
                                            placeholder="Qty"
                                            className="w-full rounded-xl border-slate-200 text-xs font-bold text-center focus:ring-blue-500/20 focus:border-blue-500 bg-white h-12 shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addNewOrderPackageLine}
                                        className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full md:w-48 shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add Package</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[30rem] overflow-y-auto pr-2 custom-scrollbar">
                                    {newOrderPackageLines.map((line, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl py-2 px-4 shadow-sm group hover:border-blue-300 transition-all w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100 shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 leading-none tracking-tight">{line.package_code}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{line.package_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                                    <button onClick={() => updateNewOrderPackageQuantity(index, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-blue-600 border border-slate-200 transition-all active:scale-90 font-black text-xs">-</button>
                                                    <span className="text-xs font-black w-6 text-center text-slate-700">{line.quantity}</span>
                                                    <button onClick={() => updateNewOrderPackageQuantity(index, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-blue-600 border border-slate-200 transition-all active:scale-90 font-black text-xs">+</button>
                                                </div>
                                                <button onClick={() => removeNewOrderPackageLine(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {newOrderPackageLines.length === 0 && (
                                        <div className="text-center py-8 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No packages added</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section: SKUs */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1">
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                                    Loose SKUs Selection
                                </h3>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                                    {newOrderSkuLines.length} Items
                                </span>
                            </div>

                            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4 md:p-6 space-y-4">
                                <div className="flex flex-col md:flex-row gap-2">
                                    <div className="flex-1">
                                        <select
                                            value={newOrderAddSkuForm.item_id}
                                            onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, item_id: e.target.value })}
                                            className="w-full rounded-xl border-slate-200 text-xs font-bold focus:ring-emerald-500/20 focus:border-emerald-500 bg-white h-12 px-4 shadow-sm"
                                        >
                                            <option value="">Select individual SKU...</option>
                                            {items.map((item) => (
                                                <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full md:w-24">
                                        <input
                                            type="number"
                                            value={newOrderAddSkuForm.quantity}
                                            onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, quantity: e.target.value })}
                                            placeholder="Qty"
                                            className="w-full rounded-xl border-slate-200 text-xs font-bold text-center focus:ring-emerald-500/20 focus:border-emerald-500 bg-white h-12 shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addNewOrderSkuLine}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full md:w-48 shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add SKU</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[30rem] overflow-y-auto custom-scrollbar">
                                    {newOrderSkuLines.map((line, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl py-2 px-4 shadow-sm group hover:border-emerald-300 transition-all w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors border border-slate-100 shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 leading-none tracking-tight">{line.sku}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{line.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                                    <button onClick={() => updateNewOrderSkuQuantity(index, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-emerald-600 border border-slate-200 transition-all active:scale-90 font-black text-xs">-</button>
                                                    <span className="text-xs font-black w-6 text-center text-slate-700">{line.quantity}</span>
                                                    <button onClick={() => updateNewOrderSkuQuantity(index, 1)} className="text-sm font-black w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-400 hover:text-emerald-600 border border-slate-200 transition-all active:scale-90 font-black text-xs">+</button>
                                                </div>
                                                <button onClick={() => removeNewOrderSkuLine(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {newOrderSkuLines.length === 0 && (
                                        <div className="text-center py-8 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No SKUs added</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-12 border-t border-slate-100">
                        <div className="mb-8 max-w-2xl">
                            <label htmlFor="new_order_notes" className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Internal Procurement Notes</label>
                            <textarea
                                id="new_order_notes"
                                value={newOrderNotes}
                                onChange={(e) => setNewOrderNotes(e.target.value)}
                                rows="3"
                                className="w-full rounded-2xl border-slate-200 text-sm font-medium focus:ring-slate-500/10 focus:border-slate-400 bg-slate-50/30 p-4"
                                placeholder="Specify vendor instructions, expected arrival terms, or order context..."
                            ></textarea>
                        </div>

                        <button
                            type="button"
                            onClick={createDraft}
                            disabled={
                                !databaseReady
                                || !canManage
                                || processingCreate
                                || (newOrderPackageLines.length === 0 && newOrderSkuLines.length === 0)
                            }
                            className="group relative w-full overflow-hidden rounded-[2rem] bg-emerald-600 p-6 text-white shadow-xl shadow-emerald-900/10 transition-all hover:bg-emerald-700 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-4">
                                <span className="text-sm font-black uppercase tracking-[0.25em]">
                                    {processingCreate ? 'Synchronizing with Database...' : 'Finalize & Create Procurement Order'}
                                </span>
                                {!processingCreate && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-2 transition-transform">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                        <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
                    </svg>
                    Procurement History
                </h2>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Found {list.length} orders in the system</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            {list.map((order) => {
              const isReceiveFormOpen = Boolean(expandedReceiveForms?.[order.id]);
              const draftSearch = (draftSearchForms?.[order.id] ?? '').trim().toLowerCase();
              const filteredOrderLines = (order.lines ?? []).filter((line) => {
                if (draftSearch === '') return true;
                return line.item?.sku?.toLowerCase().includes(draftSearch) || line.item?.name?.toLowerCase().includes(draftSearch);
              });

              return (
                <div key={order.id} className="group rounded-2xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50 transition-all overflow-hidden">
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 tracking-tight">{order.code}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Created: {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                        order.status === 'received' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : order.status === 'partial' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        Composition
                      </h4>
                      <div className="space-y-3">
                        {order.package_lines?.map((line) => (
                          <div key={line.id} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[11px] font-black text-slate-700 flex items-center gap-2">
                                    <span className="text-emerald-500">📦</span> {line.package?.code}
                                </p>
                                <span className="text-[11px] font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">x{line.quantity}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-200/50">
                                {line.package?.packageItems?.map((pItem) => (
                                <p key={pItem.id} className="text-[9px] text-slate-500 font-bold">
                                    • {pItem.item.sku} ({pItem.quantity * line.quantity})
                                </p>
                                )) || <p className="text-[9px] text-slate-400 italic">No items</p>}
                            </div>
                          </div>
                        )) || <p className="text-[10px] text-slate-400 italic">No packages included</p>}
                      </div>
                      {order.notes && (
                        <div className="mt-4 p-3 rounded-xl bg-amber-50/30 border border-amber-100/50">
                            <p className="text-[10px] text-amber-800 font-medium italic leading-relaxed">"{order.notes}"</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => toggleReceiveForm(order.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all border ${
                            isReceiveFormOpen 
                            ? 'bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-900/10' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">SKU Detail List ({(order.lines ?? []).length})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform ${isReceiveFormOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {isReceiveFormOpen && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                            {filteredOrderLines.map((line) => (
                              <div key={line.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                                <div>
                                  <p className="text-xs font-black text-slate-800 tracking-tight">{line.item?.sku}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{line.item?.name}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-black text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{line.ordered_quantity} {line.item?.unit}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/20">
                    <a
                      href={`/procurement/orders/${order.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black text-center hover:border-slate-400 hover:bg-white active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                        <path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                      </svg>
                      Export PDF
                    </a>
                    {canManage && order.status === 'draft' && (
                        <button 
                            onClick={() => deleteDraft(order)}
                            className="flex-1 bg-white border border-red-100 text-red-600 py-3 rounded-xl text-[10px] font-black hover:bg-red-50 hover:border-red-200 active:scale-[0.98] transition-all uppercase tracking-widest"
                        >
                            Cancel Order
                        </button>
                    )}
                  </div>
                </div>
              );
            })}

            {list.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 border border-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-bold">No procurement records found</p>
                    <p className="text-xs text-slate-400 mt-1">Start by creating a new order above.</p>
                </div>
            )}
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
