import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';
import FloatingAlert from '../../components/FloatingAlert';
import { CurrencyDollarIcon, DocumentCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline/index.js';

export default function CostManagement({ pendingCosts = [] }) {
  const [notification, setNotification] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('');

  const refreshPage = () => window.location.reload();
  const numericExchangeRate = Number(exchangeRate);
  const hasValidExchangeRate = Number.isFinite(numericExchangeRate) && numericExchangeRate > 0;
  const rowsMissingCnyCost = useMemo(
    () => pendingCosts.filter((layer) => Number(layer.cost_cny || 0) <= 0),
    [pendingCosts],
  );
  const totalConvertedCost = useMemo(() => {
    if (!hasValidExchangeRate) {
      return 0;
    }

    return pendingCosts.reduce((total, layer) => {
      const costCny = Number(layer.cost_cny || 0);
      return costCny > 0 ? total + (costCny * numericExchangeRate) : total;
    }, 0);
  }, [hasValidExchangeRate, numericExchangeRate, pendingCosts]);

  const formatMoney = (value, currency = 'MYR') => {
    const numericValue = Number(value || 0);

    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(numericValue) ? numericValue : 0);
  };

  const submitCosts = async () => {
    if (!hasValidExchangeRate) {
      setNotification({ type: 'error', message: 'Please enter a valid CNY to MYR exchange rate.' });
      return;
    }

    if (rowsMissingCnyCost.length > 0) {
      const skuList = rowsMissingCnyCost
        .slice(0, 3)
        .map((layer) => layer.sku)
        .filter(Boolean)
        .join(', ');
      const suffix = rowsMissingCnyCost.length > 3 ? ` and ${rowsMissingCnyCost.length - 3} more` : '';

      setNotification({
        type: 'error',
        message: `Please update CNY cost for ${skuList || 'the highlighted SKUs'}${suffix} before submitting.`,
      });
      return;
    }

    setProcessing(true);
    try {
      const { response, payload } = await apiFetchJson('/finance/costs/bulk', {
        method: 'POST',
        body: JSON.stringify({
          exchange_rate: numericExchangeRate,
          layer_ids: pendingCosts.map((layer) => layer.id),
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message || 'Cost entries updated successfully.' });
      } else if (response.status === 422) {
        const firstError = Object.values(payload.errors ?? {})?.[0]?.[0];
        setNotification({ type: 'error', message: firstError ?? payload.message ?? 'Please check the highlighted fields.' });
      } else {
        setNotification({ type: 'error', message: payload.message || 'Failed to update cost entries.' });
      }
    } catch (e) {
      setNotification({ type: 'error', message: 'Network error occurred.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="Cost Management" backUrl="__back__">
      <Head title="Cost Management" />
      <div className="space-y-6">
        <FloatingAlert
          type={notification?.type}
          message={notification?.message}
          onClose={() => {
            setNotification(null);
            if (notification?.type === 'success') {
              refreshPage();
            }
          }}
        />

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CurrencyDollarIcon className="w-6 h-6" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Pending Cost Entry</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Manage unit costs for items received from warehouse. These costs will update the inventory valuation.
                  </p>
                </div>
              </div>

              {pendingCosts.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Exchange Rate (1 CNY = MYR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      placeholder="e.g. 0.650000"
                      className="w-48 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                    />
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 min-w-[170px]">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total MYR</p>
                    <p className="text-sm font-black text-slate-800">{formatMoney(totalConvertedCost)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-0">
            {pendingCosts.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <InformationCircleIcon className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No Pending Costs</h3>
                <p className="text-slate-500 text-sm mt-1">All received items have been costed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-y border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Ref</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Item</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty Received</th>
                      <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-right">Cost CNY</th>
                      <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-right">Converted Cost MYR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingCosts.map(layer => {
                      const costCny = Number(layer.cost_cny || 0);
                      const convertedCost = hasValidExchangeRate && costCny > 0
                        ? costCny * numericExchangeRate
                        : null;

                      return (
                        <tr key={layer.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-800">{layer.received_at}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{layer.transaction_notes}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-800">{layer.sku}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{layer.name}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                              {layer.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {costCny > 0 ? (
                              <span className="text-xs font-black text-slate-800">{formatMoney(costCny, 'CNY')}</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-600">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-slate-800">
                              {convertedCost === null ? '-' : formatMoney(convertedCost)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {pendingCosts.length} pending cost {pendingCosts.length === 1 ? 'entry' : 'entries'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Costs will be saved as MYR using each SKU CNY cost and the exchange rate above.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={submitCosts}
                    disabled={processing || pendingCosts.length === 0}
                    className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-md active:scale-95"
                  >
                    <DocumentCheckIcon className="h-5 w-5" />
                    {processing ? 'Submitting...' : 'Submit Costs'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
