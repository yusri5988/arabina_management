import { Head } from '@inertiajs/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const initialForm = {
  code: '',
  name: '',
  is_active: true,
  lines: [{ item_id: '', quantity: '' }],
};

const templateColumns = ['package_code', 'package_name', 'sku', 'quantity'];

export default function Index({ items, packages, schemaReady = true }) {
  const [data, setData] = useState(initialForm);
  const [list, setList] = useState(packages ?? []);
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [duplicateSourceCode, setDuplicateSourceCode] = useState(null);
  const [notification, setNotification] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkError, setBulkError] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const addLine = () => {
    setData(prev => ({
      ...prev,
      lines: [...prev.lines, { item_id: '', quantity: '' }],
    }));
  };

  const removeLine = (index) => {
    setData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index, field, value) => {
    setData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  };

  const buildDuplicateCode = useCallback((sourceCode) => {
    const normalizedExisting = new Set(
      list.map(pkg => String(pkg.code ?? '').trim().toLowerCase()).filter(Boolean),
    );
    const baseCode = `${String(sourceCode ?? '').trim()}-COPY`;

    if (!normalizedExisting.has(baseCode.toLowerCase())) {
      return baseCode;
    }

    let suffix = 2;
    while (normalizedExisting.has(`${baseCode}-${suffix}`.toLowerCase())) {
      suffix += 1;
    }

    return `${baseCode}-${suffix}`;
  }, [list]);

  const resetForm = () => {
    setData(initialForm);
    setErrors({});
    setEditingId(null);
    setDuplicateSourceCode(null);
  };

  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    setDuplicateSourceCode(null);
    setData({
      code: pkg.code,
      name: pkg.name,
      is_active: Boolean(pkg.is_active),
      lines: pkg.package_items.map(pi => ({
        item_id: String(pi.item_id),
        quantity: String(pi.quantity),
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDuplicate = (pkg) => {
    setEditingId(null);
    setDuplicateSourceCode(pkg.code);
    setErrors({});
    setNotification(null);
    setData({
      code: buildDuplicateCode(pkg.code),
      name: `${pkg.name} Copy`,
      is_active: true,
      lines: pkg.package_items.map(pi => ({
        item_id: String(pi.item_id),
        quantity: String(pi.quantity),
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadXlsx = useCallback(async () => {
    if (xlsxRef.current) return xlsxRef.current;

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

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
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!json.length) {
        setBulkError('File is empty.');
        return;
      }

      const headers = Object.keys(json[0] ?? {}).map((key) => String(key).trim().toLowerCase());
      const missingColumns = templateColumns.filter((column) => !headers.includes(column));

      if (missingColumns.length) {
        setBulkError(`Missing required column: ${missingColumns[0]}`);
        return;
      }

      const rows = json.map((raw) => {
        const row = {};
        Object.keys(raw).forEach((key) => {
          row[String(key).trim().toLowerCase()] = raw[key];
        });

        return {
          package_code: String(row.package_code ?? '').trim(),
          package_name: String(row.package_name ?? '').trim(),
          sku: String(row.sku ?? '').trim(),
          quantity: row.quantity === '' || row.quantity == null ? '' : String(row.quantity).trim(),
        };
      }).filter((row) => row.package_code || row.package_name || row.sku || row.quantity);

      if (!rows.length) {
        setBulkError('No valid rows found. Use the downloaded template columns.');
        return;
      }

      const invalidRow = rows.findIndex((row) => !row.package_code || !row.package_name || !row.sku || !row.quantity);
      if (invalidRow !== -1) {
        setBulkError(`Row ${invalidRow + 2} is incomplete. Required: package_code, package_name, sku, quantity.`);
        return;
      }

      setBulkRows(rows);
    } catch (error) {
      setBulkError('Failed to read file. Please use .xlsx, .xls, or .csv format.');
    }
  };

  const cancelBulk = () => {
    setBulkRows([]);
    setBulkError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submitBulk = async () => {
    if (!bulkRows.length) return;

    setBulkUploading(true);
    setBulkError(null);
    setNotification(null);

    try {
      const response = await fetch('/packages/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ packages: bulkRows.map(row => ({
          ...row,
          quantity: Number(row.quantity),
        })) }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 201) {
        setList(prev => [...(payload.data ?? []), ...prev]);
        setNotification({ type: 'success', message: payload.message ?? 'Bulk package upload completed.' });
        cancelBulk();
      } else if (response.status === 422) {
        const firstError = Object.values(payload.errors ?? {}).flat()[0];
        setBulkError(firstError ?? 'Bulk upload validation failed.');
      } else {
        setBulkError(payload.message ?? 'Bulk upload failed.');
      }
    } catch (error) {
      setBulkError('Network error. Please try again.');
    } finally {
      setBulkUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    const url = editingId ? `/packages/${editingId}` : '/packages';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (response.status === 201 || (editingId && response.ok)) {
        if (editingId) {
          setList(prev => prev.map(item => item.id === editingId ? payload.data : item));
        } else {
          setList(prev => [payload.data, ...prev]);
        }
        setNotification({ type: 'success', message: payload.message ?? 'Package saved successfully.' });
        resetForm();
      } else if (response.status === 422) {
        setErrors(payload.errors ?? {});
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Something went wrong.' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const deletePackage = async (pkg) => {
    const confirmed = window.confirm(`Delete package ${pkg.code}?`);
    if (!confirmed) return;

    setDeletingId(pkg.id);
    setNotification(null);

    try {
      const response = await fetch(`/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setList(prev => prev.filter(item => item.id !== pkg.id));
        setNotification({ type: 'success', message: payload.message ?? 'Package deleted successfully.' });
        if (editingId === pkg.id) resetForm();
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to delete package.' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AuthenticatedLayout title="Package Setup" backUrl="__back__">
      <Head title="Package Setup" />

      <div className="space-y-6">
        {notification && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            notification.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        {!schemaReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Database for package module belum siap. Jalankan <code className="font-bold">php artisan migrate</code> kemudian refresh semula.
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 px-6 pb-6 pt-4 md:px-8 md:pb-8 md:pt-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-lg font-bold text-slate-800">Bulk Upload Package</h2>
            <a
              href="/packages/bulk/template"
              className="text-xs font-bold text-arabina-accent uppercase tracking-widest"
            >
              Download Template
            </a>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Upload fail <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong> dengan kolum:
              {' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">package_code</code>,
              {' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">package_name</code>,
              {' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">sku</code>,
              {' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">quantity</code>.
            </p>

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
                        <th className="px-4 py-2.5">Package Code</th>
                        <th className="px-4 py-2.5">Package Name</th>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bulkRows.slice(0, 20).map((row, index) => (
                        <tr key={`${row.package_code}-${row.sku}-${index}`} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-slate-400">{index + 1}</td>
                          <td className="px-4 py-2 font-mono font-semibold text-slate-700">{row.package_code}</td>
                          <td className="px-4 py-2 text-slate-600">{row.package_name}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">{row.sku}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-700">{row.quantity}</td>
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
                    type="button"
                    onClick={submitBulk}
                    disabled={bulkUploading || !schemaReady}
                    className="flex-1 bg-[#1b580e] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md"
                  >
                    {bulkUploading ? 'Uploading...' : `Upload ${bulkRows.length} Row(s)`}
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

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 px-6 pb-6 pt-4 md:px-8 md:pb-8 md:pt-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? `Edit Package: ${data.code}` : duplicateSourceCode ? `Duplicate Package: ${duplicateSourceCode}` : 'Create Package by SKU'}
            </h2>
            {(editingId || duplicateSourceCode) && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Code</label>
                <input
                  type="text"
                  value={data.code}
                  onChange={e => setData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Package Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-slate-50"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Package Lines</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs font-bold uppercase tracking-wider text-arabina-accent"
                >
                  Add SKU
                </button>
              </div>

              {data.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div className="col-span-8">
                    <select
                      value={line.item_id}
                      onChange={e => updateLine(index, 'item_id', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                      required
                    >
                      <option value="">Select SKU</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={e => updateLine(index, 'quantity', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-right focus:ring-2 focus:ring-arabina-accent focus:outline-none bg-white"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {data.lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {errors.lines && <p className="text-xs text-red-500">{errors.lines[0]}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={data.is_active}
                onChange={e => setData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-slate-300 text-arabina-accent focus:ring-arabina-accent"
              />
              Active package
            </label>

            <button
              type="submit"
              disabled={processing || !schemaReady}
              className={`w-full text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all shadow-md ${
                editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1b580e] hover:bg-emerald-950'
              }`}
            >
              {processing ? 'Saving...' : editingId ? 'Update Package' : 'Save Package'}
            </button>
          </form>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">Package List ({list.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map(pkg => (
              <div key={pkg.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border transition-all duration-300 ${
                editingId === pkg.id ? 'border-amber-400 ring-2 ring-amber-100 shadow-lg' : 'border-slate-100'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{pkg.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{pkg.code}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${pkg.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => startDuplicate(pkg)}
                      className="text-[10px] font-bold text-sky-600 uppercase tracking-wider px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(pkg)}
                      className="text-[10px] font-bold text-amber-600 uppercase tracking-wider px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePackage(pkg)}
                      disabled={deletingId === pkg.id}
                      className="text-[10px] font-bold text-red-600 uppercase tracking-wider px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === pkg.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {pkg.package_items?.map(line => (
                    <div key={line.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <span className="font-semibold text-slate-700">
                        {line.item?.sku} - {line.item?.name}
                      </span>
                      <span className="font-black text-slate-900">x{line.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
