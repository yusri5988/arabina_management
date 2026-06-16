import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const BOM_GROUPS = [
  { key: 'cabin', label: 'BOM Cabin' },
  { key: 'hardware', label: 'BOM Hardware' },
  { key: 'hardware_site', label: 'BOM Hardware Site' },
];

const BOM_STYLES = {
  cabin: {
    header: 'bg-amber-50 border-amber-200 text-amber-800',
    badge: 'bg-amber-200 text-amber-800',
    subtotal: 'bg-amber-50 text-amber-900',
  },
  hardware: {
    header: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badge: 'bg-emerald-200 text-emerald-800',
    subtotal: 'bg-emerald-50 text-emerald-900',
  },
  hardware_site: {
    header: 'bg-sky-50 border-sky-200 text-sky-800',
    badge: 'bg-sky-200 text-sky-800',
    subtotal: 'bg-sky-50 text-sky-900',
  },
};

export default function StockValue({ stockData = [], totalValueAll = 0, suppliers = [], filters = {} }) {
  const [search, setSearch] = useState(filters.search || '');

  const filteredData = useMemo(() => {
    if (!search) return stockData;
    const s = search.toLowerCase();
    return stockData.filter(
      (item) => item.sku.toLowerCase().includes(s) || item.name.toLowerCase().includes(s),
    );
  }, [stockData, search]);

  const groupedData = useMemo(() => {
    return BOM_GROUPS.map((group) => {
      const items = filteredData.filter((item) => (item.bom_scope || 'hardware') === group.key);
      const subtotal = items.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
      const totalStock = items.reduce((sum, item) => sum + (Number(item.current_stock) || 0), 0);
      return { ...group, items, subtotal, totalStock };
    });
  }, [filteredData]);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  const qs = queryParams.toString();

  return (
    <AuthenticatedLayout>
      <Head title="Stock Value" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Stock Value</h1>
            <p className="text-xs text-slate-500 mt-1">Stock value breakdown by Bill of Materials (BOM) category</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/finance/stock-value/export?${qs}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-arabina-accent hover:bg-emerald-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </a>
            <a
              href={`/finance/stock-value/pdf?${qs}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              PDF
            </a>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            />
            <div className="ml-auto text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</div>
              <div className="text-xl font-bold text-arabina-accent">
                MYR {Number(totalValueAll).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {groupedData.map((group) => {
            const style = BOM_STYLES[group.key] || BOM_STYLES.hardware;
            return (
              <div key={group.key} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className={`px-6 py-4 border-b ${style.header} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold uppercase tracking-wider">{group.label}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${style.badge}`}>
                      {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Subtotal</div>
                    <div className="text-base font-bold">
                      MYR {group.subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                        <th className="px-4 py-3 text-left">SKU</th>
                        <th className="px-4 py-3 text-left">Item Name</th>
                        <th className="px-4 py-3 text-right">Unit</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Avg Cost (MYR)</th>
                        <th className="px-4 py-3 text-right">Total Value (MYR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-sm italic">
                            No items in this BOM category.
                          </td>
                        </tr>
                      ) : (
                        group.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800">{item.sku}</td>
                            <td className="px-4 py-3 text-slate-600">{item.name}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{item.unit}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              {Number(item.current_stock).toLocaleString('en-MY', { maximumFractionDigits: 1 })}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {item.average_cost > 0
                                ? Number(item.average_cost).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              {item.total_value > 0
                                ? Number(item.total_value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {group.items.length > 0 && (
                      <tfoot>
                        <tr className={`${style.subtotal} font-bold`}>
                          <td colSpan="5" className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                            {group.label} Subtotal
                          </td>
                          <td className="px-4 py-3 text-right">
                            {group.subtotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            );
          })}

          {filteredData.length === 0 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-12 text-center text-slate-400 text-sm">
              No items with stock value found.
            </div>
          )}

          {filteredData.length > 0 && (
            <div className="bg-arabina-accent rounded-[2rem] shadow-sm px-6 py-5 flex items-center justify-between text-white">
              <div className="text-sm font-bold uppercase tracking-wider">Grand Total (All BOM)</div>
              <div className="text-2xl font-bold">
                MYR{' '}
                {groupedData
                  .reduce((sum, g) => sum + g.subtotal, 0)
                  .toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
