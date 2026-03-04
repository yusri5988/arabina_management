import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline/index.js';

export default function QtyInput({ value, onChange, min = 0, max, label, className = '' }) {
  const displayValue = value === '' ? '' : Math.max(min, Math.min(Number(value || 0), max || Infinity));

  return (
    <div className="space-y-1.5">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-[34px] focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Number(displayValue || 0) - 1))}
          className="px-2 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 hover:bg-slate-100 text-slate-500"
        >
          <MinusIcon className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={displayValue}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full border-none text-center text-xs font-bold text-slate-700 focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(normalizedValue + 1, max || Infinity))}
          className="px-2 h-full flex items-center justify-center bg-slate-50 border-l border-slate-200 hover:bg-slate-100 text-slate-500"
        >
          <PlusIcon className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}