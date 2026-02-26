import { usePage, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { 
  ArrowRightOnRectangleIcon, 
  HomeIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  ChevronLeftIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline/index.js';

export default function AuthenticatedLayout({ children, title, showWelcome = false, backUrl = null }) {
  const { auth, url } = usePage().props;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    router.post('/logout');
  };

  const isActive = (path) => {
    if (!url) return false;
    if (path === '/dashboard' && url === '/dashboard') return true;
    if (path !== '/dashboard' && url.startsWith(path)) return true;
    return false;
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }

    router.visit('/dashboard');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Items', path: '/items', icon: ArchiveBoxIcon },
    { name: 'Stock List', path: '/items/stocks', icon: ArchiveBoxIcon },
    { name: 'Order', path: '/orders', icon: ShoppingCartIcon },
    ...(auth?.user?.role === 'procurement' || auth?.user?.role === 'store_keeper' || auth?.user?.role === 'super_admin'
      ? [{ name: 'Procurement', path: '/procurement', icon: TruckIcon }]
      : []),
    ...(auth?.user?.role === 'procurement' || auth?.user?.role === 'store_keeper' || auth?.user?.role === 'super_admin'
      ? [{ name: 'Rejected', path: '/rejections', icon: ExclamationTriangleIcon }]
      : []),
    ...(auth?.user?.role === 'super_admin' ? [{ name: 'Users', path: '/admin/users', icon: UsersIcon }] : []),
    { name: 'Profile', path: '/profile', icon: UserCircleIcon },
  ];

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#064e3b] text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-emerald-800/50">
          <div className="flex items-center space-x-3">
            <img 
              src="/images/logo.jpg" 
              alt="Logo" 
              className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400/30 bg-white"
            />
            <div>
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Arabina</p>
              <h1 className="text-lg font-bold leading-none tracking-tight text-white">Inventory</h1>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-emerald-800 rounded-lg transition-colors">
            <XMarkIcon className="w-6 h-6 text-emerald-100" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-emerald-300/60 uppercase tracking-widest mb-4">Main Menu</p>
          {navLinks.map((link) => (
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
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-800/50 bg-[#053e2f]/50">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
             <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-[#064e3b] font-black text-lg shadow-inner">
                {auth?.user?.name?.charAt(0)}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{auth?.user?.name}</p>
                <p className="text-[10px] text-emerald-300 uppercase tracking-widest truncate font-semibold">{auth?.user?.role?.replace('_', ' ')}</p>
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
              {backUrl && (
                backUrl === '__back__' ? (
                  <button type="button" onClick={handleBack} className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                ) : (
                  <Link href={backUrl} className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" strokeWidth={2.5} />
                  </Link>
                )
              )}
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
              <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-[#064e3b] to-emerald-800 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl border border-emerald-700/50">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-400 opacity-10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Welcome back, {auth?.user?.name}!</h2>
                  <p className="text-emerald-100/90 text-sm sm:text-base font-medium">Manage your inventory, monitor stocks, and handle operations from your dashboard.</p>
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
