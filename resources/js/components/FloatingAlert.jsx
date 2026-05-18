import { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function FloatingAlert({ type = 'success', message, onClose }) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (message) {
      setRendered(true);
      const timer = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setRendered(false);
      onClose();
    }, 200);
  };

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pointer-events-none">
      <div
        className={`pointer-events-auto mt-20 w-full max-w-md mx-4 transition-all duration-200 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div
          className={`rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-sm ${
            type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
              : 'border-red-200 bg-red-50/95 text-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {type === 'success' ? (
              <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-semibold flex-1 leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={handleClose}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                type === 'success'
                  ? 'hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600'
                  : 'hover:bg-red-100 text-red-400 hover:text-red-600'
              }`}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                type === 'success'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
