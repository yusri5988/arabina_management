import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

export default function ProcurementIndex({ databaseReady = true, canManage = false, canReceive = false, orders = [], items = [], packages = [] }) {
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

  const setReceiveValue = (orderId, lineId, value) => {
    setReceiveForms((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [lineId]: value,
      },
    }));
  };

  const setDraftSearchValue = (orderId, value) => {
    setDraftSearchForms((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  };

  const setDraftAddValue = (orderId, field, value) => {
    setDraftAddForms((prev) => ({
      ...prev,
      [orderId]: {
        item_id: '',
        quantity: '',
        ...(prev[orderId] ?? {}),
        [field]: value,
      },
    }));
  };

  const setDraftAddPackageValue = (orderId, field, value) => {
    setDraftAddPackageForms((prev) => ({
      ...prev,
      [orderId]: {
        package_id: '',
        quantity: '',
        ...(prev[orderId] ?? {}),
        [field]: value,
      },
    }));
  };

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

  const submitReceive = async (order) => {
    setNotification(null);
    setProcessingReceiveId(order.id);

    const payloadLines = order.lines.map((line) => {
      const rawValue = receiveForms?.[order.id]?.[line.id];
      const receivedQuantity = rawValue === '' || rawValue === null || rawValue === undefined
        ? Number(line.ordered_quantity ?? 0)
        : Number(rawValue);

      return {
        line_id: line.id,
        received_quantity: receivedQuantity,
      };
    });

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}/receive`, {
        method: 'PUT',
        body: JSON.stringify({ lines: payloadLines }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Receiving saved.' });
        setList((prev) => prev.filter((x) => x.id !== order.id));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to submit receiving.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingReceiveId(null);
    }
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

  const addSkuToDraft = async (order) => {
    const form = draftAddForms?.[order.id] ?? {};
    const itemId = Number(form.item_id || 0);
    const quantity = Number(form.quantity || 0);

    if (!itemId || quantity < 1) {
      setNotification({ type: 'error', message: 'Please choose SKU and valid quantity.' });
      return;
    }

    setNotification(null);
    setProcessingAddSkuId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId, quantity }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'SKU added.' });
        setList((prev) => prev.map((x) => (x.id === order.id ? payload.data : x)));
        setDraftAddForms((prev) => ({
          ...prev,
          [order.id]: {
            ...(prev[order.id] ?? {}),
            item_id: '',
            quantity: '',
          },
        }));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to add SKU.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingAddSkuId(null);
    }
  };

  const addPackageToDraft = async (order) => {
    const form = draftAddPackageForms?.[order.id] ?? {};
    const packageId = Number(form.package_id || 0);
    const quantity = Number(form.quantity || 0);

    if (!packageId || quantity < 1) {
      setNotification({ type: 'error', message: 'Please choose package and valid quantity.' });
      return;
    }

    setNotification(null);
    setProcessingAddPackageId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}/packages`, {
        method: 'POST',
        body: JSON.stringify({ package_id: packageId, quantity }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Package added.' });
        setList((prev) => prev.map((x) => (x.id === order.id ? payload.data : x)));
        setDraftAddPackageForms((prev) => ({
          ...prev,
          [order.id]: {
            ...(prev[order.id] ?? {}),
            package_id: '',
            quantity: '',
          },
        }));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to add package.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingAddPackageId(null);
    }
  };

  const submitOrder = async (order) => {
    if (!window.confirm(`Submit procurement order ${order.code}?`)) {
      return;
    }

    setNotification(null);
    setProcessingSubmitId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`/procurement/orders/${order.id}/submit`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Order submitted.' });
        setList((prev) => prev.map((x) => (x.id === order.id ? payload.data : x)));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to submit order.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingSubmitId(null);
    }
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
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
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
                          <div>
                            <p className="text-sm font-bold text-slate-800">{line.package_code}</p>
                            <p className="text-[11px] text-slate-500">{line.package_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateNewOrderPackageQuantity(index, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 active:scale-95 shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                              </svg>
                            </button>
                            <span className="min-w-[3rem] text-center text-sm font-black text-blue-700 font-mono">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateNewOrderPackageQuantity(index, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 active:scale-95 shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </button>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeNewOrderPackageLine(index)} 
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                            title="Remove item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {newOrderPackageLines.length === 0 && <p className="text-sm text-slate-500 italic">No packages added yet.</p>}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 md:col-span-8">
                      <select
                        value={newOrderAddPackageForm.package_id}
                        onChange={(e) => setNewOrderAddPackageForm({ ...newOrderAddPackageForm, package_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      >
                        <option value="">Select Package</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.code} - {pkg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-8 md:col-span-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newOrderAddPackageForm.quantity}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNewOrderAddPackageForm({ ...newOrderAddPackageForm, quantity: clean === '' ? '' : Number(clean) });
                        }}
                        placeholder="Qty"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <button
                        type="button"
                        onClick={addNewOrderPackageLine}
                        className="w-full rounded-lg bg-blue-600 text-white text-xs font-bold py-1.5 hover:bg-blue-700 disabled:opacity-50"
                        disabled={!newOrderAddPackageForm.package_id || !newOrderAddPackageForm.quantity}
                      >
                        Add Package
                      </button>
                    </div>
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
                          <div>
                            <p className="text-sm font-bold text-slate-800">{line.sku}</p>
                            <p className="text-[11px] text-slate-500">{line.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateNewOrderSkuQuantity(index, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 active:scale-95 shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                              </svg>
                            </button>
                            <span className="min-w-[3rem] text-center text-sm font-black text-emerald-700 font-mono">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateNewOrderSkuQuantity(index, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 active:scale-95 shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </button>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeNewOrderSkuLine(index)} 
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                            title="Remove item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {newOrderSkuLines.length === 0 && <p className="text-sm text-slate-500 italic">No individual SKUs added yet.</p>}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 md:col-span-8">
                      <select
                        value={newOrderAddSkuForm.item_id}
                        onChange={(e) => setNewOrderAddSkuForm({ ...newOrderAddSkuForm, item_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      >
                        <option value="">Select SKU</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-8 md:col-span-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newOrderAddSkuForm.quantity}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, '');
                          setNewOrderAddSkuForm({ ...newOrderAddSkuForm, quantity: clean === '' ? '' : Number(clean) });
                        }}
                        placeholder="Qty"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-right bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <button
                        type="button"
                        onClick={addNewOrderSkuLine}
                        className="w-full rounded-lg bg-emerald-600 text-white text-xs font-bold py-1.5 hover:bg-emerald-700 disabled:opacity-50"
                        disabled={!newOrderAddSkuForm.item_id || !newOrderAddSkuForm.quantity}
                      >
                        Add SKU
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
                    className="group relative w-full overflow-hidden rounded-2xl bg-[#1E3D1A] p-4 text-white shadow-lg transition-all hover:bg-emerald-900 disabled:opacity-50 disabled:hover:bg-[#1E3D1A]"
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
                  <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                    This will create a new procurement order draft with the specified items.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Procurement Orders ({list.length})</h2>
          <div className="mt-5 space-y-4">
            {list.map((order) => {
              const isReceived = order.status === 'received';
              const isReceiveFormOpen = Boolean(expandedReceiveForms?.[order.id]);
              const draftSearch = (draftSearchForms?.[order.id] ?? '').trim().toLowerCase();
              const filteredOrderLines = (order.lines ?? []).filter((line) => {
                if (draftSearch === '') {
                  return true;
                }

                return line.item?.sku?.toLowerCase().includes(draftSearch)
                  || line.item?.name?.toLowerCase().includes(draftSearch);
              });

              const existingItemIds = new Set((order.lines ?? []).map((line) => line.item_id));
              const addOptions = items.filter((item) => !existingItemIds.has(item.id));

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
                      <div className="space-y-1">
                        {(order.package_lines ?? []).map((line) => (
                          <p key={line.id} className="text-xs text-slate-600 font-medium">
                            • {line.package?.code} ({line.package?.name}) <span className="text-blue-600">x {line.quantity}</span>
                          </p>
                        ))}
                        {(order.package_lines ?? []).length === 0 && <p className="text-xs text-slate-400 italic">No package lines.</p>}
                      </div>

                      {order.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{order.notes}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => toggleReceiveForm(order.id)}
                        className="w-full mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">SKU List ({(order.lines ?? []).length})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-slate-500 transition-transform ${isReceiveFormOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {isReceiveFormOpen && (
                        <>
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Search SKU in this order..."
                              value={draftSearchForms?.[order.id] ?? ''}
                              onChange={(e) => setDraftSearchValue(order.id, e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            {filteredOrderLines.map((line) => (
                              <div key={line.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                <div className="text-xs">
                                  <p className="font-bold text-slate-700">{line.item?.sku}</p>
                                  <p className="text-[10px] text-slate-400">{line.item?.name}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Qty</span>
                                  <span className="text-sm font-black text-slate-700">{line.ordered_quantity}</span>
                                </div>
                              </div>
                            ))}

                            {filteredOrderLines.length === 0 && (
                              <p className="text-xs text-slate-500 italic px-1 py-2">No SKU match found.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <a
                      href={`/procurement/orders/${order.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-white border border-emerald-200 text-emerald-700 py-2.5 rounded-xl text-sm font-bold text-center hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download PDF
                    </a>
                  </div>

                </div>
              );
            })}

            {list.length === 0 && <p className="text-sm text-slate-500">No procurement order yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
