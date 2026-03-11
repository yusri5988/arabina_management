import { usePage, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
  ArrowRightOnRectangleIcon,
  HomeIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  TableCellsIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CubeIcon
} from '@heroicons/react/24/outline/index.js';

export default function AuthenticatedLayout({ children, title, showWelcome = false, backUrl = null }) {
  const { auth, url } = usePage().props;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(() => url?.startsWith('/warehouse') || url?.startsWith('/items/stocks') || url?.startsWith('/items/stock/out') || url?.startsWith('/packages'));
  const [procurementOpen, setProcurementOpen] = useState(() => url?.startsWith('/procurement'));
  const userPermissions = auth?.user?.module_permissions ?? [];

  const hasModuleAccess = (moduleKey) => {
    return userPermissions.includes(moduleKey);
  };

  const logout = () => {
    router.post('/logout');
  };

  const isActive = (path) => {
    if (!url) return false;
    if (path === '/dashboard' && url === '/dashboard') return true;
    if (path !== '/dashboard' && url.startsWith(path)) return true;
    return false;
  };

  const warehouseChildren = [
    { name: 'CRN (Container)', path: '/warehouse/crn', icon: DocumentTextIcon },
    { name: 'MRN (Material)', path: '/warehouse/mrn', icon: DocumentTextIcon },
    { name: 'SRN (Site)', path: '/warehouse/srn', icon: DocumentTextIcon },
    { name: 'Item Catalog', path: '/items', icon: ArchiveBoxIcon },
    { name: 'Stock List', path: '/items/stocks', icon: TableCellsIcon },
    { name: 'Delivery Order', path: '/items/stock/out', icon: ArrowUpTrayIcon },
    { name: 'Rejected List', path: '/warehouse/rejections', icon: ExclamationTriangleIcon },
    { name: 'Create Package', path: '/packages', icon: CubeIcon },
  ].filter((child) => {
    const moduleMap = {
      '/warehouse/crn': 'crn',
      '/warehouse/mrn': 'mrn',
      '/warehouse/srn': 'srn',
      '/items': 'item_catalog',
      '/items/stocks': 'stock_list',
      '/items/stock/out': 'delivery_order',
      '/warehouse/rejections': 'rejected_list',
      '/packages': 'create_package',
    };

    return hasModuleAccess(moduleMap[child.path]);
  });
  const showWarehouseMenu = warehouseChildren.length > 0;
  const procurementChildren = [
    { name: 'BOM Cabin', path: '/procurement/cabin', icon: TruckIcon },
    { name: 'BOM Hardware', path: '/procurement/hardware', icon: TruckIcon },
    { name: 'BOM Hardware Site', path: '/procurement/hardware-site', icon: TruckIcon },
  ];
  const showProcurementMenu = hasModuleAccess('procurement');

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon, visible: true },
    { name: 'Order', path: '/orders', icon: ShoppingCartIcon, visible: hasModuleAccess('sales_orders') },
    { name: 'Procurement', path: '/procurement/cabin', icon: TruckIcon, visible: showProcurementMenu },
    { name: 'Warehouse', path: '/warehouse', icon: BuildingStorefrontIcon, visible: showWarehouseMenu },
    { name: 'Users', path: '/admin/users', icon: UsersIcon, visible: hasModuleAccess('admin_users') },
    { name: 'Activity Logs', path: '/admin/logs', icon: ClockIcon, visible: hasModuleAccess('admin_logs') },
    { name: 'Profile', path: '/profile', icon: UserCircleIcon, visible: true },
  ].filter((link) => link.visible);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#1b580e] to-[#0d2a07] text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <img
              src="/images/arabina%20logo%20png.png"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-emerald-800 rounded-lg transition-colors">
            <XMarkIcon className="w-6 h-6 text-emerald-100" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-emerald-300/60 uppercase tracking-widest mb-4">Main Menu</p>
          {navLinks.map((link) => {
            if (link.name === 'Procurement' && showProcurementMenu) {
              const procurementActive = isActive('/procurement');

              return (
                <div key={link.name} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setProcurementOpen((prev) => !prev)}
                    className={`flex w-full items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                      procurementActive
                        ? 'bg-emerald-800/80 text-white font-bold shadow-inner border border-emerald-700/50'
                        : 'text-emerald-100/70 hover:bg-emerald-800/40 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="flex items-center space-x-3">
                      <link.icon className={`w-5 h-5 ${procurementActive ? 'text-emerald-300' : ''}`} strokeWidth={procurementActive ? 2.5 : 2} />
                      <span>{link.name}</span>
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${procurementOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                  </button>

                  {procurementOpen && (
                    <div className="ml-4 space-y-1 border-l border-emerald-800/60 pl-3">
                      {procurementChildren.map((child) => (
                        <Link
                          key={child.name}
                          href={child.path}
                          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                            isActive(child.path)
                              ? 'bg-emerald-700/70 text-white font-semibold border border-emerald-600/60'
                              : 'text-emerald-100/70 hover:bg-emerald-800/30 hover:text-white border border-transparent'
                          }`}
                        >
                          <child.icon className={`w-4 h-4 ${isActive(child.path) ? 'text-emerald-200' : ''}`} strokeWidth={2} />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (link.name === 'Warehouse' && showWarehouseMenu) {
              const warehouseActive = isActive('/warehouse') || isActive('/items/stocks') || isActive('/items/stock/out') || isActive('/packages');

              return (
                <div key={link.name} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setWarehouseOpen((prev) => !prev)}
                    className={`flex w-full items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                      warehouseActive
                        ? 'bg-emerald-800/80 text-white font-bold shadow-inner border border-emerald-700/50'
                        : 'text-emerald-100/70 hover:bg-emerald-800/40 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="flex items-center space-x-3">
                      <link.icon className={`w-5 h-5 ${warehouseActive ? 'text-emerald-300' : ''}`} strokeWidth={warehouseActive ? 2.5 : 2} />
                      <span>{link.name}</span>
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${warehouseOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                  </button>

                  {warehouseOpen && (
                    <div className="ml-4 space-y-1 border-l border-emerald-800/60 pl-3">
                      {warehouseChildren.map((child) => (
                        <Link
                          key={child.name}
                          href={child.path}
                          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                            isActive(child.path)
                              ? 'bg-emerald-700/70 text-white font-semibold border border-emerald-600/60'
                              : 'text-emerald-100/70 hover:bg-emerald-800/30 hover:text-white border border-transparent'
                          }`}
                        >
                          <child.icon className={`w-4 h-4 ${isActive(child.path) ? 'text-emerald-200' : ''}`} strokeWidth={2} />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive(link.path) 
                  ? 'bg-emerald-800/80 text-white font-bold shadow-inner border border-emerald-700/50' 
                  : 'text-emerald-100/70 hover:bg-emerald-800/40 hover:text-white border border-transparent'
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive(link.path) ? 'text-emerald-300' : ''}`} strokeWidth={isActive(link.path) ? 2.5 : 2} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800/50 bg-[#123a09]/50">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
             <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-[#1b580e] font-black text-lg shadow-inner">
                {auth?.user?.name?.charAt(0)}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{auth?.user?.name}</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest truncate font-semibold">
                  {`${userPermissions.length} MODULE${userPermissions.length === 1 ? '' : 'S'}`}
                </p>
             </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-emerald-100/80 hover:bg-red-500/20 hover:text-red-300 transition-all font-semibold"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
          <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">{title || 'Dashboard'}</h1>
            </div>
            
            <div className="flex items-center">
              {/* Extra header actions can be placed here if needed */}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {showWelcome && (
              <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-[#1b580e] to-[#0d2a07] rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl border border-white/5">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-400 opacity-5 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Welcome back, {auth?.user?.name}!</h2>
                  <p className="text-white/80 text-sm sm:text-base font-medium">Manage your inventory, monitor stocks, and handle operations from your dashboard.</p>
                </div>
              </div>
            )}            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
