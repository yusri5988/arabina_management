import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline/index.js';

const normalizeQty = (value, step, min, max) => {
  const numeric = Number(value || 0);
  const clamped = Math.max(min, Math.min(numeric, max ?? Infinity));
  const stepString = String(step);
  const decimals = stepString.includes('.') ? stepString.split('.')[1].length : 0;
  const snapped = step > 0
    ? min + (Math.round((clamped - min) / step) * step)
    : clamped;

  if (decimals > 0) {
    return Number(snapped.toFixed(decimals));
  }

  return Math.round(snapped);
};

export default function QtyInput({ value, onChange, min = 0, max, step = 1, label, className = '' }) {
  const displayValue = value === '' ? '' : normalizeQty(value, step, min, max);
  const normalizedValue = Number(displayValue || 0);

  return (
    <div className="space-y-1.5">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-[34px] focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
        <button
          type="button"
          onClick={() => onChange(normalizeQty(Number(displayValue || 0) - step, step, min, max))}
          className="px-2 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 hover:bg-slate-100 text-slate-500"
        >
          <MinusIcon className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(e.target.value === '' ? '' : normalizeQty(e.target.value, step, min, max))}
          className="w-full border-none text-center text-xs font-bold text-slate-700 focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(normalizeQty(normalizedValue + step, step, min, max))}
          className="px-2 h-full flex items-center justify-center bg-slate-50 border-l border-slate-200 hover:bg-slate-100 text-slate-500"
        >
          <PlusIcon className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
