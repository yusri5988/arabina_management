import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ExclamationTriangleIcon, ArchiveBoxIcon, CubeIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline/index.js';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function WarehouseIndex() {
  const { auth } = usePage().props;

  return (
    <AuthenticatedLayout title="Warehouse" backUrl="__back__">
      <Head title="Warehouse" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          href="/warehouse/crn"
          className="group relative bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <DocumentTextIcon className="w-20 h-20 text-amber-600" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <DocumentTextIcon className="w-6 h-6" strokeWidth={2} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">CRN (Contena)</h4>
            <p className="text-slate-500 text-sm font-medium leading-snug">Receive containers and record item counts.</p>
          </div>
        </Link>

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

        <Link
          href="/items/stocks"
          className="group relative bg-white p-6 rounded-2xl shadow-sm border border-cyan-100 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <TableCellsIcon className="w-20 h-20 text-cyan-600" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-4 text-cyan-600 shadow-inner group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
              <TableCellsIcon className="w-6 h-6" strokeWidth={2} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Stock List</h4>
            <p className="text-slate-500 text-sm font-medium leading-snug">View live inventory stock table by SKU.</p>
          </div>
        </Link>

        <Link
          href="/items/stock/in"
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

        <Link
          href="/items/stock/out"
          className="group relative bg-white p-6 rounded-2xl shadow-sm border border-red-100 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/50 transition-all duration-300 active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <ArrowUpTrayIcon className="w-20 h-20 text-red-600" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600 shadow-inner group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
              <ArrowUpTrayIcon className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">Delivery Order</h4>
            <p className="text-slate-500 text-sm font-medium leading-snug">Prepare and submit outgoing delivery stock.</p>
          </div>
        </Link>

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
      </div>
    </AuthenticatedLayout>
  );
}
