import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, CalendarClock, ChevronRight, Search, Stethoscope, Users } from 'lucide-react';
import api from '../api/axios';
import TierBadge from '../components/common/TierBadge';
import { control } from '../components/common/ui';
import { initials } from '../components/surgeon/SurgeonProfileView';
import { fmtAgo, fmtCategory, fmtDate, fmtNumber } from '../utils/format';
import { PageHeader, PageSkeleton } from './Dashboard';

// Surgeon portal: every surgeon aligned to the same hospital, one KPI card
// each. Cards open that surgeon's dashboard (the API checks the hospital).
export default function Team() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => api.get('/me/team').then((r) => r.data),
  });

  const members = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.members || [];
    return q ? all.filter((m) => `${m.surgeonName} ${m.areaOfExpertise || ''}`.toLowerCase().includes(q)) : all;
  }, [data, search]);

  if (isLoading) return <PageSkeleton />;
  if (error) return <p className="text-critical">⚠ {error.response?.data?.message || 'Could not load your team.'}</p>;
  if (!data.hospital) {
    return (
      <div className="space-y-4">
        <PageHeader title="My team" />
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted shadow-card">
          Your surgeon profile is not aligned to a hospital yet, so there is no team to show.
        </p>
      </div>
    );
  }

  const all = data.members;
  const active = all.filter((m) => m.surgeryCount > 0).length;
  const total = all.reduce((n, m) => n + m.surgeryCount, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="My team" subtitle={`Surgeons aligned to ${data.hospital.name || 'your hospital'}`} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Summary icon={Users} label="Surgeons" value={fmtNumber(all.length)} />
        <Summary icon={Stethoscope} label="With cases" value={fmtNumber(active)} />
        <Summary icon={Activity} label="Team surgeries" value={fmtNumber(total)} />
      </div>

      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          className={`${control} pl-10`}
          placeholder="Search by name or expertise…"
          aria-label="Search team"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {members.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {members.map((m, i) => (
            <li key={m._id} className="rise" style={{ '--i': Math.min(i, 8) }}>
              <MemberCard m={m} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted">No surgeons match “{search}”.</p>
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-5">
      <div className="flex items-center gap-1.5 text-ink-2">
        <Icon size={14} className="shrink-0 text-brand" aria-hidden />
        <span className="label-caps min-w-0 leading-tight">{label}</span>
      </div>
      <div className="tabular mt-1.5 text-xl font-extrabold text-ink sm:mt-2 sm:text-2xl">{value}</div>
    </div>
  );
}

function MemberCard({ m }) {
  return (
    <Link
      to={m.isMe ? '/' : `/team/${m._id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-brand sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-hero flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white">
          {initials(m.surgeonName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold break-words text-ink">{m.surgeonName || '—'}</span>
            {m.isMe && <span className="rounded-full bg-brand-wash px-2 py-0.5 text-[0.68rem] font-bold text-brand-ink">You</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TierBadge count={m.surgeryCount} size="sm" />
            {m.areaOfExpertise && <span className="truncate text-xs text-muted">{m.areaOfExpertise}</span>}
          </div>
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="tabular text-3xl leading-none font-extrabold text-ink">{fmtNumber(m.surgeryCount)}</div>
          <div className="mt-1 text-xs text-muted">surgeries</div>
        </div>
        {m.topCategory && (
          <span className="rounded-full bg-violet-wash px-2.5 py-1 text-xs font-semibold text-violet">{fmtCategory(m.topCategory.name)}</span>
        )}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-ink-2">
        {m.surgeryCount ? (
          <>
            <p className="truncate" title={m.topProcedure?.name}>
              <span className="text-muted">Top procedure · </span>
              {m.topProcedure ? `${m.topProcedure.name} (${fmtNumber(m.topProcedure.count)})` : '—'}
            </p>
            <p className="flex items-center gap-1">
              <CalendarClock size={12} className="text-muted" aria-hidden />
              {m.lastSurgeryDate ? `Last surgery ${fmtDate(m.lastSurgeryDate)} · ${fmtAgo(m.lastSurgeryDate)}` : 'No dated surgeries'}
            </p>
          </>
        ) : (
          <p className="text-muted">No cases recorded yet</p>
        )}
      </div>
    </Link>
  );
}
