import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function RejectionIndex({ linesByOrder = [], canView = false }) {
  const [search, setSearch] = useState('');

  const keyword = search.trim().toLowerCase();

  const filteredLinesByOrder = useMemo(
    () =>
      linesByOrder
        .map((order) => ({
          ...order,
          lines: (order.lines ?? []).filter((line) => {
            if (!keyword) return true;

            return (
              String(line.sku ?? '').toLowerCase().includes(keyword) ||
              String(line.name ?? '').toLowerCase().includes(keyword) ||
              String(order.code ?? '').toLowerCase().includes(keyword)
            );
          }),
        }))
        .filter((order) => order.lines.length > 0),
    [linesByOrder, keyword]
  );

  const totalRejected = useMemo(
    () =>
      linesByOrder.reduce(
        (sum, order) =>
          sum +
          (order.lines ?? []).reduce(
            (lineSum, line) => lineSum + Number(line.rejected_quantity || 0),
            0
          ),
        0
      ),
    [linesByOrder]
  );

  return (
    <AuthenticatedLayout title="Rejected List" backUrl="__back__">
      <Head title="Rejected List" />

      <div className="space-y-6">
        {!canView && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This account has no permission to view rejected list.
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-4 flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Rejected Records (Total: {totalRejected})
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, name, or order code..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 md:w-64"
            />
          </div>

          <div className="mt-5 space-y-4">
            {filteredLinesByOrder.map((order, idx) => (
              <div
                key={`${order.source}-${order.id}-${idx}`}
                className="rounded-2xl border border-l-4 border-l-rose-500 border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {order.source}
                    </span>
                    <p className="text-sm font-bold tracking-tight text-slate-800">{order.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700">
                      Rejected
                    </span>
                    <p className="mt-1 text-[9px] font-medium text-slate-400">{order.created_at}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-white">
                      <tr>
                        <th className="w-8 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">SKU</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Item</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Ord</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Rec</th>
                        <th className="w-12 px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Rejected</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {order.lines.map((line) => (
                        <tr key={line.id} className="bg-white/70">
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-700">{line.sku || '-'}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{line.name || '-'}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-600">{line.ordered_quantity}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-600">{line.received_quantity}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-rose-600">{line.rejected_quantity}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-xs text-rose-600">{line.rejection_reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {filteredLinesByOrder.length === 0 && (
              <p className="text-sm text-slate-500">
                {keyword ? `No results for "${keyword}"` : 'No rejected records yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
