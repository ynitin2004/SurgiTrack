// Shared Tailwind class strings for form controls and buttons.
export const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-wash';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-critical px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60';
export const btnSmall = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50';

export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;
