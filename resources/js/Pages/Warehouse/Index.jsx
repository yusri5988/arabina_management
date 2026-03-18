import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowUpTrayIcon, ExclamationTriangleIcon, ArchiveBoxIcon, CubeIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline/index.js';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const hasModuleAccess = (user, moduleKey) => {
  if (!user) return false;
  return (user.module_permissions ?? []).includes(moduleKey);
};

export default function WarehouseIndex() {
  const { auth } = usePage().props;
  const user = auth?.user;
  const cards = [
    {
      key: 'crn',
      href: '/warehouse/crn',
      title: 'CRN (Container)',
      description: 'Receive containers and record item counts.',
      icon: DocumentTextIcon,
      borderClass: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-100/50',
      iconClass: 'text-amber-600 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white',
      bgIconClass: 'text-amber-600',
    },
    {
      key: 'mrn',
      href: '/warehouse/mrn',
      title: 'MRN (Material)',
      description: 'Receive procurement hardware before stock transfer.',
      icon: DocumentTextIcon,
      borderClass: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100/50',
      iconClass: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white',
      bgIconClass: 'text-emerald-600',
    },
    {
      key: 'srn',
      href: '/warehouse/srn',
      title: 'SRN (Site)',
      description: 'Receive hardware site procurement before stock transfer.',
      icon: DocumentTextIcon,
      borderClass: 'border-teal-100 hover:border-teal-300 hover:shadow-teal-100/50',
      iconClass: 'text-teal-600 bg-teal-50 group-hover:bg-teal-600 group-hover:text-white',
      bgIconClass: 'text-teal-600',
    },
    {
      key: 'item_catalog',
      href: '/items',
      title: 'Item Catalog',
      description: 'Manage products and variants.',
      icon: ArchiveBoxIcon,
      borderClass: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-100/50',
      iconClass: 'text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white',
      bgIconClass: 'text-blue-600',
    },
    {
      key: 'stock_list',
      href: '/items/stocks',
      title: 'Stock List',
      description: 'View live inventory stock table by SKU.',
      icon: TableCellsIcon,
      borderClass: 'border-cyan-100 hover:border-cyan-300 hover:shadow-cyan-100/50',
      iconClass: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-600 group-hover:text-white',
      bgIconClass: 'text-cyan-600',
    },
    {
      key: 'delivery_order',
      href: '/items/stock/out',
      title: 'Delivery Order',
      description: 'Prepare and submit outgoing delivery stock.',
      icon: ArrowUpTrayIcon,
      borderClass: 'border-red-100 hover:border-red-300 hover:shadow-red-100/50',
      iconClass: 'text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white',
      bgIconClass: 'text-red-600',
    },
    {
      key: 'rejected_list',
      href: '/warehouse/rejections',
      title: 'Rejected List',
      description: 'Track supplier shortfall and rejected quantities.',
      icon: ExclamationTriangleIcon,
      borderClass: 'border-rose-100 hover:border-rose-300 hover:shadow-rose-100/50',
      iconClass: 'text-rose-600 bg-rose-50 group-hover:bg-rose-600 group-hover:text-white',
      bgIconClass: 'text-rose-600',
    },
    {
      key: 'create_package',
      href: '/packages',
      title: 'Create Package',
      description: 'Define package with SKU and quantity.',
      icon: CubeIcon,
      borderClass: 'border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100/50',
      iconClass: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white',
      bgIconClass: 'text-indigo-600',
    },
  ].filter((card) => hasModuleAccess(user, card.key));

  return (
    <AuthenticatedLayout title="Warehouse" backUrl="__back__">
      <Head title="Warehouse" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={`group relative bg-white p-6 rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 active:scale-[0.98] overflow-hidden ${card.borderClass}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <card.icon className={`w-20 h-20 ${card.bgIconClass}`} />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-inner transition-colors duration-300 ${card.iconClass}`}>
                <card.icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">{card.title}</h4>
              <p className="text-slate-500 text-sm font-medium leading-snug">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </AuthenticatedLayout>
  );
}
