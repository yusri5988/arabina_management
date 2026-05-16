import { Head, router } from '@inertiajs/react';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const CustomSelect = ({ value, onChange, options, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50 text-left transition-all hover:border-slate-300"
      >
        <span className="font-medium text-slate-700">{selectedOption?.label}</span>
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
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-slate-50 flex items-center justify-between ${
                value === option.value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'
              }`}
            >
              {option.label}
              {value === option.value && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Index({ items }) {
  const bomScopeOptions = [
    { value: 'cabin', label: 'Cabin' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'hardware_site', label: 'Hardware Site' },
  ];
  const bomSections = [
    { key: 'cabin', label: 'BOM Cabin' },
    { key: 'hardware', label: 'BOM Hardware' },
    { key: 'hardware_site', label: 'BOM Hardware Site' },
  ];

  const normalizedItems = useMemo(() => {
    if (Array.isArray(items)) {
      return items;
    }

    if (Array.isArray(items?.data)) {
      return items.data;
    }

    return [];
  }, [items]);

  const [inventory, setInventory] = useState(normalizedItems);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeBom, setActiveBom] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkError, setBulkError] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);
  const totalItems = inventory.length;

  const [data, setData] = useState({
    sku: '',
    name: '',
    length_m: '',
    unit: 'pcs',
    bom_scope: 'hardware',
    supplier: ''
  });

  const formatLength = (value) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const numericValue = Number(value);

    return Number.isNaN(numericValue) ? '—' : numericValue.toFixed(2);
  };

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  useEffect(() => {
    setInventory(normalizedItems);
  }, [normalizedItems]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const filtered = useMemo(() => {
    let result = [...inventory];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.sku?.toLowerCase().includes(q) ||
        item.name?.toLowerCase().includes(q)
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'length_m') {
          valA = valA === null || valA === '' ? 0 : Number(valA);
          valB = valB === null || valB === '' ? 0 : Number(valB);
        } else {
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [inventory, search, sortConfig]);

  const filteredByBom = useMemo(() => {
    return bomSections.map((section) => ({
      ...section,
      rows: filtered.filter((item) => String(item.bom_scope ?? 'hardware') === section.key),
    })).filter((section) => activeBom === 'all' || section.key === activeBom);
  }, [activeBom, filtered]);

  const SortIndicator = ({ columnKey }) => {
    const isSorted = sortConfig.key === columnKey;
    return (
      <span className="flex flex-col text-[8px] leading-none text-slate-300 ml-1">
        <span className={isSorted && sortConfig.direction === 'asc' ? 'text-slate-900 font-bold' : ''}>▲</span>
        <span className={isSorted && sortConfig.direction === 'desc' ? 'text-slate-900 font-bold' : ''}>▼</span>
      </span>
    );
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const parseResponsePayload = async (response) => {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();

    return {
      message: text || 'Unexpected server response.',
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    try {
      const response = await fetch('/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(data),
      });

      const payload = await parseResponsePayload(response);

      if (response.status === 201) {
        setInventory(prev => [payload.data, ...prev]);
        setData({ sku: '', name: '', length_m: '', unit: 'pcs', bom_scope: 'hardware', supplier: '' });
        showNotification('success', 'Item registered successfully.');
      } else if (response.status === 422) {
        setErrors(payload.errors);
      } else {
        showNotification('error', payload.message ?? 'Failed to register item.');
      }
    } catch (error) {
      showNotification('error', 'Something went wrong.');
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      sku: item.sku,
      name: item.name,
      length_m: item.length_m ?? '',
      unit: item.unit,
      bom_scope: item.bom_scope ?? 'hardware',
      supplier: item.supplier ?? '',
    });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditErrors({});
  };

  const saveEdit = async (id) => {
    setEditErrors({});
    setProcessing(true);

    try {
      const tokenRes = await fetch('/csrf-token');
      const tokenData = await tokenRes.json();

      const response = await fetch(`/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': tokenData.token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(editData),
      });

      const payload = await parseResponsePayload(response);

      if (response.ok) {
        setInventory(prev =>
          prev.map(item => item.id === id ? { ...item, ...payload.data } : item)
        );
        setEditingId(null);
        setEditData({});
        showNotification('success', 'Item updated successfully.');
      } else if (response.status === 422) {
        setEditErrors(payload.errors);
        showNotification('error', 'Validation failed. Please check the fields.');
      } else {
        showNotification('error', payload.message ?? 'Failed to update item.');
      }
    } catch (error) {
      showNotification('error', 'Failed to update item.');
    } finally {
      setProcessing(false);
    }
  };

  const deleteItem = async (id) => {
    setProcessing(true);
    try {
      const response = await fetch(`/items/${id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const payload = await parseResponsePayload(response);

      if (response.ok) {
        setInventory(prev => prev.filter(item => item.id !== id));
        showNotification('success', 'Item deleted.');
      } else {
        showNotification('error', payload.message ?? 'Failed to delete item.');
      }
    } catch (error) {
      showNotification('error', 'Failed to delete item.');
    } finally {
      setProcessing(false);
      setDeleteConfirmId(null);
    }
  };

  // Lazy-load SheetJS
  const loadXlsx = useCallback(async () => {
    if (xlsxRef.current) return xlsxRef.current;
    const xlsxModule = await import('xlsx');
    xlsxRef.current = xlsxModule;
    return xlsxModule;
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError(null);
    setBulkRows([]);

    try {
      const XLSX = await loadXlsx();
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json.length) { setBulkError('File is empty.'); return; }

      // Normalize column headers (case-insensitive)
      const unitMap = {
        'pcs': 'pcs', 'pc': 'pcs', 'nos': 'pcs',
        'unit': 'unit', 'units': 'unit',
        'set': 'set', 'sets': 'set',
        'roll': 'roll', 'rolls': 'roll',
        'bag': 'bag', 'bags': 'bag', 'beg': 'bag',
        'btg': 'btg', 'btgs': 'btg', 'batang': 'btg',
        'pek': 'pek', 'peks': 'pek', 'pack': 'pek', 'packs': 'pek',
        'tong': 'tong', 'tongs': 'tong',
        'helai': 'helai', 'helais': 'helai',
        'can': 'can', 'cans': 'can', 'tin': 'can',
        'pellet': 'pellet', 'pellets': 'pellet',
        'cut': 'cut', 'cuts': 'cut',
        'scope': 'scope', 'scopes': 'scope'
      };

      const rows = json.map(r => {
        const row = {};
        Object.keys(r).forEach(k => { row[k.toLowerCase().trim()] = r[k]; });
        
        const rawUnit = String(row.unit ?? 'pcs').toLowerCase().replace(/[^a-z]/g, '').trim();
        const normalizedUnit = unitMap[rawUnit] || rawUnit;

        const rawBom = String(row.bom_scope ?? 'hardware').toLowerCase().trim();
        // Allow common synonyms for BOM scope
        let normalizedBom = rawBom;
        if (rawBom.includes('cabin')) normalizedBom = 'cabin';
        else if (rawBom.includes('hardware') && rawBom.includes('site')) normalizedBom = 'hardware_site';
        else if (rawBom.includes('hardware')) normalizedBom = 'hardware';

        return {
          sku: String(row.sku ?? '').trim(),
          item_name: String(row.item_name ?? '').trim(),
          length_m: row.length_m !== '' && row.length_m != null ? Number(row.length_m) : null,
          unit: normalizedUnit,
          bom_scope: normalizedBom,
        };
      }).filter(r => r.sku && r.item_name);

      if (!rows.length) { setBulkError('No valid rows found. Ensure columns: sku, item_name, length_m, unit, bom_scope'); return; }
      setBulkRows(rows);
    } catch (err) {
      setBulkError('Failed to parse file: ' + err.message);
    }
  };

  const submitBulk = async () => {
    setBulkUploading(true);
    setBulkError(null);

    router.post('/items/bulk', { items: bulkRows }, {
      onSuccess: (page) => {
        const nextItems = page.props.items;
        if (Array.isArray(nextItems)) {
          setInventory(nextItems);
        } else if (Array.isArray(nextItems?.data)) {
          setInventory(nextItems.data);
        }
        showNotification('success', 'Bulk items processed successfully.');
        setBulkRows([]);
        if (fileRef.current) fileRef.current.value = '';
      },
      onError: (errs) => {
        setBulkError(Object.values(errs).join(', ') || 'Validation error.');
      },
      onFinish: () => {
        setBulkUploading(false);
      }
    });
  };

  const cancelBulk = () => {
    setBulkRows([]);
    setBulkError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white';

  return (
    <AuthenticatedLayout title="Inventory Stock" backUrl="__back__">
      <Head title="Inventory" />

      <div className="space-y-8">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
            {notification.message}
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 pt-4 px-6 pb-6 md:pt-5 md:px-8 md:pb-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Register New Item</h2>
          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">SKU (Unique)</label>
                <input
                  type="text"
                  value={data.sku}
                  onChange={e => setData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Item Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={data.length_m}
                  onChange={e => setData(prev => ({ ...prev, length_m: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1 ml-1">Leave blank if not applicable.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Unit</label>
                <CustomSelect
                  value={data.unit}
                  onChange={val => setData(prev => ({ ...prev, unit: val }))}
                  options={[
                    { value: 'pcs', label: 'pcs' },
                    { value: 'unit', label: 'unit' },
                    { value: 'set', label: 'set' },
                    { value: 'roll', label: 'roll' },
                    { value: 'bag', label: 'bag' },
                    { value: 'btg', label: 'btg' },
                    { value: 'pek', label: 'pek' },
                    { value: 'tong', label: 'tong' },
                    { value: 'helai', label: 'helai' },
                    { value: 'can', label: 'can' },
                    { value: 'pellet', label: 'pellet' },
                    { value: 'cut', label: 'cut' },
                    { value: 'scope', label: 'scope' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">BOM Category</label>
                <CustomSelect
                  value={data.bom_scope}
                  onChange={val => setData(prev => ({ ...prev, bom_scope: val }))}
                  options={bomScopeOptions}
                />
                {errors.bom_scope && <p className="text-xs text-red-500 mt-1">{errors.bom_scope[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Supplier Name</label>
                <input
                  type="text"
                  value={data.supplier}
                  onChange={e => setData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  placeholder="e.g. Supplier A"
                />
                {errors.supplier && <p className="text-xs text-red-500 mt-1">{errors.supplier[0]}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#1b580e] text-white py-3 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
            >
              {processing ? 'Registering...' : 'Register Item'}
            </button>
          </form>
        </div>

        {/* Bulk Upload */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 pt-4 px-6 pb-6 md:pt-5 md:px-8 md:pb-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Bulk Upload (Excel)</h2>
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-500">Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file with columns: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">sku</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">item_name</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">length_m</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">unit</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">bom_scope</code></p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}

            {bulkRows.length > 0 && (
              <>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Item Name</th>
                        <th className="px-4 py-2.5">Length (m)</th>
                        <th className="px-4 py-2.5">Unit</th>
                        <th className="px-4 py-2.5">BOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bulkRows.slice(0, 20).map((row, i) => {
                        const isValidUnit = ['pcs', 'unit', 'set', 'roll', 'bag', 'btg', 'pek', 'tong', 'helai', 'can', 'pellet', 'cut', 'scope'].includes(row.unit);
                        const isValidBom = ['cabin', 'hardware', 'hardware_site'].includes(row.bom_scope);

                        return (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-4 py-2 font-mono font-semibold text-slate-700">{row.sku}</td>
                            <td className="px-4 py-2 text-slate-600">{row.item_name}</td>
                            <td className="px-4 py-2 text-slate-500">{formatLength(row.length_m)}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                                isValidUnit ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600 ring-1 ring-red-200'
                              }`}>
                                {row.unit}
                                {!isValidUnit && <span className="ml-1 text-[8px] font-black underline">!INVALID</span>}
                              </span>
                            </td>
                            <td className={`px-4 py-2 text-xs uppercase font-bold ${
                              isValidBom ? 'text-slate-600' : 'text-red-600'
                            }`}>
                              {row.bom_scope}
                              {!isValidBom && <div className="text-[8px] font-black underline">INVALID SCOPE</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bulkRows.length > 20 && (
                    <p className="text-xs text-slate-400 text-center py-2">...and {bulkRows.length - 20} more rows</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={submitBulk}
                    disabled={bulkUploading}
                    className="flex-1 bg-[#1b580e] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                  >
                    {bulkUploading ? 'Uploading...' : `Upload ${bulkRows.length} Item(s)`}
                  </button>
                  <button
                    type="button"
                    onClick={cancelBulk}
                    className="px-6 py-3.5 rounded-2xl text-sm font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SKU List */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">All Registered SKUs ({totalItems})</h3>
              <p className="text-xs text-slate-500">
                {search.trim()
                  ? `Showing ${filtered.length} matched SKU${filtered.length === 1 ? '' : 's'}.`
                  : `Showing ${totalItems} SKU${totalItems === 1 ? '' : 's'}.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap sm:justify-end">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SKU or name..."
                className="w-full sm:w-80 lg:w-96 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-arabina-accent focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveBom('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeBom === 'all'
                      ? 'bg-[#1b580e] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All BOM
                </button>
                {bomSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveBom(section.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeBom === section.key
                        ? 'bg-[#1b580e] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {section.label.replace('BOM ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12 font-medium">
                {search.trim() ? 'No items match the current search.' : 'No items registered yet.'}
              </p>
            ) : (
              filteredByBom.map((section) => (
                <div key={section.key} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{section.label}</h4>
                    <span className="text-xs font-bold text-slate-500">{section.rows.length} SKU</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('sku')}>
                            <div className="flex items-center gap-1">SKU <SortIndicator columnKey="sku" /></div>
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('name')}>
                            <div className="flex items-center gap-1">Name <SortIndicator columnKey="name" /></div>
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('length_m')}>
                            <div className="flex items-center gap-1">Length (m) <SortIndicator columnKey="length_m" /></div>
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('unit')}>
                            <div className="flex items-center gap-1">Unit <SortIndicator columnKey="unit" /></div>
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('bom_scope')}>
                            <div className="flex items-center gap-1">BOM <SortIndicator columnKey="bom_scope" /></div>
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group transition-colors" onClick={() => requestSort('supplier')}>
                            <div className="flex items-center gap-1">Supplier <SortIndicator columnKey="supplier" /></div>
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                    {section.rows.map((item, idx) => (
                      <tr key={item.id ?? idx} className="hover:bg-slate-50 transition-colors">
                        {editingId === item.id ? (
                          <>
                            <td className="px-4 py-3 text-slate-400 font-medium text-xs">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <input type="text" value={editData.sku} onChange={e => setEditData(prev => ({ ...prev, sku: e.target.value }))} className={inputClass} />
                              {editErrors.sku && <p className="text-xs text-red-500 mt-0.5 font-medium">{editErrors.sku[0]}</p>}
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editData.name} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} className={inputClass} />
                              {editErrors.name && <p className="text-xs text-red-500 mt-0.5 font-medium">{editErrors.name[0]}</p>}
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" value={editData.length_m} onChange={e => setEditData(prev => ({ ...prev, length_m: e.target.value }))} className={inputClass} />
                              {editErrors.length_m && <p className="text-xs text-red-500 mt-0.5 font-medium">{editErrors.length_m[0]}</p>}
                            </td>
                            <td className="px-4 py-2">
                              <CustomSelect 
                                value={editData.unit} 
                                onChange={val => setEditData(prev => ({ ...prev, unit: val }))} 
                                options={[
                                  { value: 'pcs', label: 'pcs' },
                                  { value: 'unit', label: 'unit' },
                                  { value: 'set', label: 'set' },
                                  { value: 'roll', label: 'roll' },
                                  { value: 'bag', label: 'bag' },
                                  { value: 'btg', label: 'btg' },
                                  { value: 'pek', label: 'pek' },
                                  { value: 'tong', label: 'tong' },
                                  { value: 'helai', label: 'helai' },
                                  { value: 'can', label: 'can' },
                                  { value: 'pellet', label: 'pellet' },
                                  { value: 'cut', label: 'cut' },
                                  { value: 'scope', label: 'scope' }
                                ]}
                                className="w-full"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <CustomSelect
                                value={editData.bom_scope}
                                onChange={val => setEditData(prev => ({ ...prev, bom_scope: val }))}
                                options={bomScopeOptions}
                                className="w-full"
                              />
                              {editErrors.bom_scope && <p className="text-xs text-red-500 mt-0.5 font-medium">{editErrors.bom_scope[0]}</p>}
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editData.supplier} onChange={e => setEditData(prev => ({ ...prev, supplier: e.target.value }))} className={inputClass} placeholder="Supplier" />
                              {editErrors.supplier && <p className="text-xs text-red-500 mt-0.5 font-medium">{editErrors.supplier[0]}</p>}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button type="button" onClick={() => saveEdit(item.id)} disabled={processing} className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all mr-1.5 shadow-sm shadow-emerald-100">
                                {processing ? 'Saving...' : 'Save'}
                              </button>
                              <button type="button" onClick={cancelEdit} className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all">
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-slate-400 font-medium text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-700 font-mono">{item.sku}</td>
                            <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{formatLength(item.length_m)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">{item.bom_scope}</span>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="text-slate-600 font-medium">{item.supplier || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button type="button" onClick={() => startEdit(item)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all mr-1.5 shadow-sm">
                                Edit
                              </button>
                              {deleteConfirmId === item.id ? (
                                <>
                                  <button type="button" onClick={() => deleteItem(item.id)} disabled={processing} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all mr-1.5">
                                    Confirm
                                  </button>
                                  <button type="button" onClick={() => setDeleteConfirmId(null)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-300 transition-all">
                                    No
                                  </button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all shadow-sm">
                                  Delete
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {section.rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No SKU in {section.label.toLowerCase()}.</td>
                      </tr>
                    )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
