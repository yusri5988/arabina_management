import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const BOM_SCOPES = {
  cabin: 'Cabin',
  hardware: 'Hardware',
  hardware_site: 'Hardware Site',
};

export default function StockValue({ stockData = [], totalValueAll = 0, suppliers = [], bomScopes = {}, filters = {} }) {
  const [search, setSearch] = useState(filters.search || '');
  const [bomScope, setBomScope] = useState(filters.bom_scope || '');
  const [supplierId, setSupplierId] = useState(filters.supplier_id || '');

  const filteredData = useMemo(() => {
    return stockData.filter((item) => {
      if (bomScope && item.bom_scope !== bomScope) return false;
      if (search && !item.sku.toLowerCase().includes(search.toLowerCase()) && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [stockData, bomScope, search]);

  const filteredTotal = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.total_value, 0);
  }, [filteredData]);

  const queryParams = new URLSearchParams();
  if (bomScope) queryParams.set('bom_scope', bomScope);
  if (supplierId) queryParams.set('supplier_id', supplierId);
  if (search) queryParams.set('search', search);
  const qs = queryParams.toString();

  return (
    <AuthenticatedLayout>
      <Head title="Stock Value" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Stock Value</h1>
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
            <select
              value={bomScope}
              onChange={(e) => setBomScope(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">All Categories</option>
              {Object.entries(bomScopes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Item Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Avg Cost (MYR)</th>
                  <th className="px-4 py-3 text-right">Total Value (MYR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 text-sm">No items with stock value found.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{item.sku}</td>
                      <td className="px-4 py-3 text-slate-600">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          {BOM_SCOPES[item.bom_scope] || item.bom_scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{item.current_stock}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.average_cost > 0 ? item.average_cost.toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{item.total_value > 0 ? item.total_value.toFixed(2) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-bold text-slate-800">
                  <td colSpan="6" className="px-4 py-4 text-right">TOTAL</td>
                  <td className="px-4 py-4 text-right">{filteredTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
