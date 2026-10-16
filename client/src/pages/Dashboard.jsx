import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, CalendarDays, ClipboardList, PieChart as PieIcon, Stethoscope, Timer, Trophy } from 'lucide-react';
import api from '../api/axios';
import Card from '../components/common/Card';
import SurgeryTable from '../components/common/SurgeryTable';
import StatCard from '../components/dashboard/StatCard';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart';
import RankedBarChart from '../components/dashboard/RankedBarChart';
import SurgeryTypePie from '../components/dashboard/SurgeryTypePie';
import { fmtDate, fmtNumber } from '../utils/format';

// Admin overview. Initial load via REST; afterwards the ['summary'] cache is
// replaced in place by the "stats:update" socket event.
export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get('/stats/summary').then((r) => r.data),
  });

  if (isLoading) return <PageSkeleton />;
  if (error) return <div className="text-critical">⚠ Could not load dashboard data.</div>;

  const t = data.totals;
  const latest = t.latestSurgeryDate ? fmtDate(new Date(t.latestSurgeryDate).getTime()) : '—';

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Surgery analytics"
        subtitle={`Programme-wide robotic surgery metrics · latest recorded surgery ${latest}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard hero icon={Activity} label="Total surgeries" value={fmtNumber(t.surgeries)} note={`across ${fmtNumber(t.hospitals)} hospitals`} />
        <StatCard icon={Stethoscope} tone="violet" label="Surgeons" value={fmtNumber(t.surgeons)} note="registered surgeon profiles" />
        <StatCard
          icon={CalendarDays}
          tone="amber"
          label="This month"
          value={fmtNumber(t.surgeriesThisMonth)}
          note={`${fmtNumber(t.surgeriesThisWeek)} in the last 7 days · ${fmtNumber(t.surgeriesToday)} today`}
        />
        <StatCard
          icon={Timer}
          tone="good"
          label="Avg. duration"
          value={t.avgSurgeryDurationMin ? `${t.avgSurgeryDurationMin} min` : '—'}
          note="excludes missing or implausible timings"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Surgeries per month" subtitle="Most recent 12 months with recorded surgeries" icon={BarChart3}>
          <MonthlyTrendChart data={data.monthlyTrend} />
        </Card>
        <Card title="Surgery types" subtitle="Share of all surgeries" icon={PieIcon}>
          <SurgeryTypePie data={data.byCategory} />
        </Card>
      </div>

      <Card
        title="Top 10 surgeons"
        subtitle="By number of surgeries, all time — click a bar to open the surgeon"
        icon={Trophy}
      >
        <RankedBarChart
          rows={data.topSurgeons.map((s) => ({ label: s.name, value: s.count, id: s.surgeonId }))}
          labelWidth={190}
          onSelect={(row) => row.id && navigate(`/surgeons/${row.id}`)}
        />
      </Card>

      <Card title="Recent surgeries" subtitle="Latest 10 records — refreshes live" icon={ClipboardList}>
        <SurgeryTable rows={data.recentSurgeries} showDuration={false} />
      </Card>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl md:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading">
      <div className="h-8 w-64 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-2 sm:h-36" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-surface-2" />
    </div>
  );
}
