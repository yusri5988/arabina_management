import { Head } from '@inertiajs/react';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({ items }) {
  const [inventory, setInventory] = useState(items ?? []);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkError, setBulkError] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);

  const [data, setData] = useState({
    sku: '',
    name: '',
    length_m: '',
    unit: 'pcs'
  });

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(i => i.sku?.toLowerCase().includes(q) || i.name?.toLowerCase().includes(q));
  }, [inventory, search]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
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
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (response.status === 201) {
        setInventory(prev => [payload.data, ...prev]);
        setData({ sku: '', name: '', length_m: '', unit: 'pcs' });
        showNotification('success', 'Item registered successfully.');
      } else if (response.status === 422) {
        setErrors(payload.errors);
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
      const response = await fetch(`/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(editData),
      });

      const payload = await response.json();

      if (response.ok) {
        setInventory(prev =>
          prev.map(item => item.id === id ? { ...item, ...payload.data } : item)
        );
        setEditingId(null);
        setEditData({});
        showNotification('success', 'Item updated successfully.');
      } else if (response.status === 422) {
        setEditErrors(payload.errors);
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
        },
      });

      const payload = await response.json();

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
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
    xlsxRef.current = window.XLSX;
    return window.XLSX;
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
      const rows = json.map(r => {
        const row = {};
        Object.keys(r).forEach(k => { row[k.toLowerCase().trim()] = r[k]; });
        return {
          sku: String(row.sku ?? '').trim(),
          item_name: String(row.item_name ?? '').trim(),
          length_m: row.length_m !== '' && row.length_m != null ? Number(row.length_m) : null,
          unit: String(row.unit ?? 'pcs').toLowerCase().trim(),
        };
      }).filter(r => r.sku && r.item_name);

      if (!rows.length) { setBulkError('No valid rows found. Ensure columns: sku, item_name, length_m, unit'); return; }
      setBulkRows(rows);
    } catch (err) {
      setBulkError('Failed to parse file: ' + err.message);
    }
  };

  const submitBulk = async () => {
    setBulkUploading(true);
    setBulkError(null);
    try {
      const response = await fetch('/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ items: bulkRows }),
      });
      const payload = await response.json();
      if (response.status === 201) {
        if (payload.data?.length) {
          setInventory(prev => [...payload.data, ...prev]);
        }
        const msg = payload.message + (payload.skipped?.length ? ' Skipped: ' + payload.skipped.join(', ') : '');
        showNotification('success', msg);
        setBulkRows([]);
        if (fileRef.current) fileRef.current.value = '';
      } else if (response.status === 422) {
        setBulkError(payload.message || 'Validation error.');
      } else {
        setBulkError(payload.message || 'Upload failed.');
      }
    } catch (err) {
      setBulkError('Upload failed: ' + err.message);
    } finally {
      setBulkUploading(false);
    }
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

      <div className="space-y-6">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
            {notification.message}
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Register New Item</h2>
          <form onSubmit={submit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">SKU (Unique)</label>
                <input
                  type="text"
                  value={data.sku}
                  onChange={e => setData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1 ml-1">Leave blank if not applicable.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Unit</label>
                <select
                  value={data.unit}
                  onChange={e => setData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                >
                  <option value="pcs">pcs</option>
                  <option value="set">set</option>
                  <option value="roll">roll</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#1E3D1A] text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
            >
              {processing ? 'Registering...' : 'Register Item'}
            </button>
          </form>
        </div>

        {/* Bulk Upload */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Bulk Upload (Excel)</h2>
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-500">Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file with columns: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">sku</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">item_name</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">length_m</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">unit</code></p>
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
                      <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Item Name</th>
                        <th className="px-4 py-2.5">Length (m)</th>
                        <th className="px-4 py-2.5">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bulkRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2 font-mono font-semibold text-slate-700">{row.sku}</td>
                          <td className="px-4 py-2 text-slate-600">{row.item_name}</td>
                          <td className="px-4 py-2 text-slate-500">{row.length_m ?? '—'}</td>
                          <td className="px-4 py-2">
                            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{row.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkRows.length > 20 && (
                    <p className="text-xs text-slate-400 text-center py-2">...and {bulkRows.length - 20} more rows</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={submitBulk}
                    disabled={bulkUploading}
                    className="flex-1 bg-[#1E3D1A] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                  >
                    {bulkUploading ? 'Uploading...' : `Upload ${bulkRows.length} Item(s)`}
                  </button>
                  <button
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
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <h2 className="text-lg font-bold text-slate-800">All SKUs</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SKU or name..."
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50 w-56"
              />
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{filtered.length} / {inventory.length}</span>
            </div>
          </div>

          {inventory.length === 0 ? (
            <p className="text-sm text-slate-400 mt-6 text-center py-8">No items registered yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Length (m)</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((item, idx) => (
                    <tr key={item.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                      {editingId === item.id ? (
                        <>
                          <td className="px-4 py-2 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-2">
                            <input type="text" value={editData.sku} onChange={e => setEditData(prev => ({ ...prev, sku: e.target.value }))} className={inputClass} />
                            {editErrors.sku && <p className="text-xs text-red-500 mt-0.5">{editErrors.sku[0]}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={editData.name} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} className={inputClass} />
                            {editErrors.name && <p className="text-xs text-red-500 mt-0.5">{editErrors.name[0]}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" step="0.01" value={editData.length_m} onChange={e => setEditData(prev => ({ ...prev, length_m: e.target.value }))} className={inputClass} />
                            {editErrors.length_m && <p className="text-xs text-red-500 mt-0.5">{editErrors.length_m[0]}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <select value={editData.unit} onChange={e => setEditData(prev => ({ ...prev, unit: e.target.value }))} className={inputClass}>
                              <option value="pcs">pcs</option>
                              <option value="set">set</option>
                              <option value="roll">roll</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <button onClick={() => saveEdit(item.id)} disabled={processing} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors mr-1.5">
                              Save
                            </button>
                            <button onClick={cancelEdit} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300 transition-colors">
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-700">{item.sku}</td>
                          <td className="px-4 py-3 text-slate-600">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500">{item.length_m ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button onClick={() => startEdit(item)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200 transition-colors mr-1.5">
                              Edit
                            </button>
                            {deleteConfirmId === item.id ? (
                              <>
                                <button onClick={() => deleteItem(item.id)} disabled={processing} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors mr-1.5">
                                  Confirm
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300 transition-colors">
                                  No
                                </button>
                              </>
                            ) : (
                              <button onClick={() => setDeleteConfirmId(item.id)} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 border border-red-200 transition-colors">
                                Delete
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
