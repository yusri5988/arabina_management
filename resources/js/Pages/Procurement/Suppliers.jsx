import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';

export default function Suppliers({ suppliers: initialSuppliers = [], items = [] }) {
  const [list, setList] = useState(initialSuppliers);
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [data, setData] = useState({ name: '', contact_person: '', phone: '', address: '', item_ids: [] });

  const toggleItem = (itemId, isEdit = false) => {
    if (isEdit) {
      const current = editData.item_ids || [];
      const next = current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId];
      setEditData({ ...editData, item_ids: next });
    } else {
      const current = data.item_ids || [];
      const next = current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId];
      setData({ ...data, item_ids: next });
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const { response, payload } = await apiFetchJson('/procurement/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setList([payload.data, ...list]);
        setData({ name: '', contact_person: '', phone: '', address: '', item_ids: [] });
        showNotification('success', 'Supplier registered successfully.');
      } else {
        showNotification('error', payload.message || 'Failed to register supplier.');
      }
    } catch (_) {
      showNotification('error', 'Network error.');
    } finally {
      setProcessing(false);
    }
  };

  const saveEdit = async (id) => {
    setProcessing(true);
    try {
      const { response, payload } = await apiFetchJson(`/procurement/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      if (response.ok) {
        setList(list.map(s => s.id === id ? payload.data : s));
        setEditingId(null);
        showNotification('success', 'Supplier updated successfully.');
      } else {
        showNotification('error', payload.message || 'Failed to update supplier.');
      }
    } catch (_) {
      showNotification('error', 'Network error.');
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditData({
      ...s,
      item_ids: (s.items || []).map(i => i.id)
    });
  };

  const deleteSupplier = async (id) => {
    if (!confirm('Are you sure?')) return;
    setProcessing(true);
    try {
      const { response, payload } = await apiFetchJson(`/procurement/suppliers/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setList(list.filter(s => s.id !== id));
        showNotification('success', 'Supplier deleted.');
      } else {
        showNotification('error', payload.message || 'Failed to delete.');
      }
    } catch (_) {
      showNotification('error', 'Network error.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="Procurement • Supplier Management" backUrl="/procurement/hardware">
      <Head title="Supplier Management" />
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        {notification && (
          <div className={`p-4 rounded-2xl border text-sm shadow-sm ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 py-6 px-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                Register New Supplier
              </h2>
              <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">Add a new partner to the procurement network</p>
            </div>
          </div>

          <form onSubmit={submit} className="p-8 md:p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Supplier Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Arabina Steel Sdn Bhd" 
                  value={data.name} 
                  onChange={e => setData({...data, name: e.target.value})} 
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Contact Person</label>
                <input 
                  type="text" 
                  placeholder="e.g. Ahmad Fauzi" 
                  value={data.contact_person} 
                  onChange={e => setData({...data, contact_person: e.target.value})} 
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +6012-3456789" 
                  value={data.phone} 
                  onChange={e => setData({...data, phone: e.target.value})} 
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Address / Notes</label>
                <input 
                  type="text" 
                  placeholder="Business address or additional details" 
                  value={data.address} 
                  onChange={e => setData({...data, address: e.target.value})} 
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Supplied SKUs (Hardware)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 bg-slate-50/50 rounded-2xl border border-slate-100 custom-scrollbar">
                {items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={data.item_ids.includes(item.id)} 
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500/20 transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 group-hover:text-emerald-700 transition-colors">{item.sku}</span>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{item.name}</span>
                    </div>
                  </label>
                ))}
                {items.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest">No hardware items found</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={processing} 
              className="group relative w-full overflow-hidden rounded-[2rem] bg-emerald-600 p-6 text-white shadow-xl hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              <div className="relative z-10 flex items-center justify-center gap-4">
                <span className="text-sm font-black uppercase tracking-[0.25em]">{processing ? 'Processing...' : 'Register Supplier'}</span>
                {!processing && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-2 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>}
              </div>
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Suppliers ({list.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">Supplier Name</th>
                  <th className="px-6 py-4 text-left">Contact</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === s.id ? (
                        <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full rounded-lg border-slate-200 text-xs" />
                      ) : (
                        <span className="font-bold text-slate-700">{s.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === s.id ? (
                        <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full rounded-lg border-slate-200 text-xs" />
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-slate-600 font-medium">{s.contact_person || '-'}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{s.phone || '-'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === s.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(s.id)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(s)} className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Edit</button>
                          <button onClick={() => deleteSupplier(s.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {editingId && (
          <div className="bg-white rounded-3xl shadow-lg border-2 border-emerald-500 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500 py-4 px-6 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                Editing SKUs for: {editData.name}
              </h3>
              <button onClick={() => setEditingId(null)} className="text-white/80 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                {items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(editData.item_ids || []).includes(item.id)} 
                      onChange={() => toggleItem(item.id, true)}
                      className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500/20 transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 group-hover:text-emerald-700 transition-colors">{item.sku}</span>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{item.name}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setEditingId(null)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={() => saveEdit(editingId)} disabled={processing} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                  {processing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
