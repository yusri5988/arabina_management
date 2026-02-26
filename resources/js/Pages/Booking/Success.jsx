import { Head, Link } from '@inertiajs/react';

export default function Success({ booking, restaurant }) {
    // Cast to Number to prevent .toFixed is not a function error
    const totalAmount = Number(booking.total_amount || 0);
    const totalPax = Number(booking.child_qty || 0) + Number(booking.adult_qty || 0) + Number(booking.senior_qty || 0);
    const items = booking.items || [];

    const formattedDate = new Date(booking.booking_date).toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const whatsappMessage = encodeURIComponent(
        `Salam, saya telah membuat tempahan buffet:\n\n` +
        `Nama: ${booking.customer_name}\n` +
        `No. Tel: ${booking.customer_phone}\n` +
        `Tarikh: ${formattedDate}\n` +
        `Jumlah Pax: ${totalPax} pax\n` +
        `Produk: ${items.map((item) => `${item.product_name_snapshot} x${item.quantity}`).join(', ') || '-'}\n` +
        `Total: RM ${totalAmount.toFixed(2)}\n\n` +
        `Terima kasih.`
    );

    const whatsappNumber = restaurant.settings?.whatsapp_number || '';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    return (
        <div className="min-h-screen bg-emerald-950 font-sans selection:bg-amber-200 flex flex-col items-center justify-center p-4">
            <Head title="Tempahan Berjaya" />

            {/* Decorative background element */}
            <div className="fixed inset-0 opacity-10 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-lg">
                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-emerald-800/10">
                    {/* Success Header */}
                    <div className="bg-emerald-900 pt-12 pb-20 px-8 text-center relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-400 rounded-full mb-6 shadow-lg shadow-amber-400/20 animate-bounce">
                            <svg className="h-10 w-10 text-emerald-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 italic">Tempahan Berjaya!</h1>
                        <p className="text-emerald-200 font-bold uppercase tracking-widest text-xs">Jumpa anda di {restaurant.name}</p>

                        {/* Decorative wave */}
                        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
                            <svg className="relative block w-full h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff"></path>
                            </svg>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10 -mt-8 bg-white relative rounded-t-3xl">
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Ringkasan Tempahan</h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-bold text-gray-500">Nama</span>
                                        <span className="text-sm font-black text-gray-900">{booking.customer_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-bold text-gray-500">Tarikh</span>
                                        <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">{formattedDate}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-bold text-gray-500">Bilangan Pax</span>
                                        <span className="text-sm font-black text-gray-900">{totalPax} pax</span>
                                    </div>
                                    <div className="pb-3 border-b border-gray-200/50">
                                        <span className="text-sm font-bold text-gray-500">Produk Dipilih</span>
                                        <div className="mt-2 space-y-1">
                                            {items.length === 0 ? (
                                                <div className="text-sm text-gray-400">Tiada item</div>
                                            ) : items.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="font-medium text-gray-700">{item.product_name_snapshot} x{item.quantity}</span>
                                                    <span className="font-bold text-emerald-700">RM {Number(item.line_total).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-base font-black text-gray-900 uppercase">Jumlah</span>
                                        <div className="flex items-baseline space-x-1 text-emerald-700">
                                            <span className="text-xs font-black">RM</span>
                                            <span className="text-2xl font-black">{totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start">
                                <div className="p-2 bg-amber-400 rounded-lg text-emerald-950 mr-3">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                                    Sila tunjukkan skrin ini atau hantar butiran melalui WhatsApp kepada pihak restoran untuk pengesahan lanjut.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-1 gap-3">
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-center shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.131.57-.074 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span>Hantar Ke WhatsApp</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center text-emerald-200/50 text-xs font-bold uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} {restaurant.name} &bull; BuffetRamadhan System
                </div>
            </div>
        </div>
    );
}
