// Shared hover tooltip: text in ink tokens, a swatch carries the series identity.
export default function ChartTooltip({ active, payload, label, labelFormatter, unit = 'surgeries' }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-ink">{labelFormatter ? labelFormatter(label) : label}</div>
      <div className="flex items-center gap-2 text-ink-2">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color || p.fill }} />
        <span className="tabular font-semibold text-ink">{Number(p.value).toLocaleString('en-IN')}</span>
        <span>{unit}</span>
      </div>
    </div>
  );
}
