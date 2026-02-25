import { Head, useForm } from '@inertiajs/react';
import { 
  LockClosedIcon, 
  EnvelopeIcon 
} from '@heroicons/react/24/outline/index.js';

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <>
      <Head title="Login" />
      <div className="min-h-screen bg-[#2D5A27] flex flex-col justify-center items-center p-6 text-slate-900">
        <div className="w-full max-w-md">
          {/* Logo / Branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-500">
              <img 
                src="/images/logo.jpg" 
                alt="Arabina Eco Tiny Homes" 
                className="h-28 w-auto rounded-3xl shadow-2xl border-4 border-white/20"
              />
            </div>
            <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Inventory System</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 md:p-12 border border-white/10">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Sign In</h2>
              <div className="h-1.5 w-12 bg-[#10b981] mx-auto mt-3 rounded-full"></div>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-[#2D5A27] text-slate-300 transition-colors">
                    <EnvelopeIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 pl-14 pr-5 py-5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] focus:outline-none bg-slate-50 transition-all font-semibold placeholder:text-slate-300"
                    placeholder="name@email.com"
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-2 px-2 font-bold">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-[#2D5A27] text-slate-300 transition-colors">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 pl-14 pr-5 py-5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] focus:outline-none bg-slate-50 transition-all font-semibold placeholder:text-slate-300"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-2 px-2 font-bold">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-[#1E3D1A] text-white py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] hover:bg-[#152a12] disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-black/20 mt-4"
              >
                {processing ? 'Logging in...' : 'Sign In Now'}
              </button>
            </form>
          </div>

          <p className="text-center mt-12 text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">
            &copy; 2024 Arabina Sdn Bhd
          </p>
        </div>
      </div>
    </>
  );
}