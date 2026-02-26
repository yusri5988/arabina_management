import { Head, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { 
  UsersIcon, 
  TruckIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline/index.js';

export default function Dashboard() {
  const { auth } = usePage().props;

  return (
    <AuthenticatedLayout title="Dashboard" showWelcome={true}>
      <Head title="Dashboard" />
      
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Action 1: Warehouse */}
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

          {/* Action 2: Sales Form */}
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

          {/* Action 3: User Management (Admin Only) */}
          {auth?.user?.role === 'super_admin' && (
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

          {(auth?.user?.role === 'procurement' || auth?.user?.role === 'store_keeper' || auth?.user?.role === 'super_admin') && (
            <Link
              href="/procurement"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <TruckIcon className="w-20 h-20 text-amber-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  <TruckIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Procurement</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Auto suggest shortage and receive supplier stock.</p>
              </div>
            </Link>
          )}

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
