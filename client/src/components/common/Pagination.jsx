import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return null;
  const btn =
    'inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-brand-wash';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-ink-2">
      <span className="tabular">
        Page {page} of {pages} · {total.toLocaleString('en-IN')} records
      </span>
      <div className="flex gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>
        <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
