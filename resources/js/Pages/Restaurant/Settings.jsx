import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { useState } from 'react';

export default function Settings({ auth, restaurant, settings, referralLink }) {
    const { data, setData, put, processing, errors } = useForm({
        daily_capacity: settings?.daily_capacity || 100,
        whatsapp_number: settings?.whatsapp_number || '',
    });

    const [copied, setCopied] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        put('/restaurant/settings');
    };

    const copyReferralLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AuthenticatedLayout auth={auth} header="Tetapan Restoran">
            <Head title="Settings" />

            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
                {/* Referral Link Card */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center mb-6">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600 mr-4">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Pautan Tempahan</h2>
                            <p className="text-sm text-gray-500 font-medium">Kongsikan pautan ini kepada pelanggan anda</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="w-full pl-4 pr-12 py-4 bg-gray-50 border-gray-200 rounded-xl text-xs sm:text-sm font-mono text-emerald-800 focus:ring-0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-emerald-600">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={copyReferralLink}
                            className={`w-full sm:w-auto px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900 text-white hover:bg-emerald-800'
                                }`}
                        >
                            {copied ? 'Berjaya Disalin!' : 'Salin Pautan'}
                        </button>
                    </div>
                </div>

                {/* Settings Form Card */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center mb-8 border-b border-gray-50 pb-6">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 mr-4">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Konfigurasi Buffet</h2>
                            <p className="text-sm text-gray-500 font-medium">Tetapkan kapasiti harian dan maklumat hubungan</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label htmlFor="whatsapp_number" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                No. WhatsApp (Mula dengan 60)
                            </label>
                            <input
                                type="text"
                                id="whatsapp_number"
                                value={data.whatsapp_number}
                                onChange={(e) => setData('whatsapp_number', e.target.value)}
                                placeholder="Cth: 60123456789"
                                className="w-full sm:max-w-md px-5 py-4 bg-gray-50 border-gray-200 rounded-2xl focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 font-bold text-gray-700 transition-all"
                            />
                            {errors.whatsapp_number && <p className="mt-2 text-[10px] text-rose-600 font-black px-1 uppercase">{errors.whatsapp_number}</p>}
                        </div>

                        <div className="p-6 sm:p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 relative group overflow-hidden">
                            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="max-w-md">
                                    <label htmlFor="daily_capacity" className="block text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-2">
                                        Kapasiti Maksimum Sehari (Pax)
                                    </label>
                                    <p className="text-sm text-emerald-600 font-medium leading-relaxed">
                                        Tetapkan jumlah slot maksimum yang boleh ditempah pelanggan setiap hari.
                                    </p>
                                </div>

                                <div className="flex items-center p-2 bg-white rounded-[2rem] border border-emerald-100 shadow-sm self-start sm:self-center">
                                    <button
                                        type="button"
                                        onClick={() => setData('daily_capacity', Math.max(1, data.daily_capacity - 1))}
                                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-600 text-white font-black text-xl hover:bg-rose-700 shadow-lg shadow-rose-900/20 active:scale-90 transition-all"
                                    >
                                        -
                                    </button>
                                    <div className="px-6 text-center min-w-[100px]">
                                        <input
                                            type="number"
                                            id="daily_capacity"
                                            min="1"
                                            value={data.daily_capacity}
                                            onChange={(e) => setData('daily_capacity', parseInt(e.target.value) || 1)}
                                            className="w-full text-center text-2xl font-black text-emerald-900 bg-transparent border-none focus:ring-0 p-0"
                                            required
                                        />
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5 opacity-50">Pax Sehari</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setData('daily_capacity', data.daily_capacity + 1)}
                                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-emerald-900 text-white font-black text-xl hover:bg-emerald-800 shadow-lg shadow-emerald-900/20 active:scale-90 transition-all"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none duration-700">
                                <svg className="h-48 w-48 text-emerald-900" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-50">
                            <Link
                                href="/restaurant/dashboard"
                                className="w-full sm:w-auto text-center px-8 py-4 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-rose-600 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto px-10 py-4 bg-emerald-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-800 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {processing ? 'Proses...' : 'Simpan Tetapan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
