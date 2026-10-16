import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Search } from 'lucide-react';
import api from '../../api/axios';
import { control } from '../common/ui';
import { useDebounced } from '../../hooks/useDebounced';

const stripTitle = (n = '') => n.replace(/^dr\.?\s*/i, '').trim();

// Search surgeon_info profiles to link to a portal account. Profiles already
// linked to another account are shown but cannot be picked.
export default function SurgeonPicker({ value, onChange, initialSearch = '', error }) {
  const [search, setSearch] = useState(stripTitle(initialSearch));
  const debounced = useDebounced(search, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['surgeons', 'picker', debounced],
    queryFn: () => api.get('/surgeons', { params: { search: debounced, limit: 8 } }).then((r) => r.data.items),
    enabled: debounced.trim().length >= 2,
  });

  return (
    <div>
      <span className="text-sm font-semibold text-ink">Link to surgeon profile</span>
      <div className="relative mt-1.5">
        <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          className={`${control} pl-10 ${error ? 'border-critical' : ''}`}
          placeholder="Type at least 2 letters of the surgeon's name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search surgeon profiles"
        />
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-critical">{error}</span>}
      <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto" role="listbox" aria-label="Surgeon profiles">
        {debounced.trim().length < 2 ? null : isFetching && !data ? (
          <li className="p-2 text-sm text-muted">Searching…</li>
        ) : !data?.length ? (
          <li className="p-2 text-sm text-muted">No matching surgeon profile</li>
        ) : (
          data.map((s) => {
            const selected = value === s._id;
            const taken = Boolean(s.linkedAccount) && !selected;
            return (
              <li key={s._id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={taken}
                  onClick={() => onChange(s._id, s)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                    selected ? 'border-brand bg-brand-wash' : 'border-line hover:bg-surface-2'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{s.surgeonName}</span>
                    <span className="block truncate text-xs text-muted">
                      {[s.areaOfExpertise, s.hospitalName].filter(Boolean).join(' · ') || 'No details'} · {s.surgeryCount} surgeries
                    </span>
                    {taken && <span className="block text-xs text-warning-ink">Already linked to {s.linkedAccount}</span>}
                  </span>
                  {selected && <CheckCircle2 size={18} className="text-brand" aria-hidden />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
