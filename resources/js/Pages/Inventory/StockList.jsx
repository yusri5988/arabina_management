import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function StockList({ items = [] }) {
  const [inventory] = useState(items);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchKeyword = keyword === ''
        || item.sku?.toLowerCase().includes(keyword)
        || item.name?.toLowerCase().includes(keyword);

      const matchUnit = unitFilter === 'all' || item.unit === unitFilter;

      return matchKeyword && matchUnit;
    });
  }, [inventory, search, unitFilter]);

  return (
    <AuthenticatedLayout title="Inventory Stock List" backUrl="__back__">
      <Head title="Inventory Stock List" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
          <h3 className="text-sm font-bold text-slate-800">Current Inventory ({filteredInventory.length})</h3>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or item name"
              className="w-full sm:w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
            />
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full sm:w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
            >
              <option value="all">All Unit</option>
              <option value="pcs">pcs</option>
              <option value="set">set</option>
              <option value="roll">roll</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
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
    </AuthenticatedLayout>
  );
}
