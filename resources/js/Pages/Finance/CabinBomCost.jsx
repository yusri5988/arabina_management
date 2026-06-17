import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { CurrencyYenIcon, DocumentCheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FloatingAlert from '../../components/FloatingAlert';

export default function CabinBomCost({ auth, items, filters }) {
    const [search, setSearch] = useState(filters.search || '');

    const { data, setData, post, processing, isDirty } = useForm({
        items: items.map(item => ({
            id: item.id,
            cost_cny: item.cost_cny || 0,
        }))
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            '/finance/cabin-bom-cost',
            { search },
            { preserveState: true, replace: true }
        );
    };

    const handleCostChange = (index, value) => {
        const numbersOnly = value.replace(/\D/g, '');
        const formattedValue = (Number(numbersOnly) / 100).toFixed(2);

        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], cost_cny: formattedValue };
        setData('items', newItems);
    };

    const { flash } = usePage().props;
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        if (flash?.success) {
            setAlertMessage(flash.success);
        }
    }, [flash]);

    const submit = (e) => {
        e.preventDefault();
        post('/finance/cabin-bom-cost', {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    setAlertMessage(page.props.flash.success);
                }
            },
            onError: (errors) => {
                console.error(errors);
                const firstError = Object.values(errors)[0];
                setAlertMessage(firstError || 'Validation error occurred.');
            }
        });
    };

    return (
        <AuthenticatedLayout
            title="Cabin BOM Cost (CNY)"
        >
            <Head title="Cabin BOM Cost (CNY)" />

            <FloatingAlert 
                type={alertMessage && alertMessage.includes('Error') || alertMessage && alertMessage.includes('error') ? 'error' : 'success'} 
                message={alertMessage} 
                onClose={() => setAlertMessage('')} 
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <CurrencyYenIcon className="w-8 h-8 text-emerald-600" />
                        Cabin BOM Cost
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage standard cost for Cabin BOM SKUs in CNY</p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search SKU or Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm shadow-sm"
                        />
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-colors"
                    >
                        Search
                    </button>
                </form>
            </div>

            <form onSubmit={submit}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/60">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Cost (CNY)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.length > 0 ? (
                                    data.items.map((formItem, index) => {
                                        const item = items[index];

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                                    {item.sku}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 uppercase">
                                                    {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-slate-500 sm:text-sm">¥</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={formItem.cost_cny}
                                                            onChange={(e) => handleCostChange(index, e.target.value)}
                                                            className="pl-7 block w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                            No cabin BOM items found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {items.length > 0 && (
                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={processing || !isDirty}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all ${
                                isDirty
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <DocumentCheckIcon className="w-5 h-5" />
                            {processing ? 'Saving...' : 'Save Costs'}
                        </button>
                    </div>
                )}
            </form>
        </AuthenticatedLayout>
    );
}
