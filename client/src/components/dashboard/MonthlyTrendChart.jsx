import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartAnimation, useInView } from '../../hooks/useInView';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fmtMonth } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

// Change over time, one series -> columns, single accent hue, no legend.
export default function MonthlyTrendChart({ data }) {
  const c = useThemeColors();
  const anim = useChartAnimation();
  const [ref, inView] = useInView();
  if (!data?.length) return <Empty />;
  return (
    <div ref={ref} className="h-64 sm:h-72">
      {inView && (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
          <XAxis
            dataKey="month"
            tickFormatter={fmtMonth}
            tick={{ fill: c.muted, fontSize: 12 }}
            axisLine={{ stroke: c.axis }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: c.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: c['accent-wash'] }}
            content={<ChartTooltip labelFormatter={fmtMonth} />}
          />
          <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={24} {...anim} />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}

const Empty = () => <div className="py-12 text-center text-sm text-muted">No data</div>;
