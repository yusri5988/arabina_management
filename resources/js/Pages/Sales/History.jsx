import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function History({ orders = [] }) {
  return (
    <AuthenticatedLayout title="Delivery History" backUrl="__back__">
      <Head title="Delivery History" />

      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Delivered Orders ({orders.length})</h2>

          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{order.code}</p>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Shipped
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{order.customer_name}</p>
                <p className="text-xs text-slate-500">Order Date: {order.order_date}</p>
                <p className="text-xs text-slate-500">Last Delivery: {order.last_delivery_at ? new Date(order.last_delivery_at).toLocaleString() : '-'}</p>

                <ul className="mt-2 space-y-1">
                  {order.lines?.map((line) => (
                    <li key={line.id} className="text-xs text-slate-600">
                      {line.package?.code} - {line.package?.name} | Ordered {line.package_quantity} | Shipped {line.shipped_quantity ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {orders.length === 0 && <p className="text-sm text-slate-500">No delivered order history yet.</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
