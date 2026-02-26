import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

const initialForm = {
    name: '',
    description: '',
    price: '',
    is_active: true,
    image: null,
};

export default function ProductCreate({ auth }) {
    const { data, setData, post, processing, errors, progress } = useForm(initialForm);

    const imagePreview = useMemo(() => {
        if (!data.image) {
            return null;
        }

        return URL.createObjectURL(data.image);
    }, [data.image]);

    const handleSubmit = (e) => {
        e.preventDefault();

        post('/restaurant/products', {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout auth={auth} header="Create Product">
            <Head title="Create Product" />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                    <h1 className="text-3xl font-black text-gray-900">Tambah Produk Baru</h1>
                    <p className="text-gray-500 mt-1">Isi maklumat produk untuk dipaparkan di halaman tempahan.</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Nama Produk *</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-bold text-gray-900"
                                required
                            />
                            {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Penerangan</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows="4"
                                className="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-medium text-gray-700"
                            />
                            {errors.description && <p className="text-xs text-rose-600 font-medium">{errors.description}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Harga (RM) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-black text-gray-900"
                                    required
                                />
                                {errors.price && <p className="text-xs text-rose-600 font-medium">{errors.price}</p>}
                            </div>

                            <div className="flex items-end pb-2">
                                <label className="inline-flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(data.is_active)}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-emerald-600"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">Aktif untuk tempahan</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Gambar Produk</label>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setData('image', e.target.files?.[0] || null)}
                                className="w-full px-5 py-3 bg-gray-50 border-gray-100 rounded-2xl"
                            />
                            {errors.image && <p className="text-xs text-rose-600 font-medium">{errors.image}</p>}

                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" className="mt-3 h-32 w-32 rounded-2xl object-cover" />
                            )}

                            {progress && <p className="text-xs text-gray-500">Uploading: {progress.percentage}%</p>}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link href="/restaurant/products" className="px-6 py-3 text-gray-500 font-semibold hover:text-gray-700">Batal</Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-8 py-3 bg-emerald-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Produk'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
