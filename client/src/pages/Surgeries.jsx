import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Pagination from '../components/common/Pagination';
import SurgeryTable from '../components/common/SurgeryTable';
import { control } from '../components/common/ui';
import { useDebounced } from '../hooks/useDebounced';
import { fmtCategory, fmtNumber } from '../utils/format';
import { PageHeader } from './Dashboard';

const FILTER_KEYS = ['category', 'hospital', 'from', 'to'];

// Admins: every surgery with all filters. Surgeons: "My cases" — the API
// scopes results to their own linked profile regardless of what is sent.
export default function Surgeries() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounced(search);
  const page = Number(params.get('page')) || 1;
  // admins: any surgeon; surgeons: a teammate (the API checks the hospital)
  const surgeonId = params.get('surgeonId') && params.get('surgeonId') !== user.surgeonId ? params.get('surgeonId') : null;
  // name for the "cases of <surgeon>" chip, from the profile page cache if present
  const viewed = useQueryClient().getQueryData([isAdmin ? 'surgeon' : 'team-member', surgeonId]);
  const surgeonName = viewed?.surgeon?.surgeonName;

  useEffect(() => {
    update({ search: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function update(changes, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage && !('page' in changes)) next.delete('page');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }

  const query = Object.fromEntries(params.entries());
  const { data: filters } = useQuery({
    queryKey: ['surgeries', 'filters'],
    queryFn: () => api.get('/surgeries/filters').then((r) => r.data),
    enabled: isAdmin,
  });
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/me/profile').then((r) => r.data),
    enabled: !isAdmin,
  });
  const categories = isAdmin
    ? filters?.categories
    : (surgeonId ? viewed?.byCategory : myProfile?.byCategory)?.map((c) => c.category);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['surgeries', 'list', query],
    queryFn: () => api.get('/surgeries', { params: { limit: 20, ...query } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const hasFilters = search || FILTER_KEYS.some((k) => params.get(k));
  const select = `${control} w-full sm:w-auto`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Surgeries' : surgeonId ? 'Team member cases' : 'My cases'}
        subtitle={data ? `${fmtNumber(data.total)} ${hasFilters ? 'matching' : 'recorded'} surgeries` : ' '}
      />

      <Card>
        {surgeonId && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Showing cases of</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-3 py-1 font-semibold text-brand-ink">
              {surgeonName || 'the selected surgeon'}
              <button
                onClick={() => update({ surgeonId: null })}
                className="rounded-full p-0.5 hover:bg-brand-wash"
                aria-label={isAdmin ? 'Show all surgeons' : 'Back to my cases'}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
          <div className="relative col-span-2 w-full sm:w-72">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              className={`${control} pl-10`}
              placeholder={isAdmin ? 'Search procedure, surgeon, hospital…' : 'Search procedure or hospital…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search surgeries"
            />
          </div>
          <FilterLabel label="Type" wide>
            <select className={select} value={params.get('category') || ''} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All types</option>
              {categories?.map((c) => (
                <option key={c} value={c}>
                  {fmtCategory(c)}
                </option>
              ))}
            </select>
          </FilterLabel>
          {isAdmin && (
            <FilterLabel label="Hospital" wide>
              <select className={`${select} sm:max-w-64`} value={params.get('hospital') || ''} onChange={(e) => update({ hospital: e.target.value })}>
                <option value="">All hospitals</option>
                {filters?.hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </FilterLabel>
          )}
          <FilterLabel label="From">
            <input type="date" className={select} value={params.get('from') || ''} max={params.get('to') || undefined} onChange={(e) => update({ from: e.target.value })} />
          </FilterLabel>
          <FilterLabel label="To">
            <input type="date" className={select} value={params.get('to') || ''} min={params.get('from') || undefined} onChange={(e) => update({ to: e.target.value })} />
          </FilterLabel>
          {hasFilters && (
            <button
              className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand hover:bg-brand-wash"
              onClick={() => {
                setSearch('');
                // keep the selected surgeon; its chip has its own remove button
                const keep = new URLSearchParams();
                if (params.get('surgeonId')) keep.set('surgeonId', params.get('surgeonId'));
                setParams(keep, { replace: true });
              }}
            >
              <X size={14} aria-hidden /> Clear
            </button>
          )}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted">Loading…</div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-critical">⚠ {error.response?.data?.message || 'Could not load surgeries.'}</p>
          ) : (
            <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
              <SurgeryTable rows={data?.items} showSurgeon={isAdmin} />
              <Pagination page={page} pages={data?.pages} total={data?.total || 0} onChange={(p) => update({ page: String(p) }, false)} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function FilterLabel({ label, wide = false, children }) {
  return (
    <label className={`block min-w-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <span className="label-caps mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}
