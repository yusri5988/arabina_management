import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const initialAlacarteLine = { item_id: '', quantity: '' };

export default function Stock({ items, packages, salesOrders = [], type = 'in' }) {
  const initialType = type === 'out' ? 'out' : 'in';
  const isOut = initialType === 'out';

  const [mode, setMode] = useState('package');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [packageData, setPackageData] = useState({
    package_id: packages?.[0]?.id?.toString() ?? '',
    package_quantity: '',
    sales_order_id: salesOrders?.[0]?.id?.toString() ?? '',
    notes: '',
  });
  const [alacarteLines, setAlacarteLines] = useState([
    { ...initialAlacarteLine, item_id: items?.[0]?.id?.toString() ?? '' },
  ]);
  const noPackages = (packages?.length ?? 0) === 0;
  const noItems = (items?.length ?? 0) === 0;

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const addLine = () => {
    setAlacarteLines(prev => [...prev, { ...initialAlacarteLine }]);
  };

  const removeLine = (index) => {
    setAlacarteLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    setAlacarteLines(prev => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    const endpoint = isOut ? '/items/stock/out' : '/items/stock/in';
    const payload = isOut
      ? mode === 'package'
        ? {
            mode: 'package',
            package_id: Number(packageData.package_id),
            package_quantity: Number(packageData.package_quantity),
            sales_order_id: Number(packageData.sales_order_id),
            notes: packageData.notes || null,
          }
        : {
            mode: 'alacarte',
            lines: alacarteLines.map(line => ({
              item_id: Number(line.item_id),
              quantity: Number(line.quantity),
            })),
            sales_order_id: Number(packageData.sales_order_id),
            notes: packageData.notes || null,
          }
      : mode === 'package'
        ? {
            mode: 'package',
            package_id: Number(packageData.package_id),
            package_quantity: Number(packageData.package_quantity),
            notes: packageData.notes || null,
          }
        : {
            mode: 'alacarte',
            lines: alacarteLines.map(line => ({
              item_id: Number(line.item_id),
              quantity: Number(line.quantity),
            })),
            notes: packageData.notes || null,
          };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setNotification({ type: 'success', message: result.message ?? 'Transaction saved.' });
        setPackageData(prev => ({ ...prev, package_quantity: '', notes: '' }));
        setAlacarteLines([{ ...initialAlacarteLine, item_id: items?.[0]?.id?.toString() ?? '' }]);
      } else if (response.status === 422) {
        setErrors(result.errors ?? {});
      } else {
        setNotification({ type: 'error', message: result.message ?? 'Something went wrong.' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title={isOut ? 'Stock Out' : 'Stock In'} backUrl="/dashboard">
      <Head title={isOut ? 'Stock Out' : 'Stock In'} />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/items/stock?type=in"
            className={`text-center py-3 rounded-2xl border text-sm font-bold ${!isOut ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            Stock In
          </Link>
          <Link
            href="/items/stock?type=out"
            className={`text-center py-3 rounded-2xl border text-sm font-bold ${isOut ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            Stock Out
          </Link>
        </div>

        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">
            {isOut ? 'Stock Out by Package / Ala Carte + Customer Tag' : 'Stock In by Package / Ala Carte'}
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('package')}
                className={`py-2.5 rounded-xl text-sm font-bold border ${mode === 'package' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                Package
              </button>
              <button
                type="button"
                onClick={() => setMode('alacarte')}
                className={`py-2.5 rounded-xl text-sm font-bold border ${mode === 'alacarte' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                Ala Carte SKU
              </button>
            </div>

            {isOut && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Sales Order</label>
                  <select
                    value={packageData.sales_order_id}
                    onChange={e => setPackageData(prev => ({ ...prev, sales_order_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  >
                    {salesOrders.length === 0 && <option value="">No open sales order</option>}
                    {salesOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.code} - {order.customer_name} ({order.order_date})
                      </option>
                    ))}
                  </select>
                  {errors.sales_order_id && <p className="text-xs text-red-500 mt-1">{errors.sales_order_id[0]}</p>}
                  {salesOrders.length === 0 && <p className="text-xs text-amber-600 mt-1">Create sales order first before stock out.</p>}
                </div>
              </div>
            )}

            {mode === 'package' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package</label>
                  <select
                    value={packageData.package_id}
                    onChange={e => setPackageData(prev => ({ ...prev, package_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  >
                    {packages.length === 0 && <option value="">No package available</option>}
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.code} - {pkg.name}
                      </option>
                    ))}
                  </select>
                  {errors.package_id && <p className="text-xs text-red-500 mt-1">{errors.package_id[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={packageData.package_quantity}
                    onChange={e => setPackageData(prev => ({ ...prev, package_quantity: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base font-bold text-right focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  />
                  {errors.package_quantity && <p className="text-xs text-red-500 mt-1">{errors.package_quantity[0]}</p>}
                </div>
              </>
            )}

            {mode === 'alacarte' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">SKU Lines</h3>
                  <button type="button" onClick={addLine} className="text-xs font-bold uppercase tracking-wider text-arabina-accent">
                    Add SKU
                  </button>
                </div>

                {alacarteLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="col-span-8">
                      <select
                        value={line.item_id}
                        onChange={e => updateLine(index, 'item_id', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                        required
                      >
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
                      {alacarteLines.length > 1 && (
                        <button type="button" onClick={() => removeLine(index)} className="text-red-500 text-xs font-bold">
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(errors.lines || errors['lines.0.item_id'] || errors['lines.0.quantity']) && (
                  <p className="text-xs text-red-500">{errors.lines?.[0] ?? errors['lines.0.item_id']?.[0] ?? errors['lines.0.quantity']?.[0]}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Notes (Optional)</label>
              <textarea
                rows={3}
                value={packageData.notes}
                onChange={e => setPackageData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={
                processing
                || (mode === 'package' && noPackages)
                || (mode === 'alacarte' && noItems)
                || (isOut && (salesOrders?.length ?? 0) === 0)
              }
              className={`w-full text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md ${isOut ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1E3D1A] hover:bg-emerald-950'}`}
            >
              {processing ? 'Saving...' : (isOut ? 'Submit Stock Out' : 'Submit Stock In')}
            </button>

            <Link
              href="/items"
              className="block w-full text-center bg-slate-100 border border-slate-200 text-slate-700 py-3 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              Back to Register Item
            </Link>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
