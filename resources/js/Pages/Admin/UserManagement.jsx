import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { apiFetchJson } from '../../lib/http';
import { 
  UsersIcon, 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  ShieldCheckIcon,
  XMarkIcon,
  PlusIcon,
  KeyIcon,
  EnvelopeIcon,
  UserIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline/index.js';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'store_keeper', // Default hidden role
  module_permissions: [],
};

export default function UserManagement({ users, moduleOptions = [] }) {
  const [data, setData] = useState(initialForm);
  const [accounts, setAccounts] = useState(users ?? []);
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const query = searchQuery.toLowerCase();
    return accounts.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [accounts, searchQuery]);

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModulePermission = (moduleKey) => {
    setData((prev) => {
      const current = prev.module_permissions ?? [];
      const next = current.includes(moduleKey)
        ? current.filter((key) => key !== moduleKey)
        : [...current, moduleKey];
      return { ...prev, module_permissions: next };
    });
  };

  const resetForm = () => {
    setData(initialForm);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleValidationError = (payload) => {
    setErrors(payload?.errors ?? {});
    setNotification({
      type: 'error',
      message: 'Please fix the form errors.',
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setErrors({});
    setProcessing(true);

    const isEditing = Boolean(editingId);
    const endpoint = isEditing ? `/admin/users/${editingId}` : '/admin/users';
    const method = isEditing ? 'PUT' : 'POST';

    const requestPayload = {
      name: data.name,
      email: data.email,
      role: data.role,
      module_permissions: data.module_permissions ?? [],
      ...(data.password ? { password: data.password } : {}),
    };

    try {
      const { response, payload } = await apiFetchJson(endpoint, {
        method,
        body: JSON.stringify(requestPayload),
      });

      if (!isEditing && response.status === 201 && payload?.data) {
        setAccounts((prev) => [payload.data, ...prev]);
        resetForm();
        setNotification({
          type: 'success',
          message: payload?.message ?? 'User created successfully.',
        });
        return;
      }

      if (isEditing && response.ok && payload?.data) {
        setAccounts((prev) => prev.map((user) => (user.id === payload.data.id ? payload.data : user)));
        resetForm();
        setNotification({
          type: 'success',
          message: payload?.message ?? 'User updated successfully.',
        });
        return;
      }

      if (response.status === 422) {
        handleValidationError(payload);
        return;
      }

      setNotification({
        type: 'error',
        message: payload?.message ?? 'Request failed. Please try again.',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Network error. Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (user) => {
    setNotification(null);
    setErrors({});
    setEditingId(user.id);
    setData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      module_permissions: user.module_permissions ?? [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setNotification(null);
    setDeletingId(user.id);

    try {
      const { response, payload } = await apiFetchJson(`/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAccounts((prev) => prev.filter((item) => item.id !== user.id));

        if (editingId === user.id) {
          resetForm();
        }

        setNotification({
          type: 'success',
          message: payload?.message ?? 'User deleted successfully.',
        });
        return;
      }

      setNotification({
        type: 'error',
        message: payload?.message ?? 'Failed to delete user.',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Network error. Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getInitialsColor = (name) => {
    const colors = [
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
    ];
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  return (
    <AuthenticatedLayout title="User Management" backUrl="__back__">
      <Head title="User Management" />

      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Management</h1>
            <p className="text-slate-500 text-sm font-medium">Control system access and staff permissions.</p>
          </div>
          <button
            onClick={() => {
              if (showForm && editingId) {
                resetForm();
                setShowForm(true);
              } else {
                setShowForm(!showForm);
              }
            }}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 shadow-lg active:scale-95 ${
              showForm && !editingId 
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
              : 'bg-arabina-green text-white hover:bg-emerald-900 shadow-emerald-200'
            }`}
          >
            {showForm && !editingId ? (
              <>
                <XMarkIcon className="w-5 h-5" />
                Close Form
              </>
            ) : (
              <>
                <UserPlusIcon className="w-5 h-5" />
                Add New User
              </>
            )}
          </button>
        </div>

        {notification && (
          <div className={`animate-in fade-in slide-in-from-top-4 duration-300 rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-sm ${
            notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
            : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <p className="text-sm font-bold">{notification.message}</p>
          </div>
        )}

        {/* Create/Edit Form Panel */}
        {showForm && (
          <div className="animate-in zoom-in-95 duration-300 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${editingId ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {editingId ? <PencilSquareIcon className="w-6 h-6" /> : <UserPlusIcon className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Account Details' : 'Register New Account'}</h2>
                  <p className="text-xs text-slate-500 font-medium">Please fill in the information below.</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={submit} className="p-8 space-y-8">
              <div className="space-y-8">
                {/* Top Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1">
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" /> Full Name
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-arabina-accent transition-all font-semibold"
                      placeholder="e.g. Ahmad bin Abu"
                      required
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name[0]}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1">
                      <EnvelopeIcon className="w-3.5 h-3.5 text-slate-500" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-arabina-accent transition-all font-semibold"
                      placeholder="name@email.com"
                      required
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email[0]}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1">
                      <KeyIcon className="w-3.5 h-3.5 text-slate-500" /> Password
                    </label>
                    <input
                      type="password"
                      value={data.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-arabina-accent transition-all font-semibold"
                      placeholder={editingId ? "Leave blank to keep current" : "Minimum 6 characters"}
                      required={!editingId}
                    />
                    {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password[0]}</p>}
                  </div>
                </div>

                {/* Permissions - Full Width */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-500" /> Module Access
                  </label>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {moduleOptions.map((module) => (
                      <label 
                        key={module.key} 
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          (data.module_permissions ?? []).includes(module.key)
                          ? 'bg-white border-emerald-200 shadow-sm'
                          : 'border-transparent hover:bg-white/50'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">{module.label}</span>
                        <input
                          type="checkbox"
                          checked={(data.module_permissions ?? []).includes(module.key)}
                          onChange={() => toggleModulePermission(module.key)}
                          className="w-4 h-4 rounded border-slate-300 text-arabina-green focus:ring-arabina-green transition-all"
                        />
                      </label>
                    ))}
                    {moduleOptions.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4 col-span-full">No modules available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-arabina-green text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-900 shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {processing ? 'Processing...' : (editingId ? 'Save Changes' : 'Register Now')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filters */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none group-focus-within:text-arabina-green text-slate-400 transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 text-sm shadow-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-arabina-accent transition-all font-semibold placeholder:text-slate-300"
          />
        </div>

        {/* User List Table Style Grid */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Staff Directory</h3>
            <span className="bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
              {filteredAccounts.length} Staff
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Module Access</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner border ${getInitialsColor(user.name)}`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.name}</div>
                            <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1">
                          {(user.module_permissions ?? []).slice(0, 3).map(mod => (
                            <span key={mod} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">
                              {mod}
                            </span>
                          ))}
                          {(user.module_permissions ?? []).length > 3 && (
                            <span className="text-[9px] font-bold text-slate-400 ml-1">
                              +{(user.module_permissions ?? []).length - 3} more
                            </span>
                          )}
                          {(user.module_permissions ?? []).length === 0 && (
                            <span className="text-[10px] text-slate-300 italic font-medium">No access</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-all active:scale-90"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteUser(user)}
                            disabled={deletingId === user.id}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-all active:scale-90"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <UsersIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No users found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
