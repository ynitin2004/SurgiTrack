const nf = new Intl.NumberFormat('en-IN');

export const fmtNumber = (n) => (n == null ? '—' : nf.format(n));

export function fmtDate(ms) {
  const n = Number(ms);
  if (!ms || Number.isNaN(n)) return '—';
  return new Date(n).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDuration(ms) {
  const n = Number(ms);
  if (!ms || Number.isNaN(n) || n <= 0) return '—';
  const mins = Math.round(n / 60000);
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
}

// "gastrointestinal_surgery" -> "Gastrointestinal surgery"
export function fmtCategory(key) {
  if (!key) return 'Unknown';
  const s = String(key).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "2025-08" -> "Aug 25"
export function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export const surgeonNames = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((s) => s?.label)
    .filter((l) => l && !['Data Unavailable', 'Unknown', '-'].includes(l))
    .join(', ') || '—';

// relative age of a past date: "today", "yesterday", "12 days ago", "3 months ago"
export function fmtAgo(ms, now = Date.now()) {
  const n = Number(ms);
  if (!ms || Number.isNaN(n)) return '';
  const startOf = (t) => {
    const d = new Date(t);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  // surgery dates are UTC midnight of the calendar day
  const days = Math.round((startOf(now) - n) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365.25);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
