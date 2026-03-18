import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const normalizeQuantity = (value) => Math.round(Number(value || 0) * 10) / 10;

const formatQuantity = (value) => {
  const numeric = Number(value || 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const BOM_GROUPS = [
  { key: 'cabin', label: 'BOM Cabin' },
  { key: 'hardware', label: 'BOM Hardware' },
  { key: 'hardware_site', label: 'BOM Hardware Site' },
];

export default function ReturnDeliveryOrder({ order, skuLines = [] }) {
  const [returnMap, setReturnMap] = useState({});
  const [inputMap, setInputMap] = useState({});
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState(null);
  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const addToReturnList = (line) => {
    const raw = inputMap[line.item_id];
    const qty = normalizeQuantity(raw || 0);
    if (qty <= 0) {
      setNotice({ type: 'error', message: `Please enter quantity for ${line.sku}.` });
      return;
    }
    if (qty > Number(line.remaining_quantity || 0)) {
      setNotice({ type: 'error', message: `Return quantity exceeds remaining for ${line.sku}.` });
      return;
    }

    setReturnMap((prev) => ({
      ...prev,
      [line.item_id]: {
        item_id: line.item_id,
        sku: line.sku,
        name: line.name,
        quantity: qty,
      },
    }));
    setNotice(null);
  };

  const removeFromReturnList = (itemId) => {
    setReturnMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const submitReturn = async () => {
    const lines = Object.values(returnMap).map((line) => ({
      item_id: Number(line.item_id),
      quantity: Number(line.quantity),
    }));

    if (lines.length === 0) {
      setNotice({ type: 'error', message: 'Return list is empty.' });
      return;
    }

    setProcessing(true);
    setNotice(null);

    try {
      const response = await fetch(`/items/stock/out/do/${order.id}/return-items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ lines }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ type: 'error', message: result.message ?? 'Failed to submit return SKU.' });
        return;
      }

      setNotice({ type: 'success', message: result.message ?? 'Return SKU submitted successfully.' });
      setReturnMap({});
      router.visit('/items/stock/out/delivery-orders');
    } catch (error) {
      setNotice({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const selectedRows = Object.values(returnMap);
  const groupedSkuLines = useMemo(() => {
    return BOM_GROUPS.map((group) => ({
      ...group,
      rows: skuLines.filter((line) => String(line.bom_scope ?? 'hardware') === group.key),
    }));
  }, [skuLines]);

  const groupedSelectedRows = useMemo(() => {
    return BOM_GROUPS.map((group) => ({
      ...group,
      rows: selectedRows.filter((line) => String(line.bom_scope ?? 'hardware') === group.key),
    }));
  }, [selectedRows]);

  return (
    <AuthenticatedLayout title="Return Delivery Order" backUrl="/items/stock/out/delivery-orders">
      <Head title={`Return ${order?.code ?? 'DO'}`} />

      <div className="space-y-5">
        <div className="bg-white rounded-3xl border border-slate-100 p-5">
          <h2 className="text-lg font-black text-slate-800">{order?.code}</h2>
          <p className="text-xs text-slate-500">SO: {order?.sales_order_code} | Customer: {order?.customer_name}</p>
        </div>

        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {notice.message}
          </div>
        )}

        {/* Unified Box for DO SKU List and Return List */}
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          {/* Section 1: DO SKU List */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              DO SKU List
            </h3>
          </div>
          <div className="space-y-5 p-5">
            {groupedSkuLines.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{group.label}</h4>
                  <span className="text-[10px] font-bold text-slate-400">{group.rows.length} SKU</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shipped</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Returned</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return Qty</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {group.rows.length > 0 ? group.rows.map((line) => (
                        <tr key={line.item_id}>
                          <td className="px-4 py-3 text-xs text-slate-700">
                            <div className="font-bold text-slate-800">{line.sku}</div>
                            <div className="text-slate-500 italic">{line.name}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-right text-slate-700">{formatQuantity(line.shipped_quantity)}</td>
                          <td className="px-4 py-3 text-xs text-right text-slate-700">{formatQuantity(line.returned_quantity)}</td>
                          <td className="px-4 py-3 text-xs text-right font-bold text-slate-800">{formatQuantity(line.remaining_quantity)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = Number(inputMap[line.item_id] || 0);
                                  if (current > 0) {
                                    setInputMap((prev) => ({
                                      ...prev,
                                      [line.item_id]: normalizeQuantity(Math.max(current - 0.5, 0)),
                                    }));
                                  }
                                }}
                                disabled={Number(line.remaining_quantity) <= 0}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                max={line.remaining_quantity}
                                value={inputMap[line.item_id] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === ''
                                    ? ''
                                    : normalizeQuantity(Math.min(Math.max(0, Number(e.target.value)), line.remaining_quantity));
                                  setInputMap((prev) => ({ ...prev, [line.item_id]: val }));
                                }}
                                className="w-14 h-8 rounded-lg border border-slate-200 px-1 py-1 text-xs text-center font-bold text-slate-700 focus:ring-0 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="Qty"
                                disabled={Number(line.remaining_quantity) <= 0}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const current = Number(inputMap[line.item_id] || 0);
                                  if (current < Number(line.remaining_quantity)) {
                                    setInputMap((prev) => ({
                                      ...prev,
                                      [line.item_id]: normalizeQuantity(Math.min(current + 0.5, Number(line.remaining_quantity))),
                                    }));
                                  }
                                }}
                                disabled={Number(line.remaining_quantity) <= 0}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => addToReturnList(line)}
                              disabled={Number(line.remaining_quantity) <= 0}
                              className="rounded-lg border border-red-600 bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-xs text-slate-400 italic">No SKU in {group.label.toLowerCase()}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Section 2: Return List */}
          <div className="px-5 py-4 border-y border-slate-100 bg-slate-50/30">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              Return List Preview
            </h3>
          </div>
          <div className="min-h-[100px] space-y-5 p-5">
            {groupedSelectedRows.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{group.label}</h4>
                  <span className="text-[10px] font-bold text-slate-400">{group.rows.length} SKU</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty to Return</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {group.rows.length > 0 ? group.rows.map((line) => (
                        <tr key={line.item_id} className="bg-amber-50/10">
                          <td className="px-4 py-3 text-xs text-slate-700">
                            <div className="font-bold text-slate-800">{line.sku}</div>
                            <div className="text-slate-500 italic">{line.name}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-right font-black text-slate-900">{formatQuantity(line.quantity)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeFromReturnList(line.item_id)}
                              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="3" className="px-4 py-8 text-center text-xs text-slate-400 italic">No items in {group.label.toLowerCase()}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {selectedRows.length === 0 && (
              <div className="text-center text-xs text-slate-400 italic py-2">
                No items in return list. Click "Add" above.
              </div>
            )}
          </div>

          {/* Footer: Unified Submit Button */}
          <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
            <button
              type="button"
              onClick={submitReturn}
              disabled={processing || selectedRows.length === 0}
              className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Please Wait...</span>
                </>
              ) : (
                <span>Submit Return Now</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
