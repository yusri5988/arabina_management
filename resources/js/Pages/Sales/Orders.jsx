import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

const initialLine = { package_id: '', package_quantity: '' };

export default function Orders({ packages = [], orders = [], databaseReady = true, canCreate = false }) {
  const [form, setForm] = useState({
    customer_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [lines, setLines] = useState([{ ...initialLine, package_id: packages?.[0]?.id?.toString() ?? '' }]);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [list, setList] = useState(orders);

  const addLine = () => setLines(prev => [...prev, { ...initialLine, package_id: packages?.[0]?.id?.toString() ?? '' }]);
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
            package_id: Number(line.package_id),
            package_quantity: Number(line.package_quantity),
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
    <AuthenticatedLayout title="Sales Orders" backUrl="/dashboard">
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

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Submit Sales Order</h2>

          {!canCreate && (
            <p className="mt-4 text-sm text-slate-500">
              Akaun ini boleh lihat order sahaja. Hanya role <span className="font-semibold">sales</span> atau <span className="font-semibold">super admin</span> boleh submit.
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-5">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Package Lines</h3>
                <button type="button" onClick={addLine} className="text-xs font-bold uppercase tracking-wider text-arabina-accent">
                  Add Package
                </button>
              </div>

              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div className="col-span-8">
                    <select
                      value={line.package_id}
                      onChange={(e) => updateLine(index, 'package_id', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                      required
                    >
                      {packages.length === 0 && <option value="">No package available</option>}
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.code} - {pkg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={line.package_quantity}
                      onChange={(e) => updateLine(index, 'package_quantity', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-right bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(index)} className="text-red-500 text-xs font-bold">
                        X
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(errors.lines || errors['lines.0.package_id']) && <p className="text-xs text-red-500">{errors.lines?.[0] ?? errors['lines.0.package_id']?.[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Notes (Optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 focus:ring-2 focus:ring-arabina-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={processing || !databaseReady || !canCreate || packages.length === 0}
              className="w-full bg-[#1E3D1A] text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 hover:bg-emerald-950 transition-colors"
            >
              {processing ? 'Saving...' : 'Submit Sales Order'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Recent Orders ({list.length})</h3>
          <div className="space-y-3">
            {list.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{order.code}</p>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    order.status === 'fulfilled'
                      ? 'bg-emerald-100 text-emerald-700'
                      : order.status === 'partial'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{order.customer_name}</p>
                <p className="text-xs text-slate-500">Order Date: {order.order_date}</p>
                <ul className="mt-2 space-y-1">
                  {order.lines?.map((line) => (
                    <li key={line.id} className="text-xs text-slate-600">
                      {line.package?.code} - {line.package?.name} | Ordered {line.package_quantity} | Shipped {line.shipped_quantity ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {list.length === 0 && <p className="text-sm text-slate-500">No sales order yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
