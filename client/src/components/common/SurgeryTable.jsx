import { Link } from 'react-router-dom';
import { Building2, Clock } from 'lucide-react';
import { fmtAgo, fmtCategory, fmtDate, fmtDuration } from '../../utils/format';

const BAD = ['Data Unavailable', 'Unknown', '-'];
const th = 'label-caps py-3 pr-4 font-bold text-muted';

// Table from md up; stacked cards on phones so nothing needs sideways scrolling.
export default function SurgeryTable({ rows, showDuration = true, showSurgeon = true }) {
  if (!rows?.length) return <div className="py-8 text-center text-sm text-muted">No surgeries found</div>;
  return (
    <>
      <ul className="-mx-1 divide-y divide-line md:hidden">
        {rows.map((s) => (
          <li key={s._id} className="px-1 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold break-words text-ink">{s.procedure_name || 'Procedure not recorded'}</p>
                <p className="mt-0.5 text-xs text-muted">
                  <span className="tabular font-medium text-ink-2">{fmtDate(s.date_of_surgery)}</span>
                  {s.date_of_surgery ? ` · ${fmtAgo(s.date_of_surgery)}` : ''}
                </p>
              </div>
              <CategoryPill category={s.procedure_category} />
            </div>
            {showSurgeon && (
              <p className="mt-1.5 text-sm">
                <SurgeonLinks list={s.surgeon_name} />
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
              <span className="inline-flex min-w-0 items-center gap-1">
                <Building2 size={12} className="shrink-0 text-muted" aria-hidden />
                <span className="break-words">{s.hospital_name || '—'}</span>
              </span>
              {showDuration && fmtDuration(s.surgery?.duration) !== '—' && (
                <span className="tabular inline-flex items-center gap-1">
                  <Clock size={12} className="text-muted" aria-hidden />
                  {fmtDuration(s.surgery?.duration)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="-mx-5 hidden overflow-x-auto px-5 md:-mx-6 md:block md:px-6">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Procedure</th>
              <th className={th}>Type</th>
              {showSurgeon && <th className={th}>Surgeon</th>}
              <th className={th}>Hospital</th>
              {showDuration && <th className={`${th} text-right`}>Duration</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s._id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2">
                <td className="py-3 pr-4 whitespace-nowrap">
                  <div className="tabular font-medium text-ink">{fmtDate(s.date_of_surgery)}</div>
                  {s.date_of_surgery && <div className="text-xs text-muted">{fmtAgo(s.date_of_surgery)}</div>}
                </td>
                <td className="py-3 pr-4 text-ink">{s.procedure_name || '—'}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <CategoryPill category={s.procedure_category} />
                </td>
                {showSurgeon && (
                  <td className="py-3 pr-4">
                    <SurgeonLinks list={s.surgeon_name} />
                  </td>
                )}
                <td className="py-3 pr-4 text-ink-2">{s.hospital_name || '—'}</td>
                {showDuration && (
                  <td className="tabular py-3 pr-4 text-right whitespace-nowrap text-ink-2">{fmtDuration(s.surgery?.duration)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="shrink-0 rounded-full bg-brand-wash px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-ink">
      {fmtCategory(category)}
    </span>
  );
}

function SurgeonLinks({ list }) {
  const items = (Array.isArray(list) ? list : []).filter((x) => x?.label && !BAD.includes(x.label));
  if (!items.length) return <span className="text-muted">—</span>;
  return items.map((x, i) => (
    <span key={i}>
      {i > 0 && ', '}
      {/^[a-f0-9]{24}$/i.test(String(x.value)) ? (
        <Link to={`/surgeons/${x.value}`} className="font-medium text-brand hover:underline">
          {x.label}
        </Link>
      ) : (
        x.label
      )}
    </span>
  ));
}
