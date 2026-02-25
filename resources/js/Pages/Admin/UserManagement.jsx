import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'store_keeper',
};

export default function UserManagement({ users }) {
  const [data, setData] = useState(initialForm);
  const [accounts, setAccounts] = useState(users ?? []);
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  const csrfToken = useMemo(
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    [],
  );

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setData(initialForm);
    setErrors({});
    setEditingId(null);
  };

  const handleValidationError = (payload) => {
    setErrors(payload?.errors ?? {});
    setNotification({
      type: 'error',
      message: 'Please fix the form errors and submit again.',
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
      ...(data.password ? { password: data.password } : {}),
    };

    try {
      const response = await fetch(endpoint, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json().catch(() => ({}));

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
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setNotification(null);
    setDeletingId(user.id);

    try {
      const response = await fetch(`/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
      });

      const payload = await response.json().catch(() => ({}));

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

  return (
    <AuthenticatedLayout title="User Management" backUrl="/dashboard">
      <Head title="User Management" />

      <div className="space-y-6">
        {notification?.type === 'success' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {notification.message}
          </div>
        )}

        {notification?.type === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? 'Edit Account' : 'Create Account'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={data.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1.5 px-1">{errors.name[0] ?? errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={data.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                  required
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5 px-1">{errors.email[0] ?? errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Password {editingId ? '(Leave blank to keep current)' : ''}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={data.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                  required={!editingId}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1.5 px-1">{errors.password[0] ?? errors.password}</p>}
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Role</label>
                <select
                  id="role"
                  name="role"
                  value={data.role}
                  onChange={(e) => updateField('role', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                >
                  <option value="store_keeper">Store Keeper</option>
                  <option value="procurement">Procurement</option>
                  <option value="finance">Finance</option>
                  <option value="sales">Sales</option>
                </select>
                {errors.role && <p className="text-xs text-red-500 mt-1.5 px-1">{errors.role[0] ?? errors.role}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-arabina-green text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-900 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md mt-2"
            >
              {processing ? (editingId ? 'Updating User...' : 'Creating User...') : (editingId ? 'Update Account' : 'Create Account')}
            </button>
          </form>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-2">Managed Users ({accounts.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.length > 0 ? (
              accounts.map((user) => (
                <div key={user.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="pr-3">
                      <h4 className="font-bold text-slate-900 leading-tight">{user.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 truncate">{user.email}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      user.role === 'procurement' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      user.role === 'finance' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                      user.role === 'sales' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                      'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[11px] font-medium text-slate-400">
                      Added {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.id}
                        className="text-[10px] font-bold text-red-600 uppercase tracking-wider px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-colors"
                      >
                        {deletingId === user.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white p-8 rounded-[2rem] text-center border border-slate-100 border-dashed">
                <p className="text-sm text-slate-400 font-medium">No managed users found yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
