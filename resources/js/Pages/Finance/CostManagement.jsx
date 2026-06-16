import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import QtyInput from '../../components/QtyInput';
import { apiFetchJson } from '../../lib/http';
import FloatingAlert from '../../components/FloatingAlert';
import { CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline/index.js';

export default function CostManagement({ pendingCosts = [] }) {
  const [notification, setNotification] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [forms, setForms] = useState({});
  const [errors, setErrors] = useState({});

  const refreshPage = () => window.location.reload();

  const handleValueChange = (layerId, field, value) => {
    setForms(prev => {
      const existing = prev[layerId] || { unit_cost: '', currency: 'MYR', exchange_rate: '', invoice_number: '' };
      return { ...prev, [layerId]: { ...existing, [field]: value } };
    });
  };

  const submitCost = async (layer) => {
    const current = forms[layer.id];
    if (!current || current.unit_cost === '' || Number(current.unit_cost) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid unit cost.' });
      return;
    }

    if ((current.currency || 'MYR') !== 'MYR' && (current.exchange_rate === '' || Number(current.exchange_rate) <= 0)) {
      setErrors({ exchange_rate: ['Exchange rate is required for foreign currency.'] });
      setNotification({ type: 'error', message: 'Please enter exchange rate for foreign currency.' });
      return;
    }

    setProcessingId(layer.id);
    setErrors({});
    try {
      const { response, payload } = await apiFetchJson(`/finance/costs/${layer.id}`, {
        method: 'POST',
        body: JSON.stringify({
          unit_cost: Number(current.unit_cost),
          currency: current.currency || 'MYR',
          exchange_rate: current.exchange_rate !== '' ? Number(current.exchange_rate) : null,
          invoice_number: current.invoice_number || null,
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: 'Cost updated successfully.' });
      } else if (response.status === 422) {
        setErrors(payload.errors ?? {});
        setNotification({ type: 'error', message: payload.message ?? 'Please check the highlighted fields.' });
      } else {
        setNotification({ type: 'error', message: payload.message });
      }
    } catch (e) {
      setNotification({ type: 'error', message: 'Network error occurred.' });
    } finally {
      setProcessingId(null);
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
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-y border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Ref</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Item</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty Received</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                      <th className="px-4 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-4 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider">Currency</th>
                      <th className="px-4 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider">Exch. Rate</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingCosts.map(layer => {
                      const current = forms[layer.id] || {
                        unit_cost: '',
                        currency: layer.currency || 'MYR',
                        exchange_rate: layer.exchange_rate ?? '',
                        invoice_number: layer.invoice_number ?? '',
                      };
                      const exchangeRateRequired = current.currency !== 'MYR';
                      const saveDisabled = processingId === layer.id
                        || (exchangeRateRequired && (current.exchange_rate === '' || Number(current.exchange_rate) <= 0));

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
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={current.invoice_number}
                              onChange={(e) => handleValueChange(layer.id, 'invoice_number', e.target.value)}
                              placeholder="Invoice"
                              className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="w-24">
                              <QtyInput 
                                value={current.unit_cost} 
                                onChange={(val) => handleValueChange(layer.id, 'unit_cost', val)} 
                                min={0} 
                                step={0.01} 
                                className="!rounded-xl !border-slate-200 focus:!border-emerald-500 focus:!ring-emerald-500/20 font-bold text-slate-800 shadow-sm hover:!border-slate-300"
                              />
                              {errors.unit_cost && <p className="mt-1 text-[10px] font-semibold text-red-500">{errors.unit_cost[0]}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={current.currency}
                              onChange={(e) => handleValueChange(layer.id, 'currency', e.target.value)}
                              className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-700 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                            >
                              <option value="MYR">MYR</option>
                              <option value="USD">USD</option>
                              <option value="CNY">CNY</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            {current.currency !== 'MYR' ? (
                              <div className="w-20">
                                <QtyInput 
                                  value={current.exchange_rate} 
                                  onChange={(val) => handleValueChange(layer.id, 'exchange_rate', val)} 
                                  min={0} 
                                  step={0.000001} 
                                  className="!rounded-xl !border-slate-200 focus:!border-emerald-500 focus:!ring-emerald-500/20 font-medium shadow-sm hover:!border-slate-300"
                                />
                                {errors.exchange_rate && <p className="mt-1 text-[10px] font-semibold text-red-500">{errors.exchange_rate[0]}</p>}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic block text-center">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => submitCost(layer)}
                              disabled={saveDisabled}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-800 text-white text-xs font-black px-4 py-2 hover:bg-slate-900 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none transition-all active:scale-95 shadow-md uppercase tracking-wider min-w-[80px]"
                            >
                              {processingId === layer.id ? 'Saving...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
