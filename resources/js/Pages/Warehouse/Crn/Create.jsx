import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../../lib/http';
import { TrashIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline/index.js';

export default function CrnCreate({ procurementOrders = [], items = [] }) {
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    procurement_order_id: '',
    received_at: new Date().toISOString().split('T')[0],
    remarks: '',
    items: [],
  });

  const procurementOrderMap = useMemo(
    () => Object.fromEntries((procurementOrders ?? []).map((po) => [String(po.id), po])),
    [procurementOrders],
  );

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: '',
          item_variant_id: '',
          expected_qty: 0,
          received_qty: 0,
          rejected_qty: 0,
          rejection_reason: '',
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;

    if (field === 'item_id') {
      const selectedItem = items.find((x) => x.id === parseInt(value));
      newItems[index].item_variant_id = selectedItem?.variants?.[0]?.id || '';
    }

    setForm((prev) => ({ ...prev, items: newItems }));
  };

  const handleProcurementOrderChange = (value) => {
    const selectedOrder = procurementOrderMap[String(value)];

    if (!selectedOrder) {
      setForm((prev) => ({
        ...prev,
        procurement_order_id: value,
        items: [],
      }));
      return;
    }

    const mappedItems = (selectedOrder.lines ?? []).map((line) => ({
      item_id: line.item_id,
      item_variant_id: line.item_variant_id ?? '',
      expected_qty: Number(line.remaining_qty ?? 0),
      received_qty: 0,
      rejected_qty: 0,
      rejection_reason: '',
      locked_from_po: true,
      sku: line.sku,
      name: line.name,
    }));

    setForm((prev) => ({
      ...prev,
      procurement_order_id: value,
      items: mappedItems,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    try {
      const { response, payload } = await apiFetchJson('/warehouse/crn', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      if (response.ok) {
        router.visit('/warehouse/crn');
      } else {
        setErrors(payload.errors || { message: payload.message });
      }
    } catch (_) {
      setErrors({ message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="Create CRN" backUrl="/warehouse/crn">
      <Head title="Create CRN" />

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
            CRN General Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Linked Procurement Order (Optional)
              </label>
              <select
                value={form.procurement_order_id}
                onChange={(e) => handleProcurementOrderChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
              >
                <option value="">None / Standalone</option>
                {procurementOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.code}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Received Date
              </label>
              <input
                type="date"
                required
                value={form.received_at}
                onChange={(e) => setForm({ ...form, received_at: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Remarks / Notes
              </label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Container number, seal status, etc."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none h-24"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Received Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              disabled={Boolean(form.procurement_order_id)}
              className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
              Add Item
            </button>
          </div>

          {form.items.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-sm text-slate-400 font-medium">No items added yet. Click "Add Item" to start.</p>
            </div>
          )}

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={index} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item / SKU</label>
                    {item.locked_from_po ? (
                      <div className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700">
                        {item.sku} - {item.name}
                      </div>
                    ) : (
                      <select
                        required
                        value={item.item_id}
                        onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none bg-white"
                      >
                        <option value="">Select Item</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={item.locked_from_po}
                    className="mt-6 text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Qty</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.expected_qty}
                      onChange={(e) => updateItem(index, 'expected_qty', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Received Qty</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.received_qty}
                      onChange={(e) => updateItem(index, 'received_qty', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected Qty</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.rejected_qty}
                      onChange={(e) => updateItem(index, 'rejected_qty', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none bg-white"
                    />
                  </div>
                </div>

                {parseInt(item.rejected_qty) > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejection Reason</label>
                    <input
                      type="text"
                      placeholder="Damaged, wrong SKU, etc."
                      value={item.rejection_reason}
                      onChange={(e) => updateItem(index, 'rejection_reason', e.target.value)}
                      className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {errors.message && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
            {errors.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.visit('/warehouse/crn')}
            className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing || form.items.length === 0}
            className="flex items-center gap-2 bg-[#1E3D1A] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-emerald-900 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            {processing ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              'Save CRN Draft'
            )}
          </button>
        </div>
      </form>
    </AuthenticatedLayout>
  );
}
