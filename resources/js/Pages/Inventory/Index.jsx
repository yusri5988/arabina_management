import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({ items }) {
  const [inventory, setInventory] = useState(items ?? []);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  const [data, setData] = useState({
    sku: '',
    name: '',
    length_m: '',
    unit: 'pcs'
  });

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    try {
      const response = await fetch('/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (response.status === 201) {
        setInventory(prev => [payload.data, ...prev]);
        setData({
          sku: '',
          name: '',
          length_m: '',
          unit: 'pcs'
        });
        setNotification({ type: 'success', message: 'Item registered successfully.' });
      } else if (response.status === 422) {
        setErrors(payload.errors);
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="Inventory Stock" backUrl="__back__">
      <Head title="Inventory" />

      <div className="space-y-6">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Register New Item</h2>
          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">SKU (Unique)</label>
                <input
                  type="text"
                  value={data.sku}
                  onChange={e => setData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Item Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={data.length_m}
                  onChange={e => setData(prev => ({ ...prev, length_m: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1 ml-1">Leave blank if not applicable.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Unit</label>
                <select
                  value={data.unit}
                  onChange={e => setData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                >
                  <option value="pcs">pcs</option>
                  <option value="set">set</option>
                  <option value="roll">roll</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#1E3D1A] text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
            >
              {processing ? 'Registering...' : 'Register Item'}
            </button>

            <Link
              href="/items/stocks"
              className="block w-full text-center bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Open Inventory Stock List
            </Link>

            <Link
              href="/items/stock/in"
              className="block w-full text-center bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition-colors"
            >
              Update Stock by SKU
            </Link>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
