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
      <div className="min-h-screen bg-gradient-to-t from-[#0d2a07] to-[#1b580e] flex flex-col justify-center items-center p-6 text-slate-900">
        <div className="w-full max-w-md">
          {/* Logo / Branding */}
          <div className="text-center mb-0">
            <div className="inline-flex items-center justify-center mb-0 transition-transform hover:scale-105 duration-500">
              <img
                src="/images/arabina%20logo%20png.png"
                alt="Arabina Eco Tiny Homes"
                className="h-28 w-auto object-contain"
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-8 py-8 md:px-12 md:py-10 border border-white/10">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Sign In</h2>
              <div className="h-1.5 w-12 bg-[#10b981] mx-auto mt-3 rounded-full"></div>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 animate-shake">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-red-600 leading-relaxed">
                  {errors.email || errors.password || "Invalid credentials. Please check your email and password."}
                </p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-2 ml-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-[#1b580e] text-slate-300 transition-colors">
                    <EnvelopeIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 pl-14 pr-5 py-5 text-sm text-black focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] focus:outline-none bg-slate-50 transition-all font-semibold placeholder:text-slate-400"
                    placeholder="name@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-2 ml-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:text-[#1b580e] text-slate-300 transition-colors">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 pl-14 pr-5 py-5 text-sm text-black focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] focus:outline-none bg-slate-50 transition-all font-semibold placeholder:text-slate-400"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-[#1b580e] text-white py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] hover:bg-[#152a12] disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-black/20 mt-4"
              >
                {processing ? 'Logging in...' : 'Sign In Now'}
              </button>
            </form>
          </div>

          <p className="text-center mt-12 text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">
            Copyright &copy; 2025 Arabina - All Rights Reserved
          </p>
        </div>
      </div>
    </>
  );
}
