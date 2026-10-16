import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, FileSpreadsheet, Loader2, Presentation } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { control } from '../common/ui';

const PERIODS = [
  { key: 'month', label: 'Monthly' },
  { key: 'quarter', label: 'Quarterly' },
  { key: 'all', label: 'All surgeries' },
];
const FORMATS = [
  { key: 'ppt', label: 'PowerPoint', hint: 'Slides with charts', icon: Presentation },
  { key: 'xlsx', label: 'Excel', hint: 'Data sheets + charts', icon: FileSpreadsheet },
];

// "Export" button + panel: pick a period (month / quarter / all), then a
// format. reportBase is the API prefix that owns …/report for this surgeon
// ('/me', '/me/team/:id' or '/surgeons/:id').
export default function ExportMenu({ reportBase, className = '' }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [period, setPeriod] = useState('month');
  const [choice, setChoice] = useState({ month: '', quarter: '' });
  const ref = useRef(null);

  const { data: periods, isLoading } = useQuery({
    queryKey: ['report-periods', reportBase],
    queryFn: () => api.get(`${reportBase}/report/periods`).then((r) => r.data),
    enabled: open,
  });
  const options = period === 'month' ? periods?.months : period === 'quarter' ? periods?.quarters : null;
  const value = period === 'all' ? null : choice[period] || options?.[0]?.value || '';
  const noData = period !== 'all' && periods && !options?.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(format) {
    setBusy(format);
    try {
      const [{ data: report }, lib] = await Promise.all([
        api.get(`${reportBase}/report`, { params: { period, ...(value ? { value } : {}) } }),
        import('../../utils/exportReport'),
      ]);
      await (format === 'ppt' ? lib.exportPpt(report) : lib.exportXlsx(report));
      toast(`${format === 'ppt' ? 'PowerPoint' : 'Excel'} report for ${report.period.label} downloaded.`, 'success');
      setOpen(false);
    } catch (err) {
      console.error('export failed', err);
      toast(err.response?.data?.message || 'Export failed — please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink shadow-card transition hover:border-brand/40 hover:text-brand"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
        {busy ? 'Preparing…' : 'Export'}
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Export report"
          className="pop-in absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 shadow-card"
        >
          <p className="label-caps mb-2 text-muted">Report period</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1" role="radiogroup" aria-label="Report period">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  period === p.key ? 'bg-surface text-brand shadow-sm' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period !== 'all' && (
            <label className="mt-3 block">
              <span className="sr-only">{period === 'month' ? 'Month' : 'Quarter'}</span>
              <select
                className={control}
                value={value}
                disabled={isLoading || noData}
                onChange={(e) => setChoice((c) => ({ ...c, [period]: e.target.value }))}
              >
                {isLoading && <option>Loading…</option>}
                {noData && <option>No dated surgeries</option>}
                {options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} · {o.count} case{o.count === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {period === 'all' && <p className="mt-3 text-xs text-muted">Every recorded surgery, with the month-by-month trend.</p>}

          <p className="label-caps mt-4 mb-2 text-muted">Download as</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                disabled={Boolean(busy) || isLoading || noData}
                onClick={() => run(f.key)}
                className="flex flex-col items-start gap-1 rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-surface-2 disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {busy === f.key ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <f.icon size={15} className="text-brand" aria-hidden />}
                  {f.label}
                </span>
                <span className="text-xs text-muted">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
