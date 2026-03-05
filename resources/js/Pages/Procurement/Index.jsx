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
  const [processingDeleteId, setProcessingDeleteId] = useState(null);
  const [list, setList] = useState(orders);
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
    let packageId = newOrderAddPackageForm.package_id;
    const quantity = Number(newOrderAddPackageForm.quantity);

    if (typeof packageId === 'string' && isNaN(Number(packageId))) {
        const found = packages.find(p => `${p.code} — ${p.name}` === packageId || p.code === packageId);
        if (found) packageId = found.id;
    } else {
        packageId = Number(packageId);
    }

    if (packageId && quantity > 0) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        setNewOrderPackageLines(prev => [...prev, { package_id: pkg.id, quantity, package_code: pkg.code, package_name: pkg.name }]);
        setNewOrderAddPackageForm({ package_id: '', quantity: '' });
      }
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
    let itemId = newOrderAddSkuForm.item_id;
    const quantity = Number(newOrderAddSkuForm.quantity);

    if (typeof itemId === 'string' && isNaN(Number(itemId))) {
        const found = items.find(i => `${i.sku} — ${i.name}` === itemId || i.sku === itemId);
        if (found) itemId = found.id;
    } else {
        itemId = Number(itemId);
    }

    if (itemId && quantity > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setNewOrderSkuLines(prev => [...prev, { item_id: item.id, quantity, sku: item.sku, name: item.name }]);
        setNewOrderAddSkuForm({ item_id: '', quantity: '' });
      }
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

  return (
    <AuthenticatedLayout title="Procurement" backUrl="__back__">
      <>
        <Head title="Procurement" />

        <div className="space-y-8 pb-20">
          {!databaseReady && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
              Database untuk procurement module belum siap. Jalankan <code>php artisan migrate</code> kemudian refresh semula.
            </div>
          )}

          {notification && (
            <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
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
                          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Analyzing {suggestion.source_orders.length} unfulfilled orders for stock requirements</p>
                      </div>
                      {suggestion.source_orders.length > 0 && (
                          <button 
                              onClick={useSuggestion}
                              className="w-full md:w-auto text-[11px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 border border-amber-200"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.572-.325Zm-14.444-2.848a7 7 0 0 0 11.712 3.138.75.75 0 0 0-1.572-.325 5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311Z" clipRule="evenodd" /></svg>
                              Auto-Fill Form
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
                                                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform text-lg">📦</div>
                                                  <div>
                                                      <p className="text-xs font-black text-emerald-900 leading-tight">{p.code}</p>
                                                      <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">{p.name}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-sm font-black text-emerald-700">x{p.quantity}</p>
                                              </div>
                                          </div>
                                      ))}
                                      {suggestion.sku_lines.map((s, idx) => (
                                          <div key={`sku-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:border-blue-300 transition-all">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform text-lg">🧩</div>
                                                  <div>
                                                      <p className="text-xs font-black text-blue-900 leading-tight">{s.sku}</p>
                                                      <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">{s.name}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-sm font-black text-blue-700">+{s.shortage_qty}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="py-12 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No stock shortage detected</div>
                              )}
                          </div>
                          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pending Demand Source</h3>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                  {suggestion.source_orders.map(so => (
                                      <div key={so.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-[11px] font-black text-slate-800">{so.code}</span>
                                              <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{so.customer}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                              {so.packages.map((p, i) => <span key={i} className="text-[8px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-black border border-emerald-100/50">{p.code} (x{p.qty})</span>)}
                                              {so.loose_skus.map((s, i) => <span key={i} className="text-[8px] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-black border border-blue-100/50">{s.sku} (x{s.qty})</span>)}
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
                      <div className="relative z-10">
                          <h2 className="text-xl font-black text-white flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                              </div>
                              Create Procurement Order
                          </h2>
                          <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">Draft a new request for inventory replenishment</p>
                      </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-12">
                      {/* Section: Packages */}
                      <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>Package Configuration</h3>
                              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{newOrderPackageLines.length} Items Added</span>
                          </div>
                          <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4 md:p-6 space-y-4">
                              <div className="flex flex-col md:flex-row gap-2 items-center">
                                  <div className="flex-1 w-full relative group">
                                      <input 
                                          list="package-list" 
                                          value={newOrderAddPackageForm.package_id} 
                                          onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, package_id: e.target.value })} 
                                          placeholder="Select Package..." 
                                          className="w-full rounded-xl border-slate-200 text-xs font-bold h-12 pl-4 pr-10 bg-white focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all placeholder:text-slate-400" 
                                      />
                                      <datalist id="package-list">{packages.map((pkg) => <option key={pkg.id} value={`${pkg.code} — ${pkg.name}`} />)}</datalist>
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z" clipRule="evenodd" /></svg>
                                      </div>
                                  </div>
                                  <input type="number" value={newOrderAddPackageForm.quantity} onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, quantity: e.target.value })} placeholder="Qty" className="w-full md:w-24 rounded-xl border-slate-200 text-xs font-bold text-center h-12 bg-white focus:ring-blue-500/20 shadow-sm" />
                                  <button onClick={addNewOrderPackageLine} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest w-full md:w-48 shadow-md active:scale-95 transition-all">Add Package</button>
                              </div>
                              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                  {newOrderPackageLines.map((line, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl py-3 px-5 shadow-sm group hover:border-blue-300 transition-all">
                                          <div className="flex items-center gap-5">
                                              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors border border-slate-100 shrink-0">{index + 1}</div>
                                              <div>
                                                  <p className="text-base font-black text-slate-900 leading-none tracking-tight">{line.package_code}</p>
                                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{line.package_name}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-6">
                                              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                  <button onClick={() => updateNewOrderPackageQuantity(index, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-slate-200 transition-all active:scale-90 font-black">-</button>
                                                  <span className="text-sm font-black w-8 text-center text-slate-700">{line.quantity}</span>
                                                  <button onClick={() => updateNewOrderPackageQuantity(index, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-slate-200 transition-all active:scale-90 font-black">+</button>
                                              </div>
                                              <button onClick={() => removeNewOrderPackageLine(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Section: SKUs */}
                      <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3"><span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>Loose SKU Selection</h3>
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{newOrderSkuLines.length} Items Added</span>
                          </div>
                          <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4 md:p-6 space-y-4">
                              <div className="flex flex-col md:flex-row gap-2 items-center">
                                  <div className="flex-1 w-full relative group">
                                      <input 
                                          list="sku-list" 
                                          value={newOrderAddSkuForm.item_id} 
                                          onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, item_id: e.target.value })} 
                                          placeholder="Select individual SKU..." 
                                          className="w-full rounded-xl border-slate-200 text-xs font-bold h-12 pl-4 pr-10 bg-white focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all placeholder:text-slate-400" 
                                      />
                                      <datalist id="sku-list">{items.map((item) => <option key={item.id} value={`${item.sku} — ${item.name}`} />)}</datalist>
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z" clipRule="evenodd" /></svg>
                                      </div>
                                  </div>
                                  <input type="number" value={newOrderAddSkuForm.quantity} onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, quantity: e.target.value })} placeholder="Qty" className="w-full md:w-24 rounded-xl border-slate-200 text-xs font-bold text-center h-12 bg-white focus:ring-emerald-500/20 shadow-sm" />
                                  <button onClick={addNewOrderSkuLine} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest w-full md:w-48 shadow-md active:scale-95 transition-all">Add SKU</button>
                              </div>
                              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                  {newOrderSkuLines.map((line, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl py-3 px-5 shadow-sm group hover:border-emerald-300 transition-all">
                                          <div className="flex items-center gap-5">
                                              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors border border-slate-100 shrink-0">{index + 1}</div>
                                              <div>
                                                  <p className="text-base font-black text-slate-900 leading-none tracking-tight">{line.sku}</p>
                                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{line.name}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-6">
                                              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                  <button onClick={() => updateNewOrderSkuQuantity(index, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-emerald-600 border border-slate-200 transition-all active:scale-90 font-black">-</button>
                                                  <span className="text-sm font-black w-8 text-center text-slate-700">{line.quantity}</span>
                                                  <button onClick={() => updateNewOrderSkuQuantity(index, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-emerald-600 border border-slate-200 transition-all active:scale-90 font-black">+</button>
                                              </div>
                                              <button onClick={() => removeNewOrderSkuLine(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="mt-12 pt-8 border-t border-slate-100">
                          <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3 px-1">Internal Procurement Notes</label>
                          <textarea value={newOrderNotes} onChange={(e) => setNewOrderNotes(e.target.value)} rows="3" className="w-full rounded-2xl border-slate-200 text-sm font-medium focus:ring-slate-500/10 focus:border-slate-400 bg-slate-50/30 p-4 mb-8" placeholder="Enter special instructions or context for this order..."></textarea>
                          <button onClick={createDraft} disabled={!databaseReady || !canManage || processingCreate || (newOrderPackageLines.length === 0 && newOrderSkuLines.length === 0)} className="group relative w-full overflow-hidden rounded-[2rem] bg-emerald-600 p-6 text-white shadow-xl hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all">
                              <div className="relative z-10 flex items-center justify-center gap-4">
                                  <span className="text-sm font-black uppercase tracking-[0.25em]">{processingCreate ? 'Processing...' : 'Finalize & Create Procurement Order'}</span>
                                  {!processingCreate && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-2 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>}
                              </div>
                          </button>
                      </div>
                  </div>
              </div>

              {/* Row 3: History */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" /></svg>
                            Procurement History
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Found {list.length} orders in the system</p>
                    </div>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  {list.map((order) => (
                    <div key={order.id} className="group rounded-[2rem] border border-slate-100 bg-white hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
                      <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30 border-b border-slate-100/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm text-lg">📄</div>
                            <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{order.code}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm bg-white ${order.status === 'received' ? 'text-emerald-700 border-emerald-100' : 'text-blue-700 border-blue-100'}`}>{order.status}</span>
                      </div>
                      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-3">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Items Ordered</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {/* 1. Display Packages First */}
                                {order.package_lines?.map((pLine) => (
                                  <div key={`pkg-${pLine.id}`} className="p-3 rounded-xl bg-blue-50/30 border border-blue-100 group-hover:bg-white transition-colors flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">📦</span>
                                        <div>
                                            <p className="text-[11px] font-black text-blue-900 leading-tight">{pLine.package?.code}</p>
                                            <p className="text-[9px] text-blue-500 font-bold uppercase">Package Set</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-black text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-sm">x{pLine.quantity}</span>
                                  </div>
                                ))}

                                {/* 2. Calculate and Display Loose SKUs (Individual Items) */}
                                {(() => {
                                    const pkgLines = order.packageLines || order.package_lines || [];
                                    const ordLines = order.lines || [];

                                    const looseLines = ordLines.map(line => {
                                        let looseQty = Number(line.ordered_quantity || 0);
                                        
                                        pkgLines.forEach(pLine => {
                                            const pkg = pLine.package;
                                            if (!pkg) return;

                                            const pItems = pkg.packageItems || pkg.package_items || [];
                                            const pItem = pItems.find(pi => Number(pi.item_id) === Number(line.item_id));
                                            
                                            if (pItem) {
                                                const qtyInPkg = Number(pItem.quantity || 0);
                                                const pkgOrderQty = Number(pLine.quantity || 0);
                                                looseQty -= (pkgOrderQty * qtyInPkg);
                                            }
                                        });
                                        return { ...line, looseQty };
                                    }).filter(l => l.looseQty > 0);

                                    return looseLines.map((line) => (
                                        <div key={`loose-${line.id}`} className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-100 group-hover:bg-white transition-colors flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">🧩</span>
                                                <div>
                                                    <p className="text-[11px] font-black text-emerald-900 leading-tight">{line.item?.sku}</p>
                                                    <p className="text-[9px] text-emerald-500 font-bold uppercase">Loose SKU</p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-sm">x{line.looseQty}</span>
                                        </div>
                                    ));
                                })()}

                                {(!order.package_lines || order.package_lines.length === 0) && (!order.lines || order.lines.length === 0) && (
                                    <p className="text-[10px] text-slate-400 italic px-1">No items found in this order</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                          <button onClick={() => toggleReceiveForm(order.id)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 border border-slate-200 text-slate-600 bg-white hover:border-slate-400 transition-all group/btn shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest">View SKU Detail List ({(order.lines ?? []).length})</span>
                            <span className={`text-xs transition-transform duration-300 ${expandedReceiveForms?.[order.id] ? 'rotate-180' : ''}`}>▼</span>
                          </button>
                          {expandedReceiveForms?.[order.id] && (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                                {(order.lines ?? []).map((line) => (
                                  <div key={line.id} className="flex items-center justify-between rounded-xl bg-slate-50/50 border border-slate-100 px-4 py-3">
                                    <div><p className="text-xs font-black text-slate-800 tracking-tight">{line.item?.sku}</p></div>
                                    <span className="text-[11px] font-black text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{line.ordered_quantity} {line.item?.unit}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-5 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/20">
                        <a href={`/procurement/orders/${order.id}/pdf`} target="_blank" rel="noreferrer" className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest hover:border-slate-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500"><path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" /></svg>
                            Export PDF
                        </a>
                        {canManage && order.status === 'draft' && (
                            <button onClick={() => deleteDraft(order)} className="flex-1 bg-white border border-red-100 text-red-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">Cancel Order</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                      <div className="py-20 text-center text-slate-400 font-bold text-sm">No procurement history found</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E0; }
        `}} />
      </>
    </AuthenticatedLayout>
  );
}
