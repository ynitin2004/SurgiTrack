import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartAnimation, useInView } from '../../hooks/useInView';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fmtCategory } from '../../utils/format';

// Share of surgery types. Max 4 named slices (the validated all-pairs palette)
// + a neutral "Other"; every slice is also named in the legend with count and
// percentage, so identity never relies on colour alone.
const MAX_SLICES = 4;

export default function SurgeryTypePie({ data }) {
  const c = useThemeColors();
  const anim = useChartAnimation(1200);
  const [ref, inView] = useInView();
  const rows = (data || []).filter((d) => d.count > 0);
  if (!rows.length) return <div className="py-12 text-center text-sm text-muted">No surgeries recorded</div>;

  const total = rows.reduce((s, r) => s + r.count, 0);
  const head = rows.slice(0, MAX_SLICES).map((r, i) => ({
    key: r.category,
    label: fmtCategory(r.category),
    value: r.count,
    color: c[`pie-${i + 1}`],
  }));
  const rest = rows.slice(MAX_SLICES);
  if (rest.length) {
    head.push({
      key: 'other',
      label: `Other (${rest.length} type${rest.length > 1 ? 's' : ''})`,
      value: rest.reduce((s, r) => s + r.count, 0),
      color: c['pie-other'],
    });
  }
  const pct = (v) => `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)}%`;

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0 sm:h-[200px] sm:w-[200px]">
        {inView && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={head}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke={c.surface}
              strokeWidth={2}
              {...anim}
            >
              {head.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card">
                    <div className="mb-1 font-semibold text-ink">{payload[0].name}</div>
                    <div className="flex items-center gap-2 text-ink-2">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: payload[0].payload.color }} />
                      <span className="tabular font-semibold text-ink">{payload[0].value.toLocaleString('en-IN')}</span>
                      surgeries · {pct(payload[0].value)}
                    </div>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-ink">{total.toLocaleString('en-IN')}</span>
          <span className="text-xs text-muted">surgeries</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2.5 sm:w-auto sm:min-w-[230px] sm:flex-1">
        {head.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-3 text-sm ${inView ? 'rise' : 'opacity-0'}`} style={{ '--i': i }}>
            <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: s.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
            <span className="tabular font-semibold text-ink">{s.value.toLocaleString('en-IN')}</span>
            <span className="tabular w-11 shrink-0 text-right text-xs text-muted">{pct(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
