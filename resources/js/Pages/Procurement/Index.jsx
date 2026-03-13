import { Head, usePage, Link } from '@inertiajs/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

const BOM_GROUPS = [
  { key: 'cabin', label: 'BOM Cabin' },
  { key: 'hardware', label: 'BOM Hardware' },
  { key: 'hardware_site', label: 'BOM Hardware Site' },
];
const PROCUREMENT_FLOWS = {
  cabin: {
    key: 'cabin',
    label: 'BOM Cabin',
    basePath: '/procurement/cabin',
    receivingLabel: 'Container Receiving Notes (CRN)',
    supportsCrn: true,
  },
  hardware: {
    key: 'hardware',
    label: 'BOM Hardware',
    basePath: '/procurement/hardware',
    receivingLabel: 'Material Receiving Notes',
    supportsCrn: false,
  },
  hardware_site: {
    key: 'hardware_site',
    label: 'BOM Hardware Site',
    basePath: '/procurement/hardware-site',
    receivingLabel: 'Site Receiving Notes',
    supportsCrn: false,
  },
};

const detectFlowFromPath = (path) => {
  if (path.startsWith('/procurement/hardware-site')) return PROCUREMENT_FLOWS.hardware_site;
  if (path.startsWith('/procurement/hardware')) return PROCUREMENT_FLOWS.hardware;
  return PROCUREMENT_FLOWS.cabin;
};

const getOrderPackageLines = (order) => order.packageLines ?? order.package_lines ?? [];
const getOrderLines = (order) => order.lines ?? [];

const computeLooseLines = (order) => {
  const pkgLines = getOrderPackageLines(order);
  const ordLines = getOrderLines(order);

  return ordLines
    .map((line) => {
      let looseQty = Number(line.ordered_quantity || 0);

      pkgLines.forEach((pLine) => {
        const pkg = pLine.package;
        if (!pkg) return;

        const pItems = pkg.packageItems || pkg.package_items || [];
        const pItem = pItems.find((pi) => Number(pi.item_id) === Number(line.item_id));

        if (pItem) {
          const qtyInPkg = Number(pItem.quantity || 0);
          const pkgOrderQty = Number(pLine.quantity || 0);
          looseQty -= pkgOrderQty * qtyInPkg;
        }
      });

      return { ...line, looseQty };
    })
    .filter((line) => line.looseQty > 0);
};

