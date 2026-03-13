import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

const initialLine = { type: 'package', package_id: '', package_quantity: '', item_sku: '', item_quantity: '' };

const SearchableSelect = ({ value, onChange, options, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) {
      return options;
    }

    const keyword = search.toLowerCase();

    return options.filter((option) => option.label.toLowerCase().includes(keyword));
  }, [options, search]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setSearch('');
          }
        }}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white text-left transition-all hover:border-slate-300 shadow-sm"
      >
        <span className={selectedOption ? 'font-bold text-slate-700' : 'text-slate-400 font-medium'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-slate-50">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-arabina-accent/20 bg-slate-50"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-xs text-left transition-colors hover:bg-slate-50 flex items-center justify-between ${value === option.value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
                    }`}
                >
                  {option.label}
                  {value === option.value && (
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-xs text-slate-400 italic text-center">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Orders({ packages = [], items = [], orders = [], availability = [], databaseReady = true, canCreate = false }) {
  const [form, setForm] = useState({
    customer_name: '',
    site_id: '',
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
  const adjustLineQuantity = (index, field, delta) => {
    setLines((prev) => prev.map((line, i) => {
      if (i !== index) {
        return line;
      }

      const currentValue = Number(line[field] || 0);
      const nextValue = Math.max(1, currentValue + delta);

      return { ...line, [field]: String(nextValue) };
    }));
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
          site_id: form.site_id || null,
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
        setForm(prev => ({ ...prev, customer_name: '', site_id: '', notes: '' }));
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
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-[#1b580e] to-[#0d2a07] py-6 px-8 text-white relative overflow-hidden">
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-400 opacity-5 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-black mb-1 tracking-tight flex items-center gap-2.5">
                <span className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-emerald-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </span>
                Package Availability
              </h2>
              <p className="text-white/60 text-xs sm:text-sm font-medium">Ready-to-ship sets based on current inventory.</p>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50/30">
            {availability.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-slate-100 p-4 bg-white flex flex-col justify-between group hover:border-[#1b580e]/30 hover:shadow-md transition-all">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{pkg.code}</p>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#1b580e] transition-colors">{pkg.name}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${pkg.available_qty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {pkg.available_qty > 0 ? 'Available' : 'Out'}
                  </span>
                  <span className={`text-xl font-black ${pkg.available_qty < 0 ? 'text-rose-600' : pkg.available_qty > 0 ? 'text-[#1b580e]' : 'text-slate-200'}`}>
                    {pkg.available_qty}
                  </span>
                </div>
              </div>
            ))}
            {availability.length === 0 && <p className="text-sm text-slate-500 italic col-span-full">No packages defined.</p>}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#1b580e]"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Submit Sales Order</h2>
              <div className="h-1 w-12 bg-emerald-500 mt-2 rounded-full"></div>
            </div>
            <Link
              href="/orders/history"
              className="w-full sm:w-auto text-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-[0.98]"
            >
              DELIVERY HISTORY
            </Link>
          </div>
          <div className="border-b border-slate-100 pb-1" />

          {!canCreate && (
            <p className="mt-4 text-sm text-slate-500">
              Akaun ini boleh lihat order sahaja. Hanya role <span className="font-semibold">sales</span> atau <span className="font-semibold">super admin</span> boleh submit.
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Site ID
                </label>
                <input
                  type="text"
                  value={form.site_id}
                  onChange={(e) => setForm(prev => ({ ...prev, site_id: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm bg-slate-50 focus:ring-2 focus:ring-arabina-accent focus:outline-none"
                  placeholder="Contoh: SITE-001"
                  required
                />
                {errors.site_id && <p className="text-xs text-red-500 mt-1">{errors.site_id[0]}</p>}
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
                {lines.map((line, index) => {
                  const packageOptions = packages.map((pkg) => ({
                    value: pkg.id.toString(),
                    label: pkg.name,
                  }));

                  const itemOptions = items.map((item) => ({
                    value: item.sku,
                    label: `${item.sku} - ${item.name}`,
                  }));

                  return (
                    <div key={index} className="bg-slate-50 rounded-xl p-3 border border-slate-100 transition-all hover:border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${line.type === 'package' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {line.type === 'package' ? 'Package' : 'Loose SKU'}
                        </span>
                        <button type="button" onClick={() => removeLine(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-8">
                          {line.type === 'package' ? (
                            <SearchableSelect
                              value={line.package_id}
                              onChange={(value) => updateLine(index, 'package_id', value)}
                              options={packageOptions}
                              placeholder="Select Package..."
                            />
                          ) : (
                            <SearchableSelect
                              value={line.item_sku}
                              onChange={(value) => updateLine(index, 'item_sku', value)}
                              options={itemOptions}
                              placeholder="Select SKU..."
                            />
                          )}
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-arabina-accent">
                            <button
                              type="button"
                              onClick={() => adjustLineQuantity(index, line.type === 'package' ? 'package_quantity' : 'item_quantity', -1)}
                              className="px-3 py-2 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={line.type === 'package' ? line.package_quantity : line.item_quantity}
                              onChange={(e) => updateLine(index, line.type === 'package' ? 'package_quantity' : 'item_quantity', e.target.value)}
                              className="w-full border-x border-slate-200 px-3 py-2 text-sm font-bold text-center bg-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              placeholder="Qty"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => adjustLineQuantity(index, line.type === 'package' ? 'package_quantity' : 'item_quantity', 1)}
                              className="px-3 py-2 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      {errors[`lines.${index}.package_id`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.package_id`][0]}</p>}
                      {errors[`lines.${index}.item_sku`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.item_sku`][0]}</p>}
                      {errors[`lines.${index}.package_quantity`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.package_quantity`][0]}</p>}
                      {errors[`lines.${index}.item_quantity`] && <p className="text-[10px] text-red-500 mt-1">{errors[`lines.${index}.item_quantity`][0]}</p>}
                    </div>
                  );
                })}
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
              className="w-full bg-[#1b580e] text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 hover:bg-emerald-950 transition-all shadow-lg shadow-emerald-900/10"
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
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest rounded-tl-2xl">Order Code</th>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer & Site</th>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registered By</th>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Details</th>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 bg-slate-50 border-y border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest rounded-tr-2xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((order) => (
                  <tr key={order.id} className="group hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-5 align-top">
                      <p className="text-sm font-black text-slate-900 tracking-tight">{order.code}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{order.order_date}</p>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <p className="text-sm font-black text-emerald-800">{order.customer_name}</p>
                      {order.site_id && (
                        <div className="flex items-center gap-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-400">
                            <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a17.405 17.405 0 0 0 1.457-.735 25.03 25.03 0 0 0 3.492-2.317c2.307-1.792 4.717-4.122 4.717-8.123 0-4.418-3.582-8-8-8s-8 3.582-8 8c0 4.001 2.41 6.331 4.717 8.123a25.03 25.03 0 0 0 3.492 2.317c.457.26.909.502 1.334.711.043.022.083.041.12.059l.03.014.007.003ZM10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px] text-slate-500 font-black uppercase">{order.site_id}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 uppercase">
                          {order.creator?.name?.charAt(0) || '?'}
                        </div>
                        <p className="text-xs font-bold text-slate-600">{order.creator?.name || 'Unknown'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="space-y-1.5">
                        {order.lines?.map((line) => (
                          <div key={line.id} className="flex items-center gap-2 text-[11px]">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${line.package_id ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                            <span className="font-black text-slate-700 tracking-tight">
                              {line.package_id ? line.package?.code : line.item_sku}
                            </span>
                            <span className="text-slate-400 font-medium">
                              x{line.package_id ? line.package_quantity : line.item_quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className={`inline-flex text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${order.status === 'fulfilled'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : order.status === 'partial'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {order.status === 'fulfilled' ? 'Shipped' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <a
                        href={`/orders/${order.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:border-rose-200 hover:bg-rose-50 active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                        </svg>
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="text-sm text-slate-500 italic p-8 text-center bg-slate-50 rounded-2xl mt-4">No sales order recorded yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
