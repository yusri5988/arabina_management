import { Head, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export default function BookingForm({ restaurant, settings, products = [], defaultDate, availableCapacity }) {
    if (!restaurant) {
        return (
            <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="font-bold">Memuatkan maklumat restoran...</p>
                </div>
            </div>
        );
    }

    const bookingIdentifier = restaurant.slug || restaurant.referral_code;

    const { data, setData, post, processing, errors } = useForm({
        customer_name: '',
        customer_phone: '',
        booking_date: defaultDate,
        total_pax: 0,
        items: [],
    });

    const [availableSlots, setAvailableSlots] = useState(availableCapacity);

    useEffect(() => {
        axios.get(`/r/${bookingIdentifier}/capacity`, {
            params: { date: data.booking_date },
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((response) => {
                if (response.data && response.data.availableCapacity !== undefined) {
                    setAvailableSlots(response.data.availableCapacity);
                }
            })
            .catch(() => {
            });
    }, [data.booking_date, bookingIdentifier]);

    const quantitiesByProduct = useMemo(() => {
        const map = {};
        data.items.forEach((item) => {
            map[item.product_id] = item.quantity;
        });
        return map;
    }, [data.items]);

    const updateProductQuantity = (product, quantity) => {
        const qty = Math.max(0, Number(quantity) || 0);
        const next = data.items.filter((item) => item.product_id !== product.id);

        if (qty > 0) {
            next.push({ product_id: product.id, quantity: qty });
        }

        setData('items', next);
    };

    const totalPax = Number(data.total_pax);
    const totalAmount = products.reduce((sum, product) => {
        const qty = Number(quantitiesByProduct[product.id] || 0);
        return sum + (qty * Number(product.price));
    }, 0);

    const selectedProductsCount = data.items.length;

    const canSubmit = totalPax > 0 &&
        selectedProductsCount > 0 &&
        data.booking_date >= new Date().toISOString().split('T')[0] &&
        totalPax <= availableSlots &&
        data.customer_name &&
        data.customer_phone;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(`/r/${bookingIdentifier}`);
    };

    return (
        <div className="min-h-screen bg-emerald-950 font-sans selection:bg-amber-200 text-slate-900 border-none">
            <Head title={`Tempahan Buffet - ${restaurant.name}`} />

            <div className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
                <div className="absolute top-0 left-0 w-full h-64 bg-emerald-900 skew-y-3 -translate-y-32"></div>

                <div className="relative max-w-4xl mx-auto">
                    {/* Header Section */}
                    <div className="bg-white rounded-t-3xl p-6 sm:p-10 border-b border-gray-100 shadow-xl text-center">
                        <div className="inline-block p-1 bg-emerald-50 rounded-full mb-4">
                            <div className="bg-white rounded-full p-2 shadow-sm border border-emerald-100">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 leading-tight uppercase tracking-tight">{restaurant.name}</h1>
                        <p className="text-emerald-700 font-black uppercase tracking-[0.25em] text-[10px]">Pakej Buffet Ramadhan 2024</p>
                    </div>

                    <div className="bg-white shadow-2xl rounded-b-3xl overflow-hidden mb-12">
                        <div className="p-6 sm:p-10">
                            {errors.error && (
                                <div className="mb-8 p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center text-rose-800 animate-pulse">
                                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-sm font-black uppercase tracking-tight">{errors.error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-10">
                                {/* Informassi Pelanggan */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <div className="h-1 w-8 bg-emerald-600 rounded-full"></div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Maklumat Pelanggan</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2 group">
                                            <label htmlFor="customer_name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Penuh *</label>
                                            <input
                                                type="text"
                                                id="customer_name"
                                                value={data.customer_name}
                                                onChange={(e) => setData('customer_name', e.target.value)}
                                                placeholder="Cth: Ahmad Farhan"
                                                className="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 font-bold text-gray-900 transition-all"
                                                required
                                            />
                                            {errors.customer_name && <p className="text-[10px] text-rose-600 font-black mt-1 ml-1">{errors.customer_name}</p>}
                                        </div>

                                        <div className="space-y-2 group">
                                            <label htmlFor="customer_phone" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. Telefon *</label>
                                            <input
                                                type="tel"
                                                id="customer_phone"
                                                value={data.customer_phone}
                                                onChange={(e) => setData('customer_phone', e.target.value)}
                                                placeholder="Cth: 0123456789"
                                                className="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 font-bold text-gray-900 transition-all"
                                                required
                                            />
                                            {errors.customer_phone && <p className="text-[10px] text-rose-600 font-black mt-1 ml-1">{errors.customer_phone}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Tarikh & Slot */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <div className="h-1 w-8 bg-emerald-600 rounded-full"></div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tarikh & Kapasiti</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                                        <div className="space-y-2">
                                            <label htmlFor="booking_date" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tarikh Berbuka *</label>
                                            <input
                                                type="date"
                                                id="booking_date"
                                                value={data.booking_date}
                                                onChange={(e) => setData('booking_date', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-5 py-4 bg-emerald-50 border-emerald-100 text-emerald-900 font-black rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                                                required
                                            />
                                            <div className="flex justify-between items-center mt-3 px-2">
                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Slot Tersedia</span>
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 transition-all ${availableSlots < 10 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                    {availableSlots} PAX
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm transition-hover hover:border-emerald-200">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Jumlah Tetamu (Pax)</label>
                                            <div className="flex items-center justify-center space-x-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setData('total_pax', Math.max(0, data.total_pax - 1))}
                                                    className="w-12 h-12 flex items-center justify-center bg-white text-gray-400 font-black text-xl rounded-2xl shadow-sm border border-gray-100 hover:text-rose-600 transition-all active:scale-90"
                                                >-</button>
                                                <div className="text-center group min-w-[60px]">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={data.total_pax}
                                                        onChange={(e) => setData('total_pax', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                        className="w-full text-center font-black text-gray-900 text-3xl border-none focus:ring-0 p-0 bg-transparent"
                                                    />
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight mt-1">Pax</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setData('total_pax', data.total_pax + 1)}
                                                    className="w-12 h-12 flex items-center justify-center bg-emerald-900 text-white font-black text-xl rounded-2xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all active:scale-90"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Pilih Produk */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1 w-8 bg-emerald-600 rounded-full"></div>
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Menu Buffet</h3>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 ${selectedProductsCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                            Dipilih: {selectedProductsCount}
                                        </span>
                                    </div>

                                    {products.length === 0 ? (
                                        <div className="rounded-[2.5rem] border-2 border-dashed border-emerald-100 bg-emerald-50/50 p-12 text-center">
                                            <p className="text-sm font-black text-emerald-800 uppercase tracking-wider">Menu belum dikemaskini.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {products.map((product) => {
                                                const quantity = Number(quantitiesByProduct[product.id] || 0);

                                                return (
                                                    <div key={product.id} className="group relative rounded-[2.5rem] border-2 border-gray-50 bg-white overflow-hidden shadow-sm hover:shadow-2xl hover:border-emerald-100 transition-all duration-500 flex flex-col h-full active:scale-[0.98]">
                                                        <div className="h-56 w-full overflow-hidden bg-gray-50 relative">
                                                            {product.image_path ? (
                                                                <img src={`/storage/${product.image_path}`} alt={product.name} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                            ) : (
                                                                <div className="h-full w-full flex flex-col items-center justify-center text-[10px] font-bold text-gray-300 bg-gray-50 uppercase tracking-[0.2em]">
                                                                    <svg className="w-16 h-16 mb-2 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    No Image
                                                                </div>
                                                            )}
                                                            <div className="absolute top-6 right-6">
                                                                <span className="text-sm font-black text-white bg-emerald-900/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl shadow-emerald-900/40 border border-white/10">
                                                                    RM {Number(product.price).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="p-8 flex-1 flex flex-col">
                                                            <h4 className="text-xl font-black text-gray-900 leading-tight mb-4 uppercase tracking-tight group-hover:text-emerald-900 transition-colors">
                                                                {product.name}
                                                            </h4>

                                                            {product.description && (
                                                                <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase tracking-tight mb-8 opacity-70">
                                                                    {product.description}
                                                                </p>
                                                            )}

                                                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                                                <div className="space-y-1">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Jumlah Harga</p>
                                                                    <p className="text-xs font-black text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg">
                                                                        RM {(quantity * Number(product.price)).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center p-1.5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                                                    <button type="button" onClick={() => updateProductQuantity(product, quantity - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-gray-400 font-black shadow-sm hover:text-rose-600 transition-all active:scale-90">-</button>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={quantity}
                                                                            onChange={(e) => updateProductQuantity(product, e.target.value)}
                                                                            className="w-14 text-center text-lg font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                                                                        />
                                                                    </div>
                                                                    <button type="button" onClick={() => updateProductQuantity(product, quantity + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-900 text-white font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all active:scale-90">+</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Ringkasan Bayaran */}
                                <div className="bg-emerald-900 rounded-[3rem] p-10 shadow-2xl shadow-emerald-900/40 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl transition-all group-hover:scale-150"></div>

                                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-8">
                                        <div className="text-center sm:text-left">
                                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                                <div className="h-2 w-2 bg-amber-400 rounded-full animate-ping"></div>
                                                <span className="text-[10px] font-black text-emerald-100/60 uppercase tracking-[0.3em]">Ringkasan Tempahan</span>
                                            </div>
                                            <p className="text-white/80 font-bold text-sm uppercase tracking-widest">
                                                <span className="text-amber-400 text-xl font-black mr-2">{totalPax}</span> Tetamu • <span className="text-amber-400 text-xl font-black mx-2">{selectedProductsCount}</span> Menu
                                            </p>
                                        </div>
                                        <div className="text-center sm:text-right">
                                            <p className="text-[10px] font-black text-emerald-100/60 uppercase tracking-[0.3em] mb-1">Jumlah Keseluruhan</p>
                                            <div className="flex items-baseline justify-center sm:justify-end gap-2 text-white">
                                                <span className="text-lg font-black text-amber-400">RM</span>
                                                <span className="text-5xl font-black tracking-tighter">{totalAmount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {totalPax > availableSlots && (
                                    <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl text-rose-800 flex items-center gap-4 animate-bounce">
                                        <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-rose-100 rounded-full">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">Slot penuh! Sila kurangkan jumlah pax atau pilih tarikh lain.</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!canSubmit || processing}
                                    className="w-full bg-white text-emerald-950 py-6 px-4 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-xl border-4 border-emerald-900/10 hover:bg-emerald-50 hover:border-emerald-900/20 active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 disabled:border-gray-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    {processing ? 'Menyimpan...' : 'Sahkan Tempahan Sekarang'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="py-12 text-center text-white/30">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Buffet Ramadhan &bull; 2024</p>
            </footer>
        </div>
    );
}
