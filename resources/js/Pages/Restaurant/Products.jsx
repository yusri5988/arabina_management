import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

const emptyForm = {
    name: '',
    description: '',
    price: '',
    is_active: true,
    image: null,
};

export default function Products({ auth, products }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const { data, setData, processing, errors, reset } = useForm(emptyForm);

    const imagePreview = useMemo(() => {
        if (!data.image) {
            return null;
        }

        return URL.createObjectURL(data.image);
    }, [data.image]);

    const openEditModal = (product) => {
        setEditingProduct(product);
        setData({
            name: product.name,
            description: product.description || '',
            price: String(product.price ?? ''),
            is_active: product.is_active,
            image: null,
        });
        setShowCreateModal(true);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditingProduct(null);
        reset();
        setData({ ...emptyForm });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            is_active: data.is_active ? 1 : 0,
        };

        router.post(`/restaurant/products/${editingProduct.id}`, {
            _method: 'put',
            ...payload,
        }, {
            forceFormData: true,
            onSuccess: closeModal,
        });
    };

    const toggleStatus = (product) => {
        router.put(`/restaurant/products/${product.id}/toggle-active`);
    };

    const deleteProduct = (product) => {
        if (!window.confirm(`Hapus produk "${product.name}"?`)) {
            return;
        }

        router.delete(`/restaurant/products/${product.id}`);
    };

    return (
        <AuthenticatedLayout auth={auth} header="Pengurusan Produk">
            <Head title="Produk & Menu" />

            <div className="space-y-6 sm:space-y-8 pb-12">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h2 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.2em]">Pengurusan Menu</h2>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">Senarai Produk & Pakej</h1>
                        <p className="text-gray-500 font-medium text-sm sm:text-base mt-1">Uruskan senarai menu buffet Ramadhan anda.</p>
                    </div>

                    <Link
                        href="/restaurant/products/create"
                        className="relative z-10 flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-emerald-900 text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-800 shadow-xl shadow-emerald-900/20 transition-all active:scale-95 group/btn"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Produk
                    </Link>

                    <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none duration-700">
                        <svg className="h-64 w-64 text-emerald-900" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                </div>

                {/* Desktop Table View (Hidden on Mobile) */}
                <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">Maklumat Produk</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">Harga (RM)</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">Status</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tiada Produk Dijumpai</h3>
                                                <p className="text-gray-400 font-medium text-sm mt-1">Mulakan dengan menambah produk pertama anda.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center relative">
                                                    {product.image_path ? (
                                                        <img
                                                            src={`/storage/${product.image_path}`}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-[10px] font-black text-gray-300 uppercase leading-none text-center p-2">Tiada Gambar</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 uppercase tracking-tight leading-tight">{product.name}</div>
                                                    {product.description && (
                                                        <div className="text-xs text-gray-400 font-medium line-clamp-1 mt-1">{product.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-black text-emerald-900">RM {Number(product.price).toFixed(2)}</td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full mr-2 ${product.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                                {product.is_active ? 'Aktif' : 'Tidak Aktif'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90 group/act"
                                                    title="Kemaskini"
                                                >
                                                    <svg className="w-5 h-5 group-hover/act:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(product)}
                                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-90 group/act ${product.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                                    title={product.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
                                                >
                                                    <svg className="w-5 h-5 group-hover/act:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        {product.is_active ? (
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                        ) : (
                                                            <>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                            </>
                                                        )}
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product)}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 group/act"
                                                    title="Padam"
                                                >
                                                    <svg className="w-5 h-5 group-hover/act:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.244 2.244 0 0 1-2.244 2.077H8.084a2.244 2.244 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View (Shown on Mobile/Tablet) */}
                <div className="lg:hidden space-y-4">
                    {products.length === 0 ? (
                        <div className="bg-white p-12 rounded-[2rem] text-center border border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tiada Produk Dijumpai</h3>
                            <p className="text-gray-400 font-medium text-sm mt-1">Sila tambah produk baru.</p>
                        </div>
                    ) : products.map((product) => (
                        <div key={product.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    {product.image_path ? (
                                        <img src={`/storage/${product.image_path}`} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="text-[10px] font-black text-gray-300 uppercase leading-none text-center p-2">No Image</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-gray-900 uppercase tracking-tight leading-tight truncate">{product.name}</div>
                                    <div className="text-emerald-900 font-black text-sm mt-1">RM {Number(product.price).toFixed(2)}</div>
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                            {product.is_active ? 'Aktif' : 'Tidak Aktif'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tindakan</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEditModal(product)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 active:scale-95 shadow-sm">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                    <button onClick={() => toggleStatus(product)} className={`h-11 w-11 flex items-center justify-center rounded-xl active:scale-95 shadow-sm ${product.is_active ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            {product.is_active ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            ) : (
                                                <>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                    <button onClick={() => deleteProduct(product)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 active:scale-95 shadow-sm">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.244 2.244 0 0 1-2.244 2.077H8.084a2.244 2.244 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Premium Modal Section */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md transition-opacity duration-500 animate-in fade-in" onClick={closeModal}></div>

                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[1.5rem] sm:rounded-[3rem] bg-white shadow-2xl overflow-hidden transform transition-all animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-emerald-900 -z-0"></div>

                        <div className="relative z-10 p-5 sm:p-12">
                            <div className="flex items-center justify-between mb-6 sm:mb-10">
                                <div>
                                    <h3 className="text-xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight">
                                        {editingProduct ? 'Kemaskini Produk' : 'Cipta Produk Baru'}
                                    </h3>
                                    <div className="h-1 w-10 sm:w-12 bg-white/30 rounded-full mt-2 sm:mt-3"></div>
                                </div>
                                <button onClick={closeModal} className="h-9 w-9 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-8">
                                <div className="grid grid-cols-1 gap-5 sm:gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Nama Produk Penuh *</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Cth: Kambing Golek Talam"
                                            className="w-full px-4 sm:px-7 py-3.5 sm:py-5 bg-gray-50 border-gray-100 rounded-xl sm:rounded-3xl focus:ring-emerald-500 focus:border-emerald-500 font-bold text-gray-900 text-base sm:text-lg transition-all"
                                            required
                                        />
                                        {errors.name && <p className="text-xs text-rose-600 font-black tracking-wide ml-1">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Penerangan Menu</label>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Huraikan keistimewaan menu ini..."
                                            className="w-full px-4 sm:px-7 py-3.5 sm:py-5 bg-gray-50 border-gray-100 rounded-xl sm:rounded-3xl focus:ring-emerald-500 focus:border-emerald-500 font-medium text-gray-700 text-sm sm:text-base leading-relaxed transition-all"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:gap-8 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Harga Jualan (RM) *</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-7 flex items-center pointer-events-none">
                                                    <span className="text-gray-400 font-black text-sm sm:text-base">RM</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={data.price}
                                                    onChange={(e) => setData('price', e.target.value)}
                                                    className="w-full pl-12 sm:pl-16 pr-4 sm:pr-7 py-3.5 sm:py-5 bg-gray-50 border-gray-100 rounded-xl sm:rounded-3xl focus:ring-emerald-500 focus:border-emerald-500 font-black text-gray-900 text-base sm:text-lg transition-all"
                                                    required
                                                />
                                            </div>
                                            {errors.price && <p className="text-xs text-rose-600 font-black tracking-wide ml-1">{errors.price}</p>}
                                        </div>

                                        <div className="flex flex-col justify-end">
                                            <label className="group relative flex items-center gap-4 sm:gap-5 cursor-pointer p-4 sm:p-5 bg-gray-50 border border-gray-100 rounded-xl sm:rounded-3xl hover:border-emerald-200 transition-all overflow-hidden">
                                                <div className="relative z-10 flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(data.is_active)}
                                                        onChange={(e) => setData('is_active', e.target.checked)}
                                                        className="peer h-6 w-6 sm:h-7 sm:w-7 rounded-lg sm:rounded-xl border-gray-300 text-emerald-600 focus:ring-emerald-500 opacity-0 absolute cursor-pointer"
                                                    />
                                                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                                                        <svg className={`w-3 h-3 sm:w-4 sm:h-4 text-white transition-opacity ${data.is_active ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="relative z-10">
                                                    <span className="block text-[10px] font-black text-gray-900 uppercase tracking-[0.1em] sm:tracking-[0.15em] leading-none mb-1">Status Produk</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-tight ${data.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {data.is_active ? 'Aktif' : 'Disembunyikan'}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Visual Produk</label>
                                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-center sm:items-start bg-gray-50/50 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100/50">
                                        <div className="relative group shrink-0 shadow-lg rounded-[1.25rem] sm:rounded-[2.5rem]">
                                            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[1.25rem] sm:rounded-[2.5rem] overflow-hidden bg-white border-4 border-white ring-1 ring-gray-100 transition-all group-hover:ring-emerald-300 flex items-center justify-center relative">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="preview" className="h-full w-full object-cover rounded-[0.75rem] sm:rounded-[2rem]" />
                                                ) : editingProduct?.image_path ? (
                                                    <img src={`/storage/${editingProduct.image_path}`} alt="current" className="h-full w-full object-cover rounded-[0.75rem] sm:rounded-[2rem]" />
                                                ) : (
                                                    <div className="text-gray-200 flex flex-col items-center">
                                                        <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Tiada Fail</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 pt-0 sm:pt-2 w-full sm:w-auto text-center sm:text-left">
                                            <div className="relative mt-2 sm:mt-0">
                                                <input
                                                    type="file"
                                                    id="product_image"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={(e) => setData('image', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="product_image"
                                                    className="cursor-pointer inline-flex items-center px-8 sm:px-10 py-3.5 sm:py-5 bg-white text-emerald-900 rounded-xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all border-2 border-emerald-100 shadow-sm"
                                                >
                                                    Pilih Gambar
                                                </label>
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 leading-relaxed mt-3 sm:mt-4 px-1 uppercase tracking-wider italic">
                                                * Muat naik fail JPG/PNG/WEBP (Maks 2MB)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-5 pt-6 sm:pt-10 mt-4 sm:mt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full sm:w-auto h-12 sm:h-16 px-10 text-gray-400 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:text-rose-600 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto h-12 sm:h-16 px-12 bg-emerald-900 text-white rounded-xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] hover:bg-emerald-800 shadow-2xl shadow-emerald-900/40 disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        {processing ? 'Proses...' : (editingProduct ? 'Simpan' : 'Hantar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
