import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartAnimation, useInView } from '../../hooks/useInView';
import { useElementWidth, useMergedRef } from '../../hooks/useElementWidth';
import { useThemeColors } from '../../hooks/useThemeColors';
import ChartTooltip from './ChartTooltip';

// Magnitude across named items (categories, surgeons) -> horizontal bars,
// one accent hue, value at the bar tip in a text token. Bars grow in when
// the chart scrolls into view.
// rows: [{ label, value, onClick? }]
export default function RankedBarChart({ rows, labelWidth = 160, onSelect, unit = 'surgeries' }) {
  const c = useThemeColors();
  const anim = useChartAnimation();
  const [viewRef, inView] = useInView();
  const [sizeRef, width] = useElementWidth();
  const ref = useMergedRef(viewRef, sizeRef);
  if (!rows?.length) return <div className="py-12 text-center text-sm text-muted">No data</div>;
  const height = rows.length * 34 + 16;
  // on phones give the bars at least ~45% of the width
  const yWidth = width ? Math.min(labelWidth, Math.max(96, Math.round(width * 0.42))) : labelWidth;
  const maxChars = Math.max(10, Math.floor(yWidth / 6.6));
  const short = (v) => (String(v).length > maxChars ? `${String(v).slice(0, maxChars - 1)}…` : v);

  return (
    <div ref={ref} style={{ height }}>
      {inView && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={yWidth}
              tick={{ fill: c['ink-2'], fontSize: 12 }}
              tickFormatter={short}
              axisLine={{ stroke: c.axis }}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: c['accent-wash'] }} content={<ChartTooltip unit={unit} />} />
            <Bar
              dataKey="value"
              fill={c.accent}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              {...anim}
              cursor={onSelect ? 'pointer' : undefined}
              onClick={onSelect ? (d) => onSelect(d.payload ?? d) : undefined}
            >
              <LabelList
                dataKey="value"
                position="right"
                fill={c.ink}
                fontSize={12}
                formatter={(v) => Number(v).toLocaleString('en-IN')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
