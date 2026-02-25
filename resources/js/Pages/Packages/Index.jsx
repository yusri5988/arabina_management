import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const initialForm = {
  code: '',
  name: '',
  is_active: true,
  lines: [{ item_id: '', quantity: '' }],
};

export default function Index({ items, packages, schemaReady = true }) {
  const [data, setData] = useState(initialForm);
  const [list, setList] = useState(packages ?? []);
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const addLine = () => {
    setData(prev => ({
      ...prev,
      lines: [...prev.lines, { item_id: '', quantity: '' }],
    }));
  };

  const removeLine = (index) => {
    setData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index, field, value) => {
    setData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  };

  const resetForm = () => {
    setData(initialForm);
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    try {
      const response = await fetch('/packages', {
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
        setList(prev => [payload.data, ...prev]);
        setNotification({ type: 'success', message: payload.message ?? 'Package created successfully.' });
        resetForm();
      } else if (response.status === 422) {
        setErrors(payload.errors ?? {});
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Something went wrong.' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const deletePackage = async (pkg) => {
    const confirmed = window.confirm(`Delete package ${pkg.code}?`);
    if (!confirmed) return;

    setDeletingId(pkg.id);
    setNotification(null);

    try {
      const response = await fetch(`/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setList(prev => prev.filter(item => item.id !== pkg.id));
        setNotification({ type: 'success', message: payload.message ?? 'Package deleted successfully.' });
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to delete package.' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AuthenticatedLayout title="Package Setup" backUrl="/dashboard">
      <Head title="Package Setup" />

      <div className="space-y-6">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        {!schemaReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Database for package module belum siap. Jalankan <code className="font-bold">php artisan migrate</code> kemudian refresh semula.
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Create Package by SKU</h2>

          <form onSubmit={submit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Code</label>
                <input
                  type="text"
                  value={data.code}
                  onChange={e => setData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Package Lines</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs font-bold uppercase tracking-wider text-arabina-accent"
                >
                  Add SKU
                </button>
              </div>

              {data.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div className="col-span-8">
                    <select
                      value={line.item_id}
                      onChange={e => updateLine(index, 'item_id', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                      required
                    >
                      <option value="">Select SKU</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={e => updateLine(index, 'quantity', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-right focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {data.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-500 text-xs font-bold"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {errors.lines && <p className="text-xs text-red-500">{errors.lines[0]}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={data.is_active}
                onChange={e => setData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-slate-300 text-arabina-accent focus:ring-arabina-accent"
              />
              Active package
            </label>

            <button
              type="submit"
              disabled={processing || !schemaReady}
              className="w-full bg-[#1E3D1A] text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
            >
              {processing ? 'Saving...' : 'Save Package'}
            </button>
          </form>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">Package List ({list.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map(pkg => (
              <div key={pkg.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{pkg.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{pkg.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${pkg.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePackage(pkg)}
                      disabled={deletingId === pkg.id}
                      className="text-[10px] font-bold text-red-600 uppercase tracking-wider px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === pkg.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {pkg.package_items?.map(line => (
                    <div key={line.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <span className="font-semibold text-slate-700">
                        {line.item?.sku} - {line.item?.name}
                      </span>
                      <span className="font-black text-slate-900">x{line.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