const CustomSelect = ({ value, onChange, options, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white text-left transition-all hover:border-slate-300 shadow-sm"
      >
        <span className={selectedOption ? "font-bold text-slate-700" : "text-slate-400 font-medium"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-slate-50">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-arabina-accent/20 bg-slate-50"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-xs text-left transition-colors hover:bg-slate-50 flex items-center justify-between ${value === option.value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
                    }`}
                >
                  {option.label}
                  {value === option.value && (
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-xs text-slate-400 italic text-center">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ProcurementIndex({
  databaseReady = true,
  canManage = false,
  canReceive = false,
  orders = [],
  items = [],
  packages = [],
  suppliers = [],
  packageAvailability = {},
  suggestion = { package_lines: [], sku_lines: [], source_orders: [] }
}) {
  const page = usePage();
  const currentPath = String(page?.url ?? '/procurement').split('?')[0];
  const activeFlow = useMemo(() => detectFlowFromPath(currentPath), [currentPath]);

  const suppliersLink = (
    <Link
      href="/procurement/suppliers"
      className="text-[10px] font-black text-white bg-[#10b981] !bg-emerald-500 px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all uppercase tracking-[0.15em] shadow-xl shadow-emerald-500/30 flex items-center gap-2 border border-emerald-400/30 ring-4 ring-emerald-500/10"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
      Manage Suppliers
    </Link>
  );

  const orderApiBase = `${activeFlow.basePath}/orders`;
  const scopedBomGroups = useMemo(
    () => BOM_GROUPS.filter((group) => group.key === activeFlow.key),
    [activeFlow.key]
  );
  const scopedItems = useMemo(
    () => (Array.isArray(items) ? items : []).filter((item) => String(item.bom_scope ?? 'hardware') === activeFlow.key),
    [items, activeFlow.key]
  );
  const itemScopeById = useMemo(
    () => new Map((Array.isArray(items) ? items : []).map((item) => [Number(item.id), String(item.bom_scope ?? 'hardware')])),
    [items]
  );
  const scopedSuggestion = useMemo(() => ({
    package_lines: (suggestion?.package_lines ?? [])
      .map((line) => ({
        ...line,
        boms: (line?.boms ?? []).filter((bom) => String(bom?.type) === activeFlow.key),
      }))
      .filter((line) => (line?.boms ?? []).length > 0),
    sku_lines: (suggestion?.sku_lines ?? []).filter(
      (line) => itemScopeById.get(Number(line?.item_id)) === activeFlow.key
    ),
    source_orders: suggestion?.source_orders ?? [],
  }), [suggestion, activeFlow.key, itemScopeById]);

  const [notification, setNotification] = useState(null);
  const [processingCreate, setProcessingCreate] = useState(false);
  const [processingDeleteId, setProcessingDeleteId] = useState(null);
  const [list, setList] = useState(orders);
  const [expandedReceiveForms, setExpandedReceiveForms] = useState({});

  const [newOrderPackageLines, setNewOrderPackageLines] = useState([]);
  const [newOrderSkuLines, setNewOrderSkuLines] = useState([]);
  const [newOrderPoNumber, setNewOrderPoNumber] = useState('');
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [skuSuppliers, setSkuSuppliers] = useState({}); // { item_id: supplier_id }
  const [newOrderAddPackageForm, setNewOrderAddPackageForm] = useState({ package_id: null, quantity: '' });
  const [newOrderAddSkuForm, setNewOrderAddSkuForm] = useState({ item_id: null, quantity: '' });

  const normalizeSkuQuantity = (value) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return Math.round(numeric * 10) / 10;
  };

  const toggleReceiveForm = (orderId) => {
    setExpandedReceiveForms((prev) => ({
      ...prev,
      [orderId]: !prev?.[orderId],
    }));
  };

  const handlePackageSelect = (packageId) => {
    const pkg = (Array.isArray(packages) ? packages : []).find(p => p.id === Number(packageId));
    if (pkg) {
      setNewOrderPackageLines(prev => [...prev, { package_id: pkg.id, quantity: 1, package_code: pkg.code, package_name: pkg.name }]);
    }
  };

  const handleSkuSelect = (itemId) => {
    const item = (Array.isArray(items) ? items : []).find(i => i.id === Number(itemId));
    if (item) {
      setNewOrderSkuLines((prev) => {
        const existing = prev.find((line) => line.item_id === item.id);

        if (existing) {
          return prev.map((line) => (
            line.item_id === item.id
              ? { ...line, quantity: normalizeSkuQuantity(line.quantity) + 1 }
              : line
          ));
        }

        return [...prev, { item_id: item.id, quantity: 1, sku: item.sku, name: item.name, unit: item.unit || 'pcs' }];
      });
    }
  };

  const updateNewOrderSkuUnit = (itemId, unit) => {
    setNewOrderSkuLines((prev) => {
      const existing = prev.find((line) => line.item_id === itemId);
      const item = (Array.isArray(items) ? items : []).find((row) => row.id === Number(itemId));

      if (existing) {
        return prev.map((line) => (line.item_id === itemId ? { ...line, unit } : line));
      }

      return [
        ...prev,
        {
          item_id: Number(itemId),
          quantity: 0,
          sku: item?.sku,
          name: item?.name,
          unit,
        },
      ];
    });
  };

  const removeNewOrderSkuLine = (itemId) => {
    setNewOrderSkuLines(prev => prev.filter(l => l.item_id !== itemId));
  };

  const updateNewOrderPackageQuantity = (index, delta) => {
    setNewOrderPackageLines(prev => prev.map((line, i) => {
      if (i === index) {
        return { ...line, quantity: Math.max(1, line.quantity + delta) };
      }
      return line;
    }));
  };

  const handleSkuSupplierChange = (itemId, supplierId) => {
    setSkuSuppliers(prev => ({ ...prev, [itemId]: supplierId }));
  };

  const packageDerivedSkus = useMemo(() => {
    const map = new Map();

    (newOrderPackageLines ?? []).forEach((pLine) => {
      const pkg = (Array.isArray(packages) ? packages : []).find(p => p.id === pLine.package_id);
      if (!pkg) return;

      const scopeBom = (pkg?.boms ?? []).find(b => b.type === activeFlow.key);
      if (scopeBom) {
        const itemsList = scopeBom.bomItems || scopeBom.bom_items || [];
        itemsList.forEach((bi) => {
          const itemId = Number(bi.item_id);
          const itemData = bi.item || {};
          const current = map.get(itemId) || { item_id: itemId, sku: itemData.sku, name: itemData.name, unit: itemData.unit || 'pcs', quantity: 0 };
          map.set(itemId, {
            ...current,
            quantity: normalizeSkuQuantity(current.quantity + (Number(pLine.quantity) * Number(bi.quantity))),
          });
        });
      }
    });

    return map;
  }, [newOrderPackageLines, packages, activeFlow.key]);

  const consolidatedSkus = useMemo(() => {
    const map = new Map(
      Array.from(packageDerivedSkus.entries()).map(([itemId, line]) => [
        itemId,
        { ...line },
      ])
    );

    (newOrderSkuLines ?? []).forEach((sLine) => {
      const itemId = Number(sLine.item_id);
      const current = map.get(itemId) || { item_id: itemId, sku: sLine.sku, name: sLine.name, unit: sLine.unit || 'pcs', quantity: 0 };
      map.set(itemId, {
        ...current,
        quantity: normalizeSkuQuantity(current.quantity + Number(sLine.quantity)),
        unit: sLine.unit || current.unit || 'pcs',
      });
    });

    return Array.from(map.values())
      .filter((line) => normalizeSkuQuantity(line.quantity) > 0)
      .sort((a, b) => String(a.sku ?? '').localeCompare(String(b.sku ?? '')));
  }, [packageDerivedSkus, newOrderSkuLines]);

  // Autofill default suppliers for consolidated items
  useEffect(() => {
    if (activeFlow.key !== 'hardware' || consolidatedSkus.length === 0) return;

    setSkuSuppliers(prev => {
      const next = { ...prev };
      let changed = false;

      consolidatedSkus.forEach(line => {
        // Only autofill if not already assigned
        if (!next[line.item_id]) {
          const item = (items || []).find(i => Number(i.id) === Number(line.item_id));
          if (item?.supplier_id) {
            next[line.item_id] = item.supplier_id;
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [consolidatedSkus, items, activeFlow.key]);

  const setConsolidatedSkuQuantity = (skuLine, nextQuantity) => {
    const safeQuantity = normalizeSkuQuantity(nextQuantity);
    const baseQuantity = normalizeSkuQuantity(packageDerivedSkus.get(skuLine.item_id)?.quantity ?? 0);
    const adjustment = normalizeSkuQuantity(safeQuantity - baseQuantity);

    setNewOrderSkuLines((prev) => {
      const remaining = prev.filter((line) => line.item_id !== skuLine.item_id);

      if (adjustment === 0) {
        return remaining;
      }

      return [
        ...remaining,
        {
          item_id: skuLine.item_id,
          quantity: adjustment,
          sku: skuLine.sku,
          name: skuLine.name,
          unit: skuLine.unit || 'pcs',
        },
      ];
    });
  };

  const adjustConsolidatedSkuQuantity = (skuLine, delta) => {
    const currentQuantity = normalizeSkuQuantity(skuLine.quantity);
    const nextQuantity = normalizeSkuQuantity(Math.max(0, currentQuantity + delta));

    setConsolidatedSkuQuantity(skuLine, nextQuantity);
  };

  const useSuggestion = () => {
    setNewOrderPackageLines((scopedSuggestion?.package_lines ?? []).map(p => ({
      package_id: p.package_id,
      quantity: p.quantity,
      package_code: p.code,
      package_name: p.name
    })));
    setNewOrderSkuLines((scopedSuggestion?.sku_lines ?? []).map(s => ({
      item_id: s.item_id,
      quantity: s.shortage_qty,
      sku: s.sku,
      name: s.name,
      unit: s.unit || 'pcs'
    })));

    setNewOrderNotes(`Based on ${activeFlow.label} shortage suggestion for ${(scopedSuggestion?.source_orders ?? []).length} unfulfilled orders.`);
  };

  const createDraft = async () => {
    setNotification(null);
    setProcessingCreate(true);

    try {
      const { response, payload } = await apiFetchJson(orderApiBase, {
        method: 'POST',
        body: JSON.stringify({
          package_lines: newOrderPackageLines.map(line => ({ package_id: line.package_id, quantity: line.quantity })),
          sku_lines: newOrderSkuLines
            .filter((line) => normalizeSkuQuantity(line.quantity) !== 0)
            .map(line => ({ item_id: line.item_id, quantity: line.quantity, unit: line.unit })),
          sku_suppliers: skuSuppliers,
          po_number: newOrderPoNumber,
          notes: newOrderNotes,
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message || 'Draft created.' });
        setList((prev) => [payload.data, ...prev]);
        setNewOrderPackageLines([]);
        setNewOrderSkuLines([]);
        setNewOrderPoNumber('');
        setNewOrderNotes('');
        setSkuSuppliers({});

        // Refresh page to update history and suggestions
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to create draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingCreate(false);
    }
  };

  const deleteDraft = async (order) => {
    if (!confirm(`Are you sure you want to delete draft ${order.code}?`)) return;
    setProcessingDeleteId(order.id);

    try {
      const { response, payload } = await apiFetchJson(`${orderApiBase}/${order.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Draft deleted.' });
        setList((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to delete draft.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProcessingDeleteId(null);
    }
  };

  return (
    <AuthenticatedLayout title={`Procurement • ${activeFlow.label}`} backUrl="__back__">
      <>
        <Head title={`Procurement ${activeFlow.label}`} />

        <div className="space-y-8 pb-20">
          {!databaseReady && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
              Database untuk procurement module belum siap. Jalankan <code>php artisan migrate</code> kemudian refresh semula.
            </div>
          )}

          {notification && (
            <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {notification.message}
            </div>
          )}

          {canManage && (
            <div className="flex flex-col gap-8">
              {/* Row 1: Demand Analysis */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Demand & Shortage Analysis
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Analyzing {suggestion.source_orders.length} unfulfilled orders for stock requirements</p>
                  </div>
                  {scopedSuggestion.source_orders.length > 0 && (
                    <button
                      onClick={useSuggestion}
                      className="w-full md:w-auto text-[11px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 border border-amber-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.572-.325Zm-14.444-2.848a7 7 0 0 0 11.712 3.138.75.75 0 0 0-1.572-.325 5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.11a.75.75 0 0 0-.75.75v4.14a.75.75 0 0 0 1.5 0v-1.894l.311.311Z" clipRule="evenodd" /></svg>
                      Auto-Fill Form
                    </button>
                  )}
                </div>
                <div className="pt-4 px-6 pb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recommended Replenishment</h3>
                      {(scopedSuggestion.package_lines.length > 0 || scopedSuggestion.sku_lines.length > 0) ? (
                        <div className="flex flex-col gap-4">
                          {scopedSuggestion.package_lines.map((p, idx) => (
                            <div key={`pkg-${idx}`} className="group flex flex-col p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform text-2xl">📦</div>
                                  <div>
                                    <p className="text-sm font-black text-emerald-900 leading-tight uppercase tracking-tight">{p.code}</p>
                                    <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">{p.name}</p>
                                  </div>
                                </div>
                                <div className="bg-emerald-100/80 px-4 py-1.5 rounded-xl border border-emerald-200">
                                  <p className="text-lg font-black text-emerald-700">x{p.quantity}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {scopedSuggestion.sku_lines.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              {scopedSuggestion.sku_lines.map((s, idx) => (
                                <div key={`sku-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:border-blue-300 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform text-lg">🧩</div>
                                    <div><p className="text-xs font-black text-blue-900 leading-tight">{s.sku}</p></div>
                                  </div>
                                  <div className="text-right"><p className="text-sm font-black text-blue-700">+{s.shortage_qty}</p></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-12 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No stock shortage detected</div>
                      )}
                    </div>
                    <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pending Demand Source</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {scopedSuggestion.source_orders.map(so => (
                          <div key={so.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-black text-slate-800">{so.code}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{so.customer}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Order Builder (New Redesigned Fast Flow) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 py-5 px-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                        Create Procurement Order
                      </h2>
                      <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">Draft a new request for inventory replenishment</p>
                    </div>
                    {activeFlow.key === 'hardware' && suppliersLink}
                  </div>
                </div>

                <div className="pt-4 px-6 md:pt-5 md:px-8 pb-8 space-y-8">
                  {/* Unified Selection Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-slate-100">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Step 1: Choose Package</label>
                      <CustomSelect
                        placeholder="Select a package to explode items..."
                        value={null}
                        onChange={handlePackageSelect}
                        options={(Array.isArray(packages) ? packages : []).map(pkg => {
                          const avail = packageAvailability[pkg.id];
                          const label = avail !== undefined
                            ? `${pkg.code} — ${pkg.name} (Available: ${avail})`
                            : `${pkg.code} — ${pkg.name}`;
                          return { value: pkg.id, label };
                        })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">OR Select Individual SKU</label>
                      <CustomSelect
                        placeholder="Search individual item..."
                        value={null}
                        onChange={handleSkuSelect}
                        options={(Array.isArray(scopedItems) ? scopedItems : []).map(item => ({ value: item.id, label: `${item.sku} — ${item.name}` }))}
                      />
                    </div>
                  </div>

                  {/* Selected Items / Quantities Display */}
                  {newOrderPackageLines.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Selections</h3>
                      <div className="flex flex-wrap gap-3">
                        {newOrderPackageLines.map((line, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl shadow-sm">
                            <span className="text-xs font-black text-blue-800">{line.package_code}</span>
                            <div className="flex items-center gap-2 bg-white/50 rounded-lg p-0.5 border border-blue-200/50">
                              <button onClick={() => updateNewOrderPackageQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center font-black text-blue-600">-</button>
                              <span className="text-[11px] font-black min-w-[20px] text-center">{line.quantity}</span>
                              <button onClick={() => updateNewOrderPackageQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center font-black text-blue-600">+</button>
                            </div>
                            <button onClick={() => removeNewOrderPackageLine(idx)} className="text-blue-300 hover:text-red-500 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section: Consolidated SKU & Supplier Selection */}
                  {consolidatedSkus.length > 0 ? (
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between border-b-2 border-emerald-100 pb-3">
                        <h3 className="text-11px font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                          <span className="w-2 h-6 bg-emerald-500 rounded-full animate-pulse"></span>
                          {activeFlow.key === 'hardware'
                            ? `Step 2: Assign Suppliers for ${consolidatedSkus.length} Items`
                            : `Step 2: Review ${consolidatedSkus.length} Items`
                          }
                        </h3>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Explosion Success</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {consolidatedSkus.map((skuLine) => (
                          <div key={skuLine.item_id} className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-100 rounded-[2rem] p-5 gap-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-5 flex-1">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🧩</div>
                              <div>
                                <p className="text-base font-black text-slate-800 leading-tight tracking-tight">{skuLine.sku}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{skuLine.name}</p>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="flex flex-col items-center md:items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Needed</span>
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 shadow-sm">
                                  <button
                                    type="button"
                                    onClick={() => adjustConsolidatedSkuQuantity(skuLine, -1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-red-500"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={skuLine.quantity}
                                    onChange={(e) => setConsolidatedSkuQuantity(skuLine, e.target.value)}
                                    className="no-spinner w-24 rounded-xl border-0 bg-transparent text-center text-sm font-black text-slate-700 focus:ring-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => adjustConsolidatedSkuQuantity(skuLine, 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-emerald-600"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <div className="w-24">
                                <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1.5 ml-1">Unit</label>
                                <input
                                  type="text"
                                  value={skuLine.unit || 'pcs'}
                                  onChange={(e) => updateNewOrderSkuUnit(skuLine.item_id, e.target.value)}
                                  className="w-full rounded-xl border-slate-200 text-xs font-bold bg-slate-50/50 p-2 text-center uppercase"
                                  placeholder="Unit"
                                />
                              </div>
                              {activeFlow.key === 'hardware' && (
                                <div className="w-full md:w-72">
                                  <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1.5 ml-1">Supplier</label>
                                  <CustomSelect
                                    placeholder="Assign Supplier..."
                                    value={skuSuppliers[skuLine.item_id]}
                                    onChange={(val) => handleSkuSupplierChange(skuLine.item_id, val)}
                                    options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                  />
                                </div>
                              )}
                              <button onClick={() => setConsolidatedSkuQuantity(skuLine, 0)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                      <div className="text-4xl">🛒</div>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em]">Choose from Step 1 to start</p>
                    </div>
                  )}

                  <div className="mt-12 pt-8 border-t border-slate-100">
                    <div className="mb-6">
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3 px-1">PO Number</label>
                      <input
                        type="text"
                        value={newOrderPoNumber}
                        onChange={(e) => setNewOrderPoNumber(e.target.value.toUpperCase())}
                        className="w-full rounded-2xl border-slate-200 text-sm font-medium focus:ring-slate-500/10 focus:border-slate-400 bg-slate-50/30 p-4"
                        placeholder="Enter PO number manually, e.g. PO-20260312-ABCD"
                      />
                      <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Leave blank to auto-generate.
                      </p>
                    </div>
                    <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3 px-1">Internal Procurement Notes</label>
                    <textarea value={newOrderNotes} onChange={(e) => setNewOrderNotes(e.target.value)} rows="3" className="w-full rounded-2xl border-slate-200 text-sm font-medium focus:ring-slate-500/10 focus:border-slate-400 bg-slate-50/30 p-4 mb-8" placeholder="Enter special instructions or context for this order..."></textarea>
                    <button onClick={createDraft} disabled={!databaseReady || !canManage || processingCreate || consolidatedSkus.length === 0} className="group relative w-full overflow-hidden rounded-[2rem] bg-emerald-600 p-6 text-white shadow-xl hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all">
                      <div className="relative z-10 flex items-center justify-center gap-4">
                        <span className="text-sm font-black uppercase tracking-[0.25em]">{processingCreate ? 'Processing...' : 'Finalize & Generate POs'}</span>
                        {!processingCreate && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-2 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: History */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" /></svg>
                      Procurement History
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Found {list.length} orders in the system</p>
                  </div>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  {list
                    .filter((order) => getOrderLines(order).some((line) => String(line.item?.bom_scope ?? 'hardware') === activeFlow.key))
                    .map((order) => {
                      const orderPackageLines = getOrderPackageLines(order);
                      const orderLines = getOrderLines(order);
                      return (
                        <div key={order.id} className="group rounded-[2rem] border border-slate-100 bg-white hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
                          <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30 border-b border-slate-100/50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm text-lg">📄</div>
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{order.code}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {new Date(order.created_at).toLocaleDateString()} • {order.supplier?.name || order.supplier_name || 'General'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm bg-white ${order.status === 'received' ? 'text-emerald-700 border-emerald-100' : 'text-blue-700 border-blue-100'}`}>{order.status}</span>
                          </div>
                          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <div className="space-y-3">
                              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Items Ordered</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {orderPackageLines.map((line, index) => (
                                  <div key={`package-${line.id ?? index}`} className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-100 group-hover:bg-white transition-colors flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">🧩</span>
                                      <div>
                                        <p className="text-[11px] font-black text-emerald-900 leading-tight">{line.package?.code}</p>
                                        <p className="text-[9px] text-emerald-500 font-bold uppercase">{line.package?.name || 'Package'}</p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-sm">x{line.quantity}</span>
                                  </div>
                                ))}
                                {orderPackageLines.length === 0 && (
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-400">
                                    No package summary recorded for this order.
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <button onClick={() => toggleReceiveForm(order.id)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 border border-slate-200 text-slate-600 bg-white hover:border-slate-400 transition-all group/btn shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest">View Detailed List ({orderLines.length})</span>
                                <span className={`text-xs transition-transform duration-300 ${expandedReceiveForms?.[order.id] ? 'rotate-180' : ''}`}>▼</span>
                              </button>
                              {expandedReceiveForms?.[order.id] && (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                                  {orderLines.map((line) => (
                                    <div key={line.id} className="flex items-center justify-between rounded-xl bg-slate-50/50 border border-slate-100 px-4 py-3">
                                      <div><p className="text-xs font-black text-slate-800 tracking-tight">{line.item?.sku}</p></div>
                                      <span className="text-[11px] font-black text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{line.ordered_quantity} {line.item?.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="px-5 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/20">
                            <a href={`${orderApiBase}/${order.id}/pdf`} target="_blank" rel="noreferrer" className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black text-center uppercase tracking-widest hover:border-slate-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500"><path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" /></svg>
                              Export PDF
                            </a>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E0; }
          .no-spinner::-webkit-outer-spin-button,
          .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .no-spinner[type=number] { -moz-appearance: textfield; appearance: textfield; }
        `}} />
      </>
    </AuthenticatedLayout>
  );
}
