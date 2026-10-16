import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Building2, ClipboardList, ListOrdered, PieChart as PieIcon, Stethoscope, Wrench } from 'lucide-react';
import Card from '../common/Card';
import SurgeryTable from '../common/SurgeryTable';
import TierBadge from '../common/TierBadge';
import StatCard from '../dashboard/StatCard';
import RankedBarChart from '../dashboard/RankedBarChart';
import ExportMenu from './ExportMenu';
import SurgeryTypePie from '../dashboard/SurgeryTypePie';
import { fmtAgo, fmtCategory, fmtDate, fmtNumber } from '../../utils/format';

export const initials = (name = '') =>
  name
    .replace(/^dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

// Shared by the admin "surgeon detail" page and the surgeon's own portal.
// allCasesHref: where "View all cases" points (role-specific); mascot: optional
// element that stands beside the name (surgeon's own dashboard); reportBase:
// API prefix for the period exports.
export default function SurgeonProfileView({ data, children, heading, allCasesHref, mascot, reportBase }) {
  const s = data.surgeon;
  const top = data.byCategory[0];
  const procedures = data.topProcedures || [];
  const last = data.lastSurgeryDate;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start gap-3 sm:items-center sm:gap-4">
        <div className="bg-hero flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-card sm:h-14 sm:w-14 sm:text-lg">
          {initials(s.surgeonName)}
        </div>
        <div className="min-w-0">
          {heading && <p className="label-caps text-brand">{heading}</p>}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-xl font-extrabold tracking-tight break-words text-ink sm:text-2xl">{s.surgeonName}</h1>
            <TierBadge count={data.surgeryCount} />
          </div>
          <p className="mt-0.5 text-sm text-ink-2">
            {[s.areaOfExpertise, s.hospitalName].filter(Boolean).join(' · ') || 'No profile details'}
            {s.hospitalAlignedDate && (
              <span className="text-muted"> · aligned since {fmtDate(new Date(s.hospitalAlignedDate).getTime())}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {last ? (
              <>
                Last surgery <span className="font-semibold text-ink-2">{fmtDate(last)}</span> · {fmtAgo(last)}
              </>
            ) : (
              'No dated surgeries recorded yet'
            )}
          </p>
        </div>
        {mascot && <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto">{mascot}</div>}
        {reportBase && <ExportMenu reportBase={reportBase} className="ml-auto self-start sm:self-center" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          hero
          className="col-span-2 xl:col-span-1"
          icon={Activity}
          label="Total surgeries"
          value={fmtNumber(data.surgeryCount)}
          note={`${fmtNumber(data.distinctProcedures)} different procedures`}
        />
        <StatCard
          icon={Stethoscope}
          tone="violet"
          label="Top surgery type"
          value={top ? fmtCategory(top.category) : '—'}
          note={top ? `${fmtNumber(top.count)} surgeries · ${data.byCategory.length} type${data.byCategory.length === 1 ? '' : 's'} in total` : undefined}
        />
        <StatCard icon={ListOrdered} tone="amber" label="Top 3 procedures" className="order-last col-span-2 xl:order-none xl:col-span-1">
          <TopProcedures items={procedures} />
        </StatCard>
        <StatCard icon={Building2} tone="good" label="Hospitals served" value={data.hospitalsServed}>
          <HospitalsServed list={data.hospitalsServedList || []} unlisted={data.unlistedHospitalCases || 0} />
        </StatCard>
      </div>

      {children}

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
        <Card title="Surgery types" subtitle="Share of all surgeries by type" icon={PieIcon}>
          <SurgeryTypePie data={data.byCategory} />
        </Card>
        <Card title="Most used instruments" subtitle="Times each instrument was used across all surgeries" icon={Wrench}>
          <RankedBarChart rows={data.instruments.map((i) => ({ label: i.name, value: i.count }))} labelWidth={190} unit="uses" />
        </Card>
      </div>

      <Card
        title="Recent surgeries"
        subtitle={last ? `Latest ${Math.min(10, data.recentSurgeries.length)} cases · most recent ${fmtDate(last)}` : 'Latest 10 cases'}
        icon={ClipboardList}
        action={
          allCasesHref && data.surgeryCount > 0 ? (
            <Link to={allCasesHref} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              View all {fmtNumber(data.surgeryCount)} cases <ArrowRight size={14} aria-hidden />
            </Link>
          ) : null
        }
      >
        <SurgeryTable rows={data.recentSurgeries} showSurgeon={false} />
      </Card>
    </div>
  );
}

// count + each hospital by name with its case count
function HospitalsServed({ list, unlisted }) {
  return (
    <>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:mt-5 sm:text-3xl">{fmtNumber(list.length)}</div>
      {list.length > 0 && (
        <ul className="mt-2 space-y-1">
          {list.map((h) => (
            <li key={h.name} className="flex items-baseline gap-2 text-xs" title={`${h.name} · ${h.count} cases`}>
              <span className="min-w-0 flex-1 truncate text-ink-2">{h.name}</span>
              <span className="tabular shrink-0 font-semibold text-ink">{fmtNumber(h.count)}</span>
            </li>
          ))}
        </ul>
      )}
      {unlisted > 0 && (
        <p className="mt-1.5 text-[0.7rem] text-muted">
          +{fmtNumber(unlisted)} case{unlisted === 1 ? '' : 's'} at a hospital missing from the hospital list
        </p>
      )}
    </>
  );
}

function TopProcedures({ items }) {
  if (!items.length) return <p className="mt-3 text-sm text-muted sm:mt-5">No procedures recorded</p>;
  const max = items[0].count;
  return (
    <ol className="mt-3 space-y-2.5 sm:mt-4">
      {items.map((p, i) => (
        <li key={p.name} className="rise" style={{ '--i': i }}>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="tabular w-4 shrink-0 font-extrabold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink" title={p.name}>
              {p.name}
            </span>
            <span className="tabular shrink-0 text-xs font-bold text-ink-2">{fmtNumber(p.count)}</span>
          </div>
          <div className="mt-1 ml-6 h-1 overflow-hidden rounded-full bg-amber-wash" aria-hidden>
            <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(4, (p.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
