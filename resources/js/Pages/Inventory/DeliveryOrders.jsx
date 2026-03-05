import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function DeliveryOrders({ orders = [] }) {
  return (
    <AuthenticatedLayout title="Delivery Orders" backUrl="__back__">
      <Head title="Delivery Orders" />

      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Issued Delivery Orders</h2>
          <p className="text-xs text-slate-500 font-medium">List of delivery orders that have been posted.</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">DO Code</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SO / Customer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items Summary</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">DO Dates</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                      No issued delivery order found.
                    </td>
                  </tr>
                )}
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{order.code}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-bold text-slate-800">{order.sales_order_code}</div>
                      <div className="text-slate-500">{order.customer_name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{order.items_summary}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]">{order.do_dates_text || order.created_at}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{order.creator}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/items/stock/out/do/${order.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
