import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function StockList({ items = [], packages = [] }) {
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const units = useMemo(() => {
    const unitSet = new Set(['all']);
    items.forEach((item) => unitSet.add(item.unit));
    return Array.from(unitSet);
  }, [items]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let result = items.filter((item) => {
      const matchKeyword = keyword === ''
        || item.sku?.toLowerCase().includes(keyword)
        || item.name?.toLowerCase().includes(keyword);

      const matchUnit = unitFilter === 'all' || item.unit === unitFilter;

      return matchKeyword && matchUnit;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [items, search, unitFilter, sortConfig]);

  return (
    <AuthenticatedLayout title="SKU Inventory" backUrl="__back__">
      <Head title="SKU Inventory" />

      <div className="space-y-8">

        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Inventory Overview</h2>
            <p className="text-xs text-slate-500 font-medium">Download or filter your current stock levels.</p>
          </div>
          <a
            href="/items/stocks/pdf"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-8 py-4 text-sm font-black text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95 uppercase tracking-wider"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
            </svg>
            Generate List PDF
          </a>
          <a
            href="/items/stocks/audit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 uppercase tracking-wider"
          >
            Stock Audit
          </a>
        </div>

        {/* Package Availability Section */}
        {packages && packages.length > 0 && (
          <div className="space-y-4">
            <div className="px-2">
              <h3 className="text-sm font-bold text-slate-800">Package Availability</h3>
              <p className="text-xs text-slate-500">Calculated based on current SKU stock levels.</p>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Package Code</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</th>

                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Sets</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {packages.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-10 text-center text-sm text-slate-500">
                          No packages defined yet.
                        </td>
                      </tr>
                    ) : packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{pkg.code}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {pkg.name}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-black ${pkg.available_qty > 0 ? 'text-arabina-green' : 'text-red-500'}`}>
                            {pkg.available_qty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SKU Inventory Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">SKU Inventory ({filteredInventory.length})</h3>
              <p className="text-xs text-slate-500">SKU Inventory</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU..."
                className="w-full sm:w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
              />
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full sm:w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>{unit === 'all' ? 'All Units' : unit.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th
                      className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Item Name
                        <span className="flex flex-col text-[8px] leading-none text-slate-300">
                          <span className={sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'text-slate-900' : ''}>▲</span>
                          <span className={sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 'text-slate-900' : ''}>▼</span>
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Length (m)</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Stock</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Update</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {filteredInventory.map((item) => {
                    const totalStock = (item.variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_current ?? 0), 0);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.length_m ? Number(item.length_m).toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 uppercase">{item.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-black ${totalStock > 0 ? 'text-arabina-green' : 'text-red-500'}`}>
                            {totalStock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(item.updated_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}

                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                        No items match current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
