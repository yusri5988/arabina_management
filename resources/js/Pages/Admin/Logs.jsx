import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Logs({ logs }) {
  const getActionBadge = (action) => {
    const badges = {
      sales_order_created: 'bg-cyan-100 text-cyan-700',
      stock_in: 'bg-emerald-100 text-emerald-700',
      stock_out: 'bg-rose-100 text-rose-700',
      procurement_order_created: 'bg-amber-100 text-amber-700',
      procurement_order_received: 'bg-indigo-100 text-indigo-700',
      procurement_order_submitted: 'bg-blue-100 text-blue-700',
      crn_po_received: 'bg-teal-100 text-teal-700',
      crn_po_safe_receive: 'bg-sky-100 text-sky-700',
      crn_created: 'bg-violet-100 text-violet-700',
      crn_transferred: 'bg-fuchsia-100 text-fuchsia-700',
      item_created: 'bg-slate-100 text-slate-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badges[action] || 'bg-slate-100 text-slate-600'}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <AuthenticatedLayout title="System Activity Logs">
      <Head title="Activity Logs" />

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Form PDF</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.data.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {log.user?.name?.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{log.user?.name ?? 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/admin/logs/${log.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700"
                    >
                      Download PDF
                    </a>
                  </td>

                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {logs.data.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.links && logs.links.length > 3 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-1">
            {logs.links.map((link, i) => (
              <Link
                key={i}
                href={link.url || '#'}
                dangerouslySetInnerHTML={{ __html: link.label }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${link.active
                    ? 'bg-[#1E3D1A] text-white shadow-md'
                    : link.url
                      ? 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
