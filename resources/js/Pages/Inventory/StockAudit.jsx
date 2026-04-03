import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

export default function StockAudit({ items = [], auditHistories = [] }) {
    const [lines, setLines] = useState(
        (items ?? []).map((item) => ({
            item_id: item.item_id,
            audited_stock: null,
        })),
    );
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [notification, setNotification] = useState(null);

    const lineMap = useMemo(() => {
        const map = new Map();
        lines.forEach((line) => map.set(String(line.item_id), line.audited_stock));
        return map;
    }, [lines]);

    const BOM_LABELS = {
        cabin: 'Cabin',
        hardware: 'Hardware',
        hardware_site: 'Hardware Site',
    };

    const groupedItems = useMemo(() => {
        const groups = {};
        (items ?? []).forEach((item) => {
            const scope = item.bom_scope || 'unknown';
            if (!groups[scope]) groups[scope] = [];
            groups[scope].push(item);
        });
        const order = ['cabin', 'hardware', 'hardware_site'];
        const sorted = [];
        order.forEach((key) => {
            if (groups[key]) sorted.push([key, groups[key]]);
        });
        Object.keys(groups).forEach((key) => {
            if (!order.includes(key)) sorted.push([key, groups[key]]);
        });
        return sorted;
    }, [items]);

    const updateAuditedStock = (itemId, value) => {
        if (value === '') {
            setLines((prev) => prev.map((line) => (
                String(line.item_id) === String(itemId)
                    ? { ...line, audited_stock: null }
                    : line
            )));
            return;
        }

        const qty = Math.max(Number(value || 0), 0);
        setLines((prev) => prev.map((line) => (
            String(line.item_id) === String(itemId)
                ? { ...line, audited_stock: qty }
                : line
        )));
    };

    const submitAudit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setNotification(null);

        const payload = {
            notes: notes || null,
            lines: lines.map((line) => ({
                item_id: Number(line.item_id),
                audited_stock: Number(line.audited_stock),
            })),
        };

        const { response, payload: result } = await apiFetchJson('/items/stocks/audit', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            setNotification({ type: 'success', message: result.message ?? 'Stock audit saved.' });
            setNotes('');
            router.visit('/items/stocks');
        } else if (response.status === 422) {
            setErrors(result.errors ?? {});
        } else {
            setNotification({ type: 'error', message: result.message ?? 'Failed to save stock audit.' });
        }

        setProcessing(false);
    };

    const downloadAuditPdf = (auditId = null) => {
        const query = auditId ? `?audit_id=${auditId}` : '';
        window.location.href = `/items/stocks/audit/pdf${query}`;
    };

    return (
        <AuthenticatedLayout title="Stock Audit" backUrl="/items/stocks">
            <Head title="Stock Audit" />

            <div className="space-y-6">
                {notification && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={submitAudit} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800">Current Stock vs Audited Stock</h2>

                    {groupedItems.map(([bomScope, groupItems]) => (
                        <div key={bomScope} className="space-y-2">
                            <h3 className="text-sm font-bold text-white bg-slate-700 rounded-xl px-4 py-2 uppercase tracking-wide">
                                {BOM_LABELS[bomScope] || bomScope}
                            </h3>
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs">SKU</th>
                                            <th className="px-3 py-2 text-left text-xs">Item</th>
                                            <th className="px-3 py-2 text-right text-xs">Current</th>
                                            <th className="px-3 py-2 text-right text-xs">Audited</th>
                                            <th className="px-3 py-2 text-right text-xs">Difference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {groupItems.map((item) => {
                                            const current = Number(item.stock_current ?? 0);
                                            const rawAudited = lineMap.get(String(item.item_id));
                                            const audited = rawAudited ?? '';
                                            const diff = audited === '' ? null : Number(audited) - current;

                                            return (
                                                <tr key={item.item_id}>
                                                    <td className="px-3 py-2 text-xs font-bold text-slate-700">{item.sku}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-700">{item.name}</td>
                                                    <td className="px-3 py-2 text-sm text-right">{current}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={audited}
                                                            onChange={(e) => updateAuditedStock(item.item_id, e.target.value)}
                                                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                                                        />
                                                    </td>
                                                    <td className={`px-3 py-2 text-sm text-right font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                        {diff === null ? '-' : diff}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes[0]}</p>}
                        {errors.lines && <p className="text-xs text-red-500 mt-1">{errors.lines[0]}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-2xl bg-[#1b580e] text-white py-3 text-sm font-bold disabled:opacity-50"
                    >
                        {processing ? 'Saving...' : 'Submit Stock Audit'}
                    </button>
                </form>

                {auditHistories.length > 0 && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-3">
                        <h3 className="text-base font-bold text-slate-800">Audit History</h3>
                        <p className="text-xs text-slate-500">Click Open to view audit details. Each audit includes a PDF download button.</p>

                        <div className="space-y-3">
                            {auditHistories.map((history) => (
                                <details key={history.id} className="border border-slate-200 rounded-2xl p-3">
                                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                Audit #{history.id} - {history.audited_at}
                                            </p>
                                            <p className="text-xs text-slate-500">{history.auditor ?? 'Unknown'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    downloadAuditPdf(history.id);
                                                }}
                                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                                            >
                                                Download PDF
                                            </button>
                                            <span className="text-xs font-bold text-emerald-700">Open</span>
                                        </div>
                                    </summary>

                                    <div className="mt-3 space-y-3">
                                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                            <table className="min-w-full divide-y divide-slate-100">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs">SKU</th>
                                                        <th className="px-3 py-2 text-right text-xs">Before</th>
                                                        <th className="px-3 py-2 text-right text-xs">Audited</th>
                                                        <th className="px-3 py-2 text-right text-xs">Short</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {(history.lines ?? []).map((line) => (
                                                        <tr key={`${history.id}-${line.item_id}`}>
                                                            <td className="px-3 py-2 text-xs font-bold text-slate-700">{line.sku}</td>
                                                            <td className="px-3 py-2 text-sm text-right">{line.stock_before}</td>
                                                            <td className="px-3 py-2 text-sm text-right">{line.audited_stock}</td>
                                                            <td className={`px-3 py-2 text-sm text-right font-bold ${Number(line.short_quantity) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                {line.short_quantity}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
