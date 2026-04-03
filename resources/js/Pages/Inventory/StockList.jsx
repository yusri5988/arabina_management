import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const BOM_SECTIONS = [
  { key: 'cabin', label: 'BOM Cabin' },
  { key: 'hardware', label: 'BOM Hardware' },
  { key: 'hardware_site', label: 'BOM Hardware Site' },
];

export default function StockList({ items = [], packages = [] }) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedScopes, setSelectedScopes] = useState(['cabin', 'hardware', 'hardware_site']);

  const toggleScope = (scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const packageAvailability = useMemo(() => {
    return packages.map((pkg) => {
      // Only filter items that match selected scopes
      const relevantItems = pkg.items.filter((item) => selectedScopes.includes(item.bom_scope));

      if (relevantItems.length === 0) {
        return { ...pkg, available_qty: 0, is_filtered: true };
      }

      let maxPossible = null;
      relevantItems.forEach((item) => {
        const possible = Math.floor(item.current_stock / item.required_qty);
        if (maxPossible === null || possible < maxPossible) {
          maxPossible = possible;
        }
      });

      return {
        ...pkg,
        available_qty: maxPossible ?? 0,
        is_filtered: false,
      };
    }).filter((pkg) => pkg.available_qty > 0);
  }, [packages, selectedScopes]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortValue = (item, key) => {
    switch (key) {
      case 'total_stock':
        return Number((item.variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_current ?? 0), 0));
      case 'length_m':
        return Number(item.length_m ?? -1);
      case 'updated_at':
        return new Date(item.updated_at).getTime();
      default:
        return (item[key] ?? '').toString().toLowerCase();
    }
  };

  const sortArrowClass = (key, direction) => (
    sortConfig.key === key && sortConfig.direction === direction ? 'text-slate-900' : ''
  );

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let result = items.filter((item) => {
      const matchKeyword = keyword === ''
        || item.sku?.toLowerCase().includes(keyword)
        || item.name?.toLowerCase().includes(keyword);
      return matchKeyword;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = getSortValue(a, sortConfig.key);
        const bValue = getSortValue(b, sortConfig.key);

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
  }, [items, search, sortConfig]);

  const inventoryByBom = useMemo(() => {
    return BOM_SECTIONS.map((section) => ({
      ...section,
      rows: filteredInventory.filter((item) => String(item.bom_scope ?? 'hardware') === section.key),
    }));
  }, [filteredInventory]);

  return (
    <AuthenticatedLayout title="SKU Inventory" backUrl="__back__">
      <Head title="SKU Inventory" />

      <div className="space-y-8">

        {/* Top Action Bar */}
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-5 sm:p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-rose-200/30 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-emerald-200/30 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stock Center</p>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventory Overview</h2>
              <p className="text-xs text-slate-600 font-semibold">Download the latest stock list or proceed directly to a stock audit.</p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <a
                href="/items/stocks/pdf"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-rose-200/80 transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:translate-y-0 active:scale-[0.99] uppercase tracking-wider"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.6} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                </svg>
                Generate List PDF
              </a>
              <a
                href="/items/stocks/audit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200/80 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 active:scale-[0.99] uppercase tracking-wider"
              >
                Stock Audit
              </a>
            </div>
          </div>
        </div>

        {/* Package Availability Section */}
        {packages && packages.length > 0 && (
          <div className="space-y-4">
            <div className="px-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Package Availability</h3>
                <p className="text-xs text-slate-500">Recalculate "Available Sets" by selecting BOM categories below.</p>
              </div>

              {/* BOM Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {BOM_SECTIONS.map((section) => (
                  <label key={section.key} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggleScope(section.key)}
                      className={`
                        w-5 h-5 rounded border transition-all flex items-center justify-center
                        ${selectedScopes.includes(section.key)
                          ? 'bg-amber-600 border-amber-600 shadow-sm shadow-amber-200'
                          : 'bg-white border-slate-300 group-hover:border-amber-400'}
                      `}
                    >
                      {selectedScopes.includes(section.key) && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-bold transition-colors ${selectedScopes.includes(section.key) ? 'text-slate-900' : 'text-slate-500'}`}>
                      {section.label.replace('BOM ', '')}
                    </span>
                  </label>
                ))}
              </div>
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
                    {packageAvailability.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-10 text-center text-sm text-slate-500">
                          No packages defined yet.
                        </td>
                      </tr>
                    ) : packageAvailability.map((pkg) => (
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
                className="w-full sm:w-80 lg:w-96 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-5">
            {inventoryByBom.map((section) => (
              <div key={section.key} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{section.label}</h4>
                  <span className="text-xs font-bold text-slate-500">{section.rows.length} SKU</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('sku')}>
                          <div className="flex items-center gap-1">SKU
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('sku', 'asc')}>▲</span><span className={sortArrowClass('sku', 'desc')}>▼</span></span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('name')}>
                          <div className="flex items-center gap-1">Item Name
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('name', 'asc')}>▲</span><span className={sortArrowClass('name', 'desc')}>▼</span></span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('length_m')}>
                          <div className="flex items-center gap-1">Length (m)
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('length_m', 'asc')}>▲</span><span className={sortArrowClass('length_m', 'desc')}>▼</span></span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('unit')}>
                          <div className="flex items-center gap-1">Unit
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('unit', 'asc')}>▲</span><span className={sortArrowClass('unit', 'desc')}>▼</span></span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('total_stock')}>
                          <div className="flex items-center justify-end gap-1">Total Stock
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('total_stock', 'asc')}>▲</span><span className={sortArrowClass('total_stock', 'desc')}>▼</span></span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('updated_at')}>
                          <div className="flex items-center gap-1">Last Update
                            <span className="flex flex-col text-[8px] leading-none text-slate-300"><span className={sortArrowClass('updated_at', 'asc')}>▲</span><span className={sortArrowClass('updated_at', 'desc')}>▼</span></span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {section.rows.map((item) => {
                        const totalStock = (item.variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_current ?? 0), 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.sku}</td>
                            <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{item.length_m ? Number(item.length_m).toFixed(2) : '-'}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 uppercase">{item.unit}</td>
                            <td className="px-4 py-3 text-right"><span className={`text-sm font-black ${totalStock > 0 ? 'text-arabina-green' : 'text-red-500'}`}>{totalStock}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-500">{new Date(item.updated_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                      {section.rows.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">No SKU in {section.label.toLowerCase()}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {filteredInventory.length === 0 && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 px-4 py-10 text-center text-sm text-slate-500">
                No items match current filter.
              </div>
            )}
          </div>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
