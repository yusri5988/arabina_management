import { Head, Link, router } from '@inertiajs/react';
import QtyInput from '../../components/QtyInput.jsx';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const initialAlacarteLine = { item_id: '', quantity: '' };

const normalizeQuantity = (value) => Math.round(Number(value || 0) * 10) / 10;

export default function Stock({ items, packages, salesOrders = [], type = 'in', historyData = [] }) {
  const initialType = type === 'out' ? 'out' : 'in';
  const isOut = initialType === 'out';

  const [mode, setMode] = useState(isOut ? 'alacarte' : 'package');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [history, setHistory] = useState(historyData || []);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [doneConfirmed, setDoneConfirmed] = useState(false);
  const [showOutHistory, setShowOutHistory] = useState(false);
  const [showPendingDelivery, setShowPendingDelivery] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const endpoint = isOut ? '/items/stock/out/history' : '/items/stock/in/history';
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setHistory(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isOut]);

  useEffect(() => {
    if (!isOut) return;
    const partialDoneSuccess = window.sessionStorage.getItem('stock_out_partial_done_success');
    if (partialDoneSuccess === '1') {
      setNotification({ type: 'success', message: 'Partial delivery saved successfully.' });
      setShowOutHistory(true);
      setShowPendingDelivery(true);
      window.sessionStorage.removeItem('stock_out_partial_done_success');
    }
  }, [isOut]);

  const [packageData, setPackageData] = useState({
    package_id: packages?.[0]?.id?.toString() ?? '',
    package_quantity: '',
    sales_order_id: '',
    notes: '',
  });
  const [alacarteLines, setAlacarteLines] = useState(
    isOut
      ? []
      : [{ ...initialAlacarteLine, item_id: items?.[0]?.id?.toString() ?? '', quantity: '' }],
  );
  const [outAddSku, setOutAddSku] = useState({
    item_id: items?.[0]?.id?.toString() ?? '',
    quantity: '',
  });
  const noPackages = (packages?.length ?? 0) === 0;
  const noItems = (items?.length ?? 0) === 0;

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const itemStockById = useMemo(() => {
    const map = new Map();
    (items ?? []).forEach((item) => {
      map.set(String(item.id), Math.max(Number(item.stock_current_total ?? 0), 0));
    });
    return map;
  }, [items]);

  const outSelectableItems = useMemo(() => {
    if (!isOut) return items ?? [];
    return (items ?? []).filter((item) => Number(item.stock_current_total ?? 0) > 0);
  }, [isOut, items]);

  const selectedSalesOrder = useMemo(
    () => salesOrders.find((order) => String(order.id) === String(packageData.sales_order_id)),
    [salesOrders, packageData.sales_order_id],
  );

  const salesOrderDeliveryStatus = useMemo(() => {
    if (!isOut || !selectedSalesOrder) return [];

    return (selectedSalesOrder.pending_sku_lines ?? []).map((line) => ({
      key: `sku-${line.sku}`,
      label: `${line.sku ?? 'SKU'} - ${line.name ?? 'Item'}`,
      type: 'sku',
      ordered: Number(line.ordered_quantity ?? 0),
      shipped: Number(line.shipped_quantity ?? 0),
      remaining: Number(line.pending_quantity ?? 0),
    }));
  }, [isOut, selectedSalesOrder]);

  const pendingDeliveryStatus = useMemo(
    () => salesOrderDeliveryStatus.filter((entry) => Number(entry.remaining) > 0),
    [salesOrderDeliveryStatus],
  );

  const pendingSkuSummary = useMemo(
    () => pendingDeliveryStatus.map((entry) => entry.label).join(', '),
    [pendingDeliveryStatus],
  );

  useEffect(() => {
    if (!isOut) {
      return;
    }

    if (!selectedSalesOrder) {
      setAlacarteLines([]);
      return;
    }

    const autoLines = (selectedSalesOrder.pending_sku_lines ?? [])
      .map((line) => {
        const matchedItem = (items ?? []).find((item) => String(item.sku) === String(line.sku));
        if (!matchedItem) {
          return null;
        }

        const availableStock = Number(itemStockById.get(String(matchedItem.id)) ?? 0);
        const pendingQty = Number(line.pending_quantity ?? 0);
        const fillQty = Math.min(pendingQty, availableStock);

        if (fillQty <= 0) {
          return null;
        }

        return {
          item_id: String(matchedItem.id),
          quantity: String(fillQty),
        };
      })
      .filter(Boolean);

    setAlacarteLines(autoLines);
  }, [isOut, selectedSalesOrder, items, itemStockById]);

  useEffect(() => {
    if (!isOut) {
      return;
    }

    if ((outSelectableItems?.length ?? 0) === 0) {
      setOutAddSku({ item_id: '', quantity: '' });
      return;
    }

    setOutAddSku((prev) => {
      if (prev.item_id && outSelectableItems.some((item) => String(item.id) === String(prev.item_id))) {
        return prev;
      }

      return {
        ...prev,
        item_id: String(outSelectableItems[0].id),
      };
    });
  }, [isOut, outSelectableItems]);

  const addLine = () => {
    setAlacarteLines(prev => [...prev, { ...initialAlacarteLine }]);
  };

  const removeLine = (index) => {
    setAlacarteLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    setAlacarteLines(prev => prev.map((line, i) => {
      if (i !== index) return line;

      if (field === 'quantity') {
        const maxStock = Number(itemStockById.get(String(line.item_id)) ?? 0);
        const normalized = normalizeQuantity(Math.max(Math.min(Number(value || 0), maxStock), 0));
        return { ...line, quantity: String(normalized) };
      }

      return { ...line, [field]: value };
    }));
  };

  const addOutSkuLine = () => {
    const itemId = String(outAddSku.item_id || '');
    const qty = Number(outAddSku.quantity || 0);
    const availableStock = Number(itemStockById.get(itemId) ?? 0);

    if (!itemId || qty <= 0) {
      setNotification({ type: 'error', message: 'Please choose SKU and quantity for stock out.' });
      return;
    }

    if (availableStock <= 0) {
      setNotification({ type: 'error', message: 'Selected SKU has no stock.' });
      return;
    }

    setAlacarteLines((prev) => {
      const existingIndex = prev.findIndex((line) => String(line.item_id) === itemId);
      if (existingIndex >= 0) {
        return prev.map((line, index) => (
          index === existingIndex
            ? { ...line, quantity: String(normalizeQuantity(Math.min(Number(line.quantity || 0) + qty, availableStock))) }
            : line
        ));
      }

      return [...prev, { item_id: itemId, quantity: String(normalizeQuantity(Math.min(qty, availableStock))) }];
    });

    setOutAddSku((prev) => ({
      ...prev,
      quantity: '',
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    const completionAction = isOut
      ? (e?.nativeEvent?.submitter?.value || 'partial_done')
      : null;

    const endpoint = isOut ? '/items/stock/out' : '/items/stock/in';
    const payload = isOut
      ? {
        mode: 'alacarte',
        lines: alacarteLines.map(line => ({
          item_id: Number(line.item_id),
          quantity: Number(line.quantity),
        })),
        sales_order_id: Number(packageData.sales_order_id),
        completion_action: completionAction,
        done_confirmed: completionAction === 'done' ? doneConfirmed : true,
        notes: packageData.notes || null,
      }
      : mode === 'package'
        ? {
          mode: 'package',
          package_id: Number(packageData.package_id),
          package_quantity: Number(packageData.package_quantity),
          notes: packageData.notes || null,
        }
        : {
          mode: 'alacarte',
          lines: alacarteLines.map(line => ({
            item_id: Number(line.item_id),
            quantity: Number(line.quantity),
          })),
          notes: packageData.notes || null,
        };

    try {
      let currentCsrfToken = csrfToken;
      let attempt = 0;
      let response;
      while (attempt < 2) {
        response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': currentCsrfToken,
          },
          body: JSON.stringify(payload),
        });
        if (response.status === 419 && attempt === 0) {
          await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
          currentCsrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
          attempt++;
          continue;
        }
        break;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setNotification({ type: 'success', message: result.message ?? 'Transaction saved.' });
        setPackageData(prev => ({ ...prev, package_quantity: '', notes: '' }));
        setAlacarteLines(isOut ? [] : [{ ...initialAlacarteLine, item_id: items?.[0]?.id?.toString() ?? '' }]);
        if (isOut) {
          if (completionAction === 'partial_done') {
            window.sessionStorage.setItem('stock_out_partial_done_success', '1');
            router.reload();
            return;
          } else {
            router.reload();
            return;
          }
        } else {
          router.reload();
        }
      } else if (response.status === 422) {
        setErrors(result.errors ?? {});
      } else {
        setNotification({ type: 'error', message: result.message ?? `Error ${response.status}. Please try again.` });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title={isOut ? 'Delivery Order' : 'Stock In'} backUrl="__back__">
      <Head title={isOut ? 'Delivery Order' : 'Stock In'} />

      <div className="space-y-6">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              {isOut ? 'Delivery Order' : 'Stock In by Package / Ala Carte'}
            </h2>
            {isOut && (
              <Link
                href="/items/stock/out/delivery-orders"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                DO History List
              </Link>
            )}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-6">
            {!isOut && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('package')}
                  className={`py-2.5 rounded-xl text-sm font-bold border ${mode === 'package' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  Package
                </button>
                <button
                  type="button"
                  onClick={() => setMode('alacarte')}
                  className={`py-2.5 rounded-xl text-sm font-bold border ${mode === 'alacarte' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  Ala Carte SKU
                </button>
              </div>
            )}

            {isOut && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Sales Order</label>
                  <select
                    value={packageData.sales_order_id}
                    onChange={e => {
                      setNotification(null);
                      setDoneConfirmed(false);
                      setShowOutHistory(false);
                      setShowPendingDelivery(false);
                      setPackageData(prev => ({ ...prev, sales_order_id: e.target.value }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  >
                    <option value="">Select sales order</option>
                    {salesOrders.length === 0 && <option value="">No open sales order</option>}
                    {salesOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.code} - {order.customer_name} ({order.order_date})
                      </option>
                    ))}
                  </select>
                  {errors.sales_order_id && <p className="text-xs text-red-500 mt-1">{errors.sales_order_id[0]}</p>}
                  {salesOrders.length === 0 && <p className="text-xs text-amber-600 mt-1">Create sales order first before stock out.</p>}
                </div>

                {selectedSalesOrder && showPendingDelivery && (
                  <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pending Delivery Items</p>
                    {pendingDeliveryStatus.length > 0 && (
                      <p className="text-xs text-slate-600 mb-2">
                        Pending ({pendingDeliveryStatus.length}): {pendingSkuSummary}
                      </p>
                    )}

                    {pendingDeliveryStatus.length === 0 ? (
                      <p className="text-xs text-slate-500">All items have been delivered.</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingDeliveryStatus.map((entry) => (
                          <div key={entry.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                            <div className="font-bold text-slate-700">{entry.label}</div>
                            <div className="text-slate-600 mt-1">
                              Ordered: {entry.ordered} | Delivered: {entry.shipped} | Pending: {entry.remaining}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {!isOut && mode === 'package' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package</label>
                  <select
                    value={packageData.package_id}
                    onChange={e => setPackageData(prev => ({ ...prev, package_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  >
                    {packages.length === 0 && <option value="">No package available</option>}
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.code} - {pkg.name}
                      </option>
                    ))}
                  </select>
                  {errors.package_id && <p className="text-xs text-red-500 mt-1">{errors.package_id[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={packageData.package_quantity}
                    onChange={e => setPackageData(prev => ({ ...prev, package_quantity: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base font-bold text-right focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                    required
                  />
                  {errors.package_quantity && <p className="text-xs text-red-500 mt-1">{errors.package_quantity[0]}</p>}
                </div>
              </>
            )}

            {(isOut || mode === 'alacarte') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">SKU Lines</h3>
                  {!isOut && (
                    <button type="button" onClick={addLine} className="text-xs font-bold uppercase tracking-wider text-arabina-accent">
                      Add SKU
                    </button>
                  )}
                </div>

                {alacarteLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="col-span-8">
                      {isOut ? (
                        <div className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-700">
                          {items.find((x) => String(x.id) === String(line.item_id))?.sku} - {items.find((x) => String(x.id) === String(line.item_id))?.name}
                        </div>
                      ) : (
                        <select
                          value={line.item_id}
                          onChange={e => updateLine(index, 'item_id', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                          required
                        >
                          {items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="col-span-3">
                      <QtyInput
                        value={line.quantity}
                        onChange={(val) => updateLine(index, 'quantity', val)}
                        min={0.1}
                        max={Number(itemStockById.get(String(line.item_id)) ?? 0)}
                        step={0.1}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      {(isOut || alacarteLines.length > 1) && (
                        <button type="button" onClick={() => removeLine(index)} className="text-red-500 text-xs font-bold">
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(errors.lines || errors['lines.0.item_id'] || errors['lines.0.quantity']) && (
                  <p className="text-xs text-red-500">{errors.lines?.[0] ?? errors['lines.0.item_id']?.[0] ?? errors['lines.0.quantity']?.[0]}</p>
                )}
              </div>
            )}

            {isOut && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Add SKU for Stock Out</label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 md:col-span-8">
                    <select
                      value={outAddSku.item_id}
                      onChange={e => setOutAddSku(prev => ({ ...prev, item_id: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                    >
                      {outSelectableItems.length === 0 && <option value="">No SKU with stock</option>}
                      {outSelectableItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.name} (Stock: {Number(item.stock_current_total ?? 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-8 md:col-span-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={outAddSku.quantity}
                      onChange={e => setOutAddSku(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Qty"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-right focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <button
                      type="button"
                      onClick={addOutSkuLine}
                      className="w-full rounded-xl bg-slate-700 text-white py-2.5 text-sm font-bold hover:bg-slate-800"
                    >
                      Add SKU
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isOut && (
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={doneConfirmed}
                  onChange={(e) => setDoneConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                Confirm there are no further delivery orders for this sales order (required before marking as Done).
              </label>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Notes (Optional)</label>
              <textarea
                rows={3}
                value={packageData.notes}
                onChange={e => setPackageData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
              />
            </div>

            {isOut ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  value="partial_done"
                  disabled={
                    processing
                    || noItems
                    || (salesOrders?.length ?? 0) === 0
                    || alacarteLines.length === 0
                  }
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                >
                  {processing ? 'Saving...' : 'Partial Done'}
                </button>

                <button
                  type="submit"
                  value="done"
                  disabled={
                    processing
                    || noItems
                    || (salesOrders?.length ?? 0) === 0
                    || alacarteLines.length === 0
                    || !doneConfirmed
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                >
                  {processing ? 'Saving...' : 'Done'}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={
                  processing
                  || (mode === 'package' && noPackages)
                  || (mode === 'alacarte' && noItems)
                }
                className="w-full bg-[#1b580e] hover:bg-emerald-950 text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
              >
                {processing ? 'Saving...' : 'Submit Stock In'}
              </button>
            )}

          </form>
        </div>

        {isOut && showOutHistory && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Stock Out History (Delivery Orders)
              </h2>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="text-xs font-bold text-arabina-accent uppercase tracking-wider"
              >
                {loadingHistory ? 'Refreshing...' : 'Refresh History'}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">DO Code</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">SO / Customer</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Items Summary</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">DO Dates</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length === 0 && !loadingHistory && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic">
                        No delivery history found.
                      </td>
                    </tr>
                  )}
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-slate-700">{item.code}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700">{item.sales_order_code}</div>
                        <div className="text-xs text-slate-500">{item.customer_name}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 max-w-[200px] truncate" title={item.items_summary}>
                        {item.items_summary}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 max-w-[280px]">
                        {item.do_dates_text || item.created_at}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <a
                          href={`/items/stock/out/do/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isOut && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Stock In History
              </h2>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="text-xs font-bold text-arabina-accent uppercase tracking-wider"
              >
                {loadingHistory ? 'Refreshing...' : 'Refresh History'}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">ID</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Mode / Package</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Items Summary</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length === 0 && !loadingHistory && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic">
                        No stock in history found.
                      </td>
                    </tr>
                  )}
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-slate-700">#{item.id}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700">{item.mode}</div>
                        {item.package_name !== 'N/A' && <div className="text-xs text-slate-500">{item.package_name}</div>}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 max-w-[200px] truncate" title={item.items_summary}>
                        {item.items_summary}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {item.created_at}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {item.creator}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
