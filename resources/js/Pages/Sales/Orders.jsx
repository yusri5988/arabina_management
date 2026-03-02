import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

const initialLine = { type: 'package', package_id: '', package_quantity: '', item_sku: '', item_quantity: '' };

export default function Orders({ packages = [], items = [], orders = [], availability = [], databaseReady = true, canCreate = false }) {
  const [form, setForm] = useState({
    customer_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [lines, setLines] = useState([initialLine]);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [list, setList] = useState(orders);

  // Default package_id if packages exist
  useEffect(() => {
    if (packages.length > 0 && lines.length === 1 && lines[0].package_id === '' && lines[0].type === 'package') {
        setLines([{ ...initialLine, package_id: packages[0].id.toString() }]);
    }
  }, [packages]);

  const addLine = (type = 'package') => {
    const defaultPackageId = type === 'package' ? (packages?.[0]?.id?.toString() ?? '') : '';
    setLines(prev => [...prev, { ...initialLine, type, package_id: defaultPackageId }]);
  };

  const removeLine = (index) => setLines(prev => prev.filter((_, i) => i !== index));
  const updateLine = (index, field, value) => {
    setLines(prev => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setNotification(null);
    setErrors({});

    try {
      const { response, payload } = await apiFetchJson('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: form.customer_name,
          order_date: form.order_date,
          lines: lines.map((line) => ({
            type: line.type,
            package_id: line.type === 'package' ? Number(line.package_id) : null,
            package_quantity: line.type === 'package' ? Number(line.package_quantity) : null,
            item_sku: line.type === 'loose' ? line.item_sku : null,
            item_quantity: line.type === 'loose' ? Number(line.item_quantity) : null,
          })),
          notes: form.notes || null,
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Sales order submitted.' });
        setList(prev => [payload.data, ...prev]);
        setForm(prev => ({ ...prev, customer_name: '', notes: '' }));
        setLines([{ ...initialLine, package_id: packages?.[0]?.id?.toString() ?? '' }]);
      } else if (response.status === 422) {
        setErrors(payload.errors ?? {});
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to submit sales order.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="Sales Orders">
      <Head title="Sales Orders" />

      <div className="space-y-6">
        {!databaseReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Database untuk sales module belum siap. Jalankan <code>php artisan migrate</code> kemudian refresh semula.
          </div>
        )}

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        {/* Package Availability Section */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-[#1E3D1A] p-6 md:p-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Package Availability
            </h2>
            <p className="text-emerald-100/60 text-sm mt-1">Ready-to-ship sets based on current inventory.</p>
          </div>
          
          <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {availability.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-slate-100 p-4 bg-slate-50 flex flex-col justify-between group hover:border-emerald-200 transition-all">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pkg.code}</p>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{pkg.name}</p>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <span className={`text-xs font-medium ${pkg.available_qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {pkg.available_qty > 0 ? 'Available' : 'Unavailable'}
                  </span>
                  <span className={`text-2xl font-black ${pkg.available_qty > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {pkg.available_qty}
                  </span>
                </div>
              </div>
            ))}
            {availability.length === 0 && <p className="text-sm text-slate-500 italic col-span-full">No packages defined.</p>}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Submit Sales Order</h2>
            <Link
              href="/orders/history"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Delivery History
            </Link>
          </div>
          <div className="border-b border-slate-100 pb-1" />

          {!canCreate && (
            <p className="mt-4 text-sm text-slate-500">
              Akaun ini boleh lihat order sahaja. Hanya role <span className="font-semibold">sales</span> atau <span className="font-semibold">super admin</span> boleh submit.
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Customer Name</label>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm bg-slate-50 focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                  required
                />
                {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Order Date</label>
                <input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setForm(prev => ({ ...prev, order_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm bg-slate-50 focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                  required
                />
                {errors.order_date && <p className="text-xs text-red-500 mt-1">{errors.order_date[0]}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button 
                    type="button" 
                    onClick={() => addLine('package')} 
                    className="flex-1 w-full bg-white border border-slate-200 hover:border-arabina-accent hover:text-arabina-accent rounded-2xl py-3 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  ADD PACKAGE
                </button>
                <button 
                    type="button" 
                    onClick={() => addLine('loose')} 
                    className="flex-1 w-full bg-white border border-slate-200 hover:border-arabina-accent hover:text-arabina-accent rounded-2xl py-3 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  ADD LOOSE SKU
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all hover:border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${line.type === 'package' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {line.type === 'package' ? 'Package' : 'Loose SKU'}
                      </span>
                      <button type="button" onClick={() => removeLine(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-8">
                          {line.type === 'package' ? (
                              <select
                                  value={line.package_id}
                                  onChange={(e) => updateLine(index, 'package_id', e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                                  required
                              >
                                  <option value="">Select Package</option>
                                  {packages.map((pkg) => (
                                      <option key={pkg.id} value={pkg.id}>
                                          {pkg.code} - {pkg.name}
                                      </option>
                                  ))}
                              </select>
                          ) : (
                              <select
                                  value={line.item_sku}
                                  onChange={(e) => updateLine(index, 'item_sku', e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                                  required
                              >
                                  <option value="">Select SKU</option>
                                  {items.map((item) => (
                                      <option key={item.id} value={item.sku}>
                                          {item.sku} - {item.name}
                                      </option>
                                  ))}
                              </select>
                          )}
                      </div>
                      <div className="col-span-4">
                          <input
                              type="number"
                              min="1"
                              value={line.type === 'package' ? line.package_quantity : line.item_quantity}
                              onChange={(e) => updateLine(index, line.type === 'package' ? 'package_quantity' : 'item_quantity', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-right bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                              placeholder="Qty"
                              required
                          />
                      </div>
                    </div>
                    {errors[`lines.${index}.package_id`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.package_id`][0]}</p>}
                    {errors[`lines.${index}.item_sku`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.item_sku`][0]}</p>}
                    {errors[`lines.${index}.package_quantity`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.package_quantity`][0]}</p>}
                    {errors[`lines.${index}.item_quantity`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.item_quantity`][0]}</p>}
                  </div>
                ))}
                {errors.lines && typeof errors.lines === 'string' && <p className="text-xs text-red-500">{errors.lines}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Notes (Optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                placeholder="Specific delivery instructions..."
              />
            </div>

            <button
              type="submit"
              disabled={processing || !databaseReady || !canCreate}
              className="w-full bg-[#1E3D1A] text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 hover:bg-emerald-950 transition-all shadow-lg shadow-emerald-900/10"
            >
              {processing ? 'Saving...' : 'Submit Sales Order'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Recent Orders ({list.length})
          </h3>
          <div className="space-y-3">
            {list.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md hover:border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{order.code}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    order.status === 'fulfilled'
                      ? 'bg-emerald-100 text-emerald-700'
                      : order.status === 'partial'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status === 'fulfilled' ? 'Shipped' : order.status}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1 font-medium">{order.customer_name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Order Date: {order.order_date}</p>
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {order.lines?.map((line) => (
                    <li key={line.id} className="text-xs text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full ${line.package_id ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                        {line.package_id 
                            ? <><span className="font-bold text-slate-700">{line.package?.code}</span> - {line.package?.name}</>
                            : <><span className="font-bold text-slate-700">{line.item_sku}</span> (Loose)</>
                        }
                      </span>
                      <span className="font-bold text-slate-500">
                        x{line.package_id ? line.package_quantity : line.item_quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {list.length === 0 && <p className="text-sm text-slate-500 italic px-2">No sales order recorded yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
