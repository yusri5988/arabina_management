import { Head, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { 
  UsersIcon, 
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CubeIcon,
  TruckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline/index.js';

export default function Dashboard() {
  const { auth } = usePage().props;

  return (
    <AuthenticatedLayout title="Dashboard" showWelcome={true}>
      <Head title="Dashboard" />
      
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Action 1: Stock In */}
          <Link 
            href="/items/stock?type=in"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <ArrowDownTrayIcon className="w-20 h-20 text-emerald-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 text-emerald-600 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <ArrowDownTrayIcon className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Stock In (+)</h4>
              <p className="text-slate-500 text-sm font-medium leading-snug">Add incoming stock to inventory.</p>
            </div>
          </Link>

          {/* Action 2: Stock Out */}
          <Link 
            href="/items/stock?type=out"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-red-100 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <ArrowUpTrayIcon className="w-20 h-20 text-red-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600 shadow-inner group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                <ArrowUpTrayIcon className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Stock Out (-)</h4>
              <p className="text-slate-500 text-sm font-medium leading-snug">Reduce stock for dispatched items.</p>
            </div>
          </Link>

          {/* Action 3: Register Item */}
          <Link 
            href="/items"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-blue-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <ArchiveBoxIcon className="w-20 h-20 text-blue-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <ArchiveBoxIcon className="w-6 h-6" strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Item Catalog</h4>
              <p className="text-slate-500 text-sm font-medium leading-snug">Manage products and variants.</p>
            </div>
          </Link>

          {/* Action 4: User Management (Admin Only) */}
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

          {/* Action 5: Package Setup (Super Admin Only) */}
          {auth?.user?.role === 'super_admin' && (
            <Link
              href="/packages"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <CubeIcon className="w-20 h-20 text-indigo-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <CubeIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Create Package</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Define package with SKU and quantity.</p>
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

          {(auth?.user?.role === 'procurement' || auth?.user?.role === 'store_keeper' || auth?.user?.role === 'super_admin') && (
            <Link
              href="/rejections"
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-rose-100 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <ExclamationTriangleIcon className="w-20 h-20 text-rose-600" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4 text-rose-600 shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                  <ExclamationTriangleIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Rejected List</h4>
                <p className="text-slate-500 text-sm font-medium leading-snug">Track supplier shortfall and rejected quantities.</p>
              </div>
            </Link>
          )}

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
