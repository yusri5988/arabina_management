import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function AuthenticatedLayout({ auth, header, children }) {
    const { url } = usePage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu when URL changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [url]);

    const navigation = auth.user?.role === 'super_admin' 
        ? [
            { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { name: 'Inventory', href: '/items', icon: 'M20 13V7a2 2 0 00-2-2h-4V3H10v2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-8 0H4m8 0v3' },
            { name: 'Sales Orders', href: '/orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { name: 'Procurement', href: '/procurement', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
            { name: 'Packages', href: '/packages', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
            { name: 'Users', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        ]
        : [
            { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { name: 'Inventory', href: '/items', icon: 'M20 13V7a2 2 0 00-2-2h-4V3H10v2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-8 0H4m8 0v3' },
            { name: 'Sales Orders', href: '/orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Head title={header} />

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-emerald-900 text-white transition-all duration-300 ease-in-out flex flex-col h-full
                ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
            `}>
                <div className="h-16 flex items-center px-6 bg-emerald-950 flex-shrink-0">
                    <span className={`text-xl font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen || isMobileMenuOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0'}`}>
                        🌙 BuffetRamadhan
                    </span>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                        className="hidden lg:flex ml-auto text-emerald-200 hover:text-white"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M11 19l-7-7 7-7" : "M13 5l7 7-7 7"} />
                        </svg>
                    </button>
                    {/* Close button for mobile */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="lg:hidden ml-auto text-emerald-200 hover:text-white"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-3 py-3 rounded-xl transition-all ${
                                url.startsWith(item.href) 
                                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/20 font-bold' 
                                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                            }`}
                        >
                            <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            <span className={`ml-3 transition-all duration-300 ${isSidebarOpen || isMobileMenuOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:h-0'}`}>
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-emerald-800 bg-emerald-950/30">
                    <div className={`flex items-center ${isSidebarOpen || isMobileMenuOpen ? 'px-2' : 'justify-center'}`}>
                        <div className={`flex-1 min-w-0 ${isSidebarOpen || isMobileMenuOpen ? 'block' : 'hidden'}`}>
                            <p className="text-sm font-bold text-white truncate">{auth.user?.name}</p>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider truncate">{auth.user?.restaurant?.name || 'Staff'}</p>
                        </div>
                        <button 
                            onClick={() => router.post('/logout')}
                            className={`p-2 text-emerald-300 hover:text-white rounded-xl hover:bg-emerald-800 transition-colors ${isSidebarOpen || isMobileMenuOpen ? 'ml-2' : ''}`}
                            title="Logout"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 mr-4 text-gray-500 hover:text-emerald-600 lg:hidden rounded-lg hover:bg-gray-100"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-lg lg:text-xl font-bold text-gray-800 truncate">{header}</h1>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                            <div className="flex items-center justify-end">
                                <span className="h-2 w-2 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                <span className="text-xs font-bold text-emerald-600">Sistem Aktif</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
