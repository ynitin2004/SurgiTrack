import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Search } from 'lucide-react';
import api from '../api/axios';
import Card from '../components/common/Card';
import Pagination from '../components/common/Pagination';
import TierBadge from '../components/common/TierBadge';
import { control } from '../components/common/ui';
import { initials } from '../components/surgeon/SurgeonProfileView';
import { useDebounced } from '../hooks/useDebounced';
import { fmtNumber } from '../utils/format';
import { PageHeader } from './Dashboard';

const REWARD_EVERY = 50;
const th = 'label-caps py-3 pr-4 font-bold text-muted';

export default function Surgeons() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('surgeries');
  const debounced = useDebounced(search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['surgeons', { page, sort, search: debounced }],
    queryFn: () =>
      api.get('/surgeons', { params: { page, sort, limit: 20, search: debounced || undefined } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Surgeons" subtitle={data ? `${fmtNumber(data.total)} surgeon profiles` : ' '} />

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              className={`${control} pl-10`}
              placeholder="Search by name or expertise…"
              aria-label="Search surgeons"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={`${control} w-full sm:w-auto`}
            value={sort}
            aria-label="Sort surgeons"
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="surgeries">Most surgeries first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted">Loading…</div>
          ) : !data?.items.length ? (
            <div className="py-8 text-center text-sm text-muted">No surgeons found</div>
          ) : (
            <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
              <ul className="-mx-1 divide-y divide-line md:hidden">
                {data.items.map((s) => (
                  <li key={s._id}>
                    <Link to={`/surgeons/${s._id}`} className="flex items-center gap-3 px-1 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-wash text-xs font-bold text-brand-ink">
                        {initials(s.surgeonName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold break-words text-ink">{s.surgeonName || '—'}</span>
                          <TierBadge count={s.surgeryCount} size="sm" />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {[s.areaOfExpertise, s.hospitalName].filter(Boolean).join(' · ') || 'No profile details'}
                        </span>
                        {s.linkedAccount && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-good-ink">
                            <BadgeCheck size={12} aria-hidden /> Portal account
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="tabular block font-bold text-ink">{fmtNumber(s.surgeryCount)}</span>
                        <span className="text-[0.7rem] text-muted">surgeries</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="-mx-5 hidden overflow-x-auto px-5 md:-mx-6 md:block md:px-6">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line">
                    <tr>
                      <th className={th}>Surgeon</th>
                      <th className={th}>Expertise</th>
                      <th className={th}>Aligned hospital</th>
                      <th className={th}>Next reward</th>
                      <th className={`${th} text-right`}>Surgeries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => {
                      const into = s.surgeryCount % REWARD_EVERY;
                      return (
                        <tr key={s._id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2">
                          <td className="py-3 pr-4">
                            <Link to={`/surgeons/${s._id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-brand">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-xs font-bold text-brand-ink">
                                {initials(s.surgeonName)}
                              </span>
                              <span>
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  {s.surgeonName || '—'}
                                  <TierBadge count={s.surgeryCount} size="sm" />
                                </span>
                                {s.linkedAccount && (
                                  <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-good-ink">
                                    <BadgeCheck size={12} aria-hidden /> Portal account
                                  </span>
                                )}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-ink-2">{s.areaOfExpertise || '—'}</td>
                          <td className="py-3 pr-4 text-ink-2">{s.hospitalName || '—'}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-violet-wash" aria-hidden>
                                <div className="bg-reward h-full rounded-full" style={{ width: `${(into / REWARD_EVERY) * 100}%` }} />
                              </div>
                              <span className="tabular text-xs text-muted">
                                {into}/{REWARD_EVERY}
                              </span>
                            </div>
                          </td>
                          <td className="tabular py-3 pr-4 text-right font-bold text-ink">{fmtNumber(s.surgeryCount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
