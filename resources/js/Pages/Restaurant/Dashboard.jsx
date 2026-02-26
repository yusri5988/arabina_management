import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { useState } from 'react';

export default function Dashboard({ auth, restaurant, bookings, selectedDate, summary, search }) {
    const [date, setDate] = useState(selectedDate);
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [activeBooking, setActiveBooking] = useState(null);
    const [statusInput, setStatusInput] = useState('pending');
    const [depositInput, setDepositInput] = useState('');

    const formatCurrency = (value) => {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue.toFixed(2) : '0.00';
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setDate(newDate);
        router.get('/restaurant/dashboard', { date: newDate, search: searchTerm }, { preserveState: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        router.get('/restaurant/dashboard', { date, search: searchTerm }, { preserveState: true });
    };

    const openAction = (booking) => {
        setActiveBooking(booking);
        setStatusInput(booking.status || 'pending');
        setDepositInput(''); // Set to empty string by default
        setIsActionOpen(true);
    };

    const closeAction = () => {
        setIsActionOpen(false);
        setActiveBooking(null);
        setStatusInput('pending');
        setDepositInput('');
    };

    const handleSaveAction = (e) => {
        e.preventDefault();

        if (!activeBooking) {
            return;
        }

        const payload = {
            status: statusInput,
        };

        if (depositInput !== '') {
            payload.deposit_amount = Number(depositInput);
        }

        router.put(`/restaurant/bookings/${activeBooking.id}/status`, payload, {
            preserveScroll: true,
            onSuccess: () => closeAction(),
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-amber-100 text-amber-800 border border-amber-200',
            booked: 'bg-blue-100 text-blue-800 border border-blue-200',
            payment_done: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
            cancelled: 'bg-rose-100 text-rose-800 border border-rose-200',
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            booked: 'Booked',
            payment_done: 'Payment Done',
            cancelled: 'Cancelled',
        };
        return labels[status] || status;
    };

    const capacityPercentage = Math.min(100, (summary.usedCapacity / summary.dailyCapacity) * 100);

    return (
        <AuthenticatedLayout auth={auth} header="Dashboard Utama">
            <Head title="Dashboard" />

            <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="h-16 w-16 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Kapasiti Terpakai</h3>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-3xl font-bold text-gray-900">{summary.usedCapacity}</span>
                            <span className="text-gray-400 font-medium">/ {summary.dailyCapacity} pax</span>
                        </div>
                        <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-1000 ${capacityPercentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${capacityPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="h-16 w-16 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Anggaran Jualan</h3>
                        <div className="flex items-baseline space-x-1 text-emerald-700">
                            <span className="text-sm font-semibold">RM</span>
                            <span className="text-3xl font-bold">{Number(summary.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p className="mt-4 text-xs text-gray-400 font-medium">Berdasarkan booking tidak batal</p>
                    </div>

                </div>

                {/* Filters & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                    <div className="w-full sm:w-auto">
                        <label htmlFor="date" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Pilih Tarikh Buffet
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={handleDateChange}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <a
                        href={`/restaurant/bookings/export?date=${encodeURIComponent(date)}&search=${encodeURIComponent(searchTerm)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm shadow-md shadow-emerald-200"
                    >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        List PDF
                    </a>
                </div>

                {/* Bookings List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900">
                            Senarai Tempahan <span className="ml-2 px-3 py-1 bg-white text-emerald-700 border border-emerald-100 rounded-full text-sm font-bold">{bookings.length}</span>
                        </h3>
                        <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto">
                            <label htmlFor="search" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Cari Tempahan
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    id="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nama atau No Telefon"
                                    className="w-full sm:w-64 px-4 py-2 bg-white border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                                />
                                <button
                                    type="submit"
                                    className="flex items-center px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm shadow-md shadow-emerald-200"
                                >
                                    Cari
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="p-6">
                        {bookings.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center">
                                    <svg className="h-12 w-12 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-gray-400 font-medium italic">Tiada tempahan ditemui untuk tarikh ini</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {bookings.map((booking) => (
                                    <div key={booking.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-gray-900">{booking.customer_name}</div>
                                                <div className="text-sm text-gray-500 font-medium">{booking.customer_phone}</div>
                                            </div>
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadge(booking.status)} uppercase tracking-wider`}>
                                                {getStatusLabel(booking.status)}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="text-sm text-gray-400 font-medium uppercase tracking-widest">Jumlah Bayaran</div>
                                            <div className="font-bold text-emerald-700">RM {formatCurrency(booking.total_amount)}</div>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-sm">
                                            <div className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Bayaran (Paid)</div>
                                            <div className="font-bold text-gray-700">RM {formatCurrency(booking.deposit_amount || 0)}</div>
                                        </div>

                                        <div className="mt-1 flex items-center justify-between text-sm">
                                            <div className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Baki (Balance)</div>
                                            <div className={`font-bold ${Number(booking.total_amount) - Number(booking.deposit_amount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                RM {formatCurrency(Number(booking.total_amount) - Number(booking.deposit_amount || 0))}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex justify-end space-x-2">
                                            <a
                                                href={`/restaurant/bookings/${booking.id}/receipt`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                                            >
                                                Resit PDF
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => openAction(booking)}
                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                            >
                                                Kemaskini
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isActionOpen && activeBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-emerald-900 px-6 py-8 text-white">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 mb-4 text-center">Maklumat Pelanggan</h3>
                            <div className="text-center space-y-1">
                                <div className="text-2xl font-black">{activeBooking.customer_name}</div>
                                <div className="text-lg font-bold text-emerald-200">{activeBooking.customer_phone}</div>
                            </div>

                            <div className="mt-6 border-t border-emerald-800 pt-6 space-y-4">
                                <div className="flex justify-between items-center bg-emerald-800/50 px-4 py-2 rounded-xl">
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">Tarikh Buffet</span>
                                    <span className="font-bold text-lg">{new Date(activeBooking.booking_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>

                                <div className="flex justify-between items-center bg-emerald-950/50 px-4 py-4 rounded-xl border border-emerald-800">
                                    <span className="text-sm font-medium text-emerald-200">Jumlah Pax</span>
                                    <span className="text-2xl font-black">{Number(activeBooking.adult_qty) + Number(activeBooking.child_qty) + Number(activeBooking.senior_qty)} pax</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveAction} className="p-6 space-y-5">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Jumlah Keseluruhan:</span>
                                    <span className="font-bold text-gray-900">RM {Number(activeBooking.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2">
                                    <span className="text-gray-500 font-medium">Baki Bayaran:</span>
                                    <span className={`font-bold ${(Number(activeBooking.total_amount) - Number(depositInput || 0)) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        RM {(Number(activeBooking.total_amount) - Number(depositInput || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Status
                                </label>
                                <select
                                    value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="booked">Booked</option>
                                    <option value="payment_done">Payment Done</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Jumlah Bayaran / Payment (RM)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={depositInput}
                                    onChange={(e) => setDepositInput(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="0.00"
                                />
                                <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                                    * Masukkan jumlah terkumpul yang telah dibayar oleh pelanggan.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <a
                                    href={`/restaurant/bookings/${activeBooking.id}/receipt`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200 transition-colors"
                                >
                                    Resit PDF
                                </a>
                                <button
                                    type="button"
                                    onClick={closeAction}
                                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
