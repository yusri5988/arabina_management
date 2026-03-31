import { Head, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import {
  UsersIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  ClockIcon
} from '@heroicons/react/24/outline/index.js';

export default function Dashboard() {
  const { auth, operationalNotes = [] } = usePage().props;
  const permissions = auth?.user?.module_permissions ?? [];
  const hasModuleAccess = (moduleKey) => permissions.includes(moduleKey);
  const canAccessWarehouse = ['crn', 'mrn', 'srn', 'item_catalog', 'stock_list', 'delivery_order', 'rejected_list', 'create_package']
    .some((moduleKey) => hasModuleAccess(moduleKey));

  return (
    <AuthenticatedLayout title="Dashboard" showWelcome={true}>
      <Head title="Dashboard" />

      <div className="space-y-8">
        {/* Stats Grid Removed */}


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Action 1: Sales Form */}
          {hasModuleAccess('sales_orders') && (
            <Link
              href="/orders"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-cyan-100 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <ClipboardDocumentListIcon className="w-20 h-20 text-cyan-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-4 text-cyan-600 shadow-inner group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                  <ClipboardDocumentListIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Sales Order</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Open sales form and submit customer order.</p>
              </div>
            </Link>
          )}

          {/* Action 2: Procurement Cabin */}
          {hasModuleAccess('procurement') && (
            <Link
              href="/procurement/cabin"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <TruckIcon className="w-20 h-20 text-amber-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  <TruckIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Procurement Cabin</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Manage procurement for Cabin BOM.</p>
              </div>
            </Link>
          )}

          {/* Action 2b: Procurement Hardware */}
          {hasModuleAccess('procurement') && (
            <Link
              href="/procurement/hardware"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <TruckIcon className="w-20 h-20 text-amber-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  <TruckIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Procurement Hardware</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Manage procurement for Hardware BOM.</p>
              </div>
            </Link>
          )}

          {/* Action 2c: Procurement Hardware Site */}
          {hasModuleAccess('procurement') && (
            <Link
              href="/procurement/hardware-site"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <TruckIcon className="w-20 h-20 text-amber-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  <TruckIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Procurement Site</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Manage procurement for Hardware Site BOM.</p>
              </div>
            </Link>
          )}

          {/* Action 3: Warehouse */}
          {canAccessWarehouse && (
            <Link
              href="/warehouse"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-teal-100 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <BuildingStorefrontIcon className="w-20 h-20 text-teal-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4 text-teal-600 shadow-inner group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                  <BuildingStorefrontIcon className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Warehouse</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Open stock in, stock out, and rejected list tools.</p>
              </div>
            </Link>
          )}

          {/* Action 4: User Management (Admin Only) */}
          {hasModuleAccess('admin_users') && (
            <Link
              href="/admin/users"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <UsersIcon className="w-20 h-20 text-purple-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4 text-purple-600 shadow-inner group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                  <UsersIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Manage Users</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Control system access and roles.</p>
              </div>
            </Link>
          )}

          {/* Action 5: Activity Logs (Admin Only) */}
          {hasModuleAccess('admin_logs') && (
            <Link
              href="/admin/logs"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <ClockIcon className="w-20 h-20 text-slate-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-slate-600 shadow-inner group-hover:bg-slate-600 group-hover:text-white transition-colors duration-300">
                  <ClockIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Activity Logs</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">View system transactions and history.</p>
              </div>
            </Link>
          )}

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-100/70">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-800" />
            <h3 className="text-base font-bold tracking-tight text-slate-800">Operational Notes</h3>
          </div>

          <div className="space-y-3">
            {operationalNotes.map((note) => (
              <div
                key={note.message}
                className={`rounded-2xl border-l-4 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700 ${
                  note.tone === 'amber'
                    ? 'border-l-amber-400'
                    : 'border-l-emerald-400'
                }`}
              >
                {note.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
