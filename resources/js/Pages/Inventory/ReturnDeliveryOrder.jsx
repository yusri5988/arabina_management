import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

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
    const qty = Number(raw || 0);
    if (qty < 1) {
      setNotice({ type: 'error', message: `Masukkan qty untuk ${line.sku}.` });
      return;
    }
    if (qty > Number(line.remaining_quantity || 0)) {
      setNotice({ type: 'error', message: `Qty return melebihi baki untuk ${line.sku}.` });
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
      setNotice({ type: 'error', message: 'Return list masih kosong.' });
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
        setNotice({ type: 'error', message: result.message ?? 'Gagal submit return SKU.' });
        return;
      }

      setNotice({ type: 'success', message: result.message ?? 'Return SKU berjaya.' });
      setReturnMap({});
      router.visit('/items/stock/out/delivery-orders');
    } catch (error) {
      setNotice({ type: 'error', message: 'Network error. Sila cuba lagi.' });
    } finally {
      setProcessing(false);
    }
  };

  const selectedRows = Object.values(returnMap);

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

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">DO SKU List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
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
                {skuLines.map((line) => (
                  <tr key={line.item_id}>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-bold text-slate-800">{line.sku}</div>
                      <div className="text-slate-500">{line.name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-slate-700">{line.shipped_quantity}</td>
                    <td className="px-4 py-3 text-xs text-right text-slate-700">{line.returned_quantity}</td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-slate-800">{line.remaining_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="1"
                        max={line.remaining_quantity}
                        value={inputMap[line.item_id] ?? ''}
                        onChange={(e) => setInputMap((prev) => ({ ...prev, [line.item_id]: e.target.value }))}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-right font-semibold focus:ring-0"
                        placeholder="Qty"
                        disabled={Number(line.remaining_quantity) <= 0}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => addToReturnList(line)}
                        disabled={Number(line.remaining_quantity) <= 0}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Add to Return List
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Return List</h3>
            <button
              type="button"
              onClick={submitReturn}
              disabled={processing || selectedRows.length === 0}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processing ? 'Submitting...' : 'Submit Return'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty Return</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {selectedRows.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-xs text-slate-500">
                      Belum ada SKU dalam return list.
                    </td>
                  </tr>
                )}
                {selectedRows.map((line) => (
                  <tr key={line.item_id}>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-bold text-slate-800">{line.sku}</div>
                      <div className="text-slate-500">{line.name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-slate-800">{line.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeFromReturnList(line.item_id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

