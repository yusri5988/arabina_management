import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function RejectionIndex({ linesByOrder = [], canView = false }) {
  return (
    <AuthenticatedLayout title="Rejected List" backUrl="__back__">
      <Head title="Rejected List" />

      <div className="space-y-6">
        {!canView && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This account has no permission to view rejected list.
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Rejected by Procurement Order</h2>

          <div className="mt-5 space-y-4">
            {linesByOrder.map((order, idx) => (
              <div key={`${order.source}-${order.id}-${idx}`} className="rounded-2xl border border-slate-200 p-4 bg-slate-50 shadow-sm border-l-4 border-l-rose-500">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">{order.source}</span>
                    <p className="text-sm font-bold text-slate-800 tracking-tight">{order.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      Rejected
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">{order.created_at}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <div className="col-span-7 text-xs text-slate-700">
                        {line.sku} - {line.name}
                      </div>
                      <div className="col-span-2 text-xs text-slate-500 text-right">Ord {line.ordered_quantity}</div>
                      <div className="col-span-2 text-xs text-slate-500 text-right">Rec {line.received_quantity}</div>
                      <div className="col-span-1 text-xs font-bold text-red-600 text-right">{line.rejected_quantity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {linesByOrder.length === 0 && (
              <p className="text-sm text-slate-500">No rejected records yet.</p>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
