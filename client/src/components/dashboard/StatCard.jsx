import { useEffect, useRef, useState } from 'react';

const TONES = {
  brand: 'bg-brand-wash text-brand',
  violet: 'bg-violet-wash text-violet',
  amber: 'bg-amber-wash text-warning-ink',
  good: 'bg-good-wash text-good-ink',
};

// Stat tile: icon + caps label · value · note. `hero` renders the gradient
// lead tile; `children` replaces the value (e.g. a ranked list). Briefly
// highlights when a live update changes the value. Compact on phones.
export default function StatCard({ label, value, note, icon: Icon, hero = false, tone = 'brand', className = '', children }) {
  const prev = useRef(value);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (prev.current !== value) setFlashKey((k) => k + 1);
    prev.current = value;
  }, [value]);

  if (hero) {
    return (
      <div key={flashKey} className={`bg-hero relative overflow-hidden rounded-2xl p-4 text-white shadow-card sm:p-6 ${className}`}>
        <span className="absolute -top-10 -right-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
        <span className="absolute -right-6 -bottom-16 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-2 text-white/90">
          {Icon && <Icon size={16} aria-hidden />}
          <span className="label-caps">{label}</span>
        </div>
        <div className="tabular relative mt-3 text-4xl font-extrabold tracking-tight sm:mt-5 sm:text-5xl">{value}</div>
        {note && <div className="relative mt-1.5 text-xs font-semibold text-white/85 sm:mt-2 sm:text-sm">{note}</div>}
      </div>
    );
  }

  const long = String(value ?? '').length > 12;
  return (
    <div
      key={flashKey}
      className={`min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6 ${flashKey ? 'flash' : ''} ${className}`}
    >
      <div className="flex items-center gap-2 text-ink-2">
        {Icon && (
          <span className={`shrink-0 rounded-md p-1 ${TONES[tone]}`} aria-hidden>
            <Icon size={14} />
          </span>
        )}
        <span className="label-caps min-w-0 leading-tight">{label}</span>
      </div>
      {children ?? (
        <div
          className={`mt-3 font-extrabold tracking-tight break-words text-ink sm:mt-5 ${
            long ? 'text-lg leading-snug sm:text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {value}
        </div>
      )}
      {note && <div className="mt-1.5 text-xs text-muted">{note}</div>}
    </div>
  );
}
