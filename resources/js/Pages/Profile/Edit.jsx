import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import FloatingAlert from '../../components/FloatingAlert';
import { apiFetchJson } from '../../lib/http';

export default function Edit({ user }) {
  const { flash } = usePage().props;
  const [notification, setNotification] = useState(
    flash?.success ? { type: 'success', message: flash.success } : null
  );

  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profileProcessing, setProfileProcessing] = useState(false);
  const [passwordProcessing, setPasswordProcessing] = useState(false);

  const submitProfile = async (e) => {
    e.preventDefault();
    setNotification(null);
    setProfileErrors({});
    setProfileProcessing(true);

    try {
      const { response, payload } = await apiFetchJson('/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Profile updated successfully.' });
      } else if (response.status === 422) {
        setProfileErrors(payload.errors ?? {});
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to update profile.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setProfileProcessing(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setNotification(null);
    setPasswordErrors({});
    setPasswordProcessing(true);

    try {
      const { response, payload } = await apiFetchJson('/profile/password', {
        method: 'PUT',
        body: JSON.stringify(passwordData),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: payload.message ?? 'Password updated successfully.' });
        setPasswordData({
          current_password: '',
          password: '',
          password_confirmation: '',
        });
      } else if (response.status === 422) {
        setPasswordErrors(payload.errors ?? {});
      } else {
        setNotification({ type: 'error', message: payload.message ?? 'Failed to update password.' });
      }
    } catch (_) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setPasswordProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout title="My Profile" backUrl="__back__">
      <Head title="Profile" />

      <div className="space-y-6">
        <FloatingAlert
          type={notification?.type}
          message={notification?.message}
          onClose={() => setNotification(null)}
        />

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Profile Information</h2>
          <form onSubmit={submitProfile} className="mt-5 space-y-5">
            <div>
              <label htmlFor="profile_name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
              <input
                id="profile_name"
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                required
              />
              {profileErrors.name && <p className="text-xs text-red-500 mt-1.5 px-1">{profileErrors.name[0]}</p>}
            </div>

            <div>
              <label htmlFor="profile_email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <input
                id="profile_email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                required
              />
              {profileErrors.email && <p className="text-xs text-red-500 mt-1.5 px-1">{profileErrors.email[0]}</p>}
            </div>

            <button
              type="submit"
              disabled={profileProcessing}
              className="w-full bg-arabina-green text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-900 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md"
            >
              {profileProcessing ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Update Password</h2>
          <form onSubmit={submitPassword} className="mt-5 space-y-5">
            <div>
              <label htmlFor="current_password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Current Password</label>
              <input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                required
              />
              {passwordErrors.current_password && <p className="text-xs text-red-500 mt-1.5 px-1">{passwordErrors.current_password[0]}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
              <input
                id="password"
                type="password"
                value={passwordData.password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                required
              />
              {passwordErrors.password && <p className="text-xs text-red-500 mt-1.5 px-1">{passwordErrors.password[0]}</p>}
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
              <input
                id="password_confirmation"
                type="password"
                value={passwordData.password_confirmation}
                onChange={(e) => setPasswordData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-arabina-accent focus:border-arabina-accent focus:outline-none bg-slate-50 transition-colors"
                required
              />
              {passwordErrors.password_confirmation && <p className="text-xs text-red-500 mt-1.5 px-1">{passwordErrors.password_confirmation[0]}</p>}
            </div>

            <button
              type="submit"
              disabled={passwordProcessing}
              className="w-full bg-[#1b580e] text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-950 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md"
            >
              {passwordProcessing ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
