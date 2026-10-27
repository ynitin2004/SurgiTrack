import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BadgeCheck, Gift, PackageCheck, Pencil, Search, Send, X } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import StatusPill from '../components/common/StatusPill';
import TierBadge from '../components/common/TierBadge';
import TrophyIcon from '../components/rewards/TrophyIcon';
import { btnDanger, btnGhost, btnPrimary, btnSmall, control, errorMessage } from '../components/common/ui';
import { initials } from '../components/surgeon/SurgeonProfileView';
import { useDebounced } from '../hooks/useDebounced';
import { fmtDate, fmtNumber } from '../utils/format';
import { MILESTONE_TIERS } from '../utils/tier';
import { PageHeader } from './Dashboard';

const TABS = [
  { key: 'preparing', label: 'To send' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' },
];
const when = (iso) => (iso ? fmtDate(new Date(iso).getTime()) : '');

// Admin: every surgeon who reached a trophy milestone, and the customised gift
// the SSI team sends for each one (preparing -> dispatched -> delivered).
export default function AdminRewards() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('preparing');
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [editing, setEditing] = useState(null); // { surgeon, milestone, mode: 'send'|'edit' }
  const [closing, setClosing] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-gifts'],
    queryFn: () => api.get('/admin/gifts').then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: ({ surgeonId, tier: t, ...body }) => api.patch(`/admin/gifts/${surgeonId}/${t}`, body).then((r) => r.data.gift),
    onSuccess: (g, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] });
      const verb = { dispatched: vars.edit ? 'updated' : 'marked as dispatched', delivered: 'marked as delivered', closed: 'closed' }[g.status];
      toast(`${g.surgeonName}'s ${g.label} gift ${verb}.`, 'success');
      setEditing(null);
      setClosing(null);
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const surgeons = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return (data?.surgeons || [])
      .filter((s) => !q || `${s.surgeonName} ${s.hospitalName || ''}`.toLowerCase().includes(q))
      .map((s) => ({ ...s, shown: s.milestones.filter((m) => (!tab || m.status === tab) && (!tier || m.tier === tier)) }))
      .filter((s) => s.shown.length);
  }, [data, debounced, tab, tier]);

  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Rewards & gifts" subtitle="Trophy badges and customised gifts at 50, 100, 200, 500 and 1,000 surgeries" />

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-brand text-white shadow-sm' : 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
            }`}
          >
            {t.label} <span className="tabular ml-1 opacity-75">{t.key ? counts[t.key] || 0 : total}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input className={`${control} pl-10`} placeholder="Search surgeon or hospital…" aria-label="Search surgeons" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${control} w-full sm:w-auto`} aria-label="Filter by trophy" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="">All trophies</option>
          {MILESTONE_TIERS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label} · {fmtNumber(t.min)} surgeries
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading…</div>
      ) : error ? (
        <p className="text-critical">⚠ {errorMessage(error)}</p>
      ) : !surgeons.length ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <TrophyIcon tier="gold" size={56} />
            <p className="mt-4 font-bold text-ink">Nothing here</p>
            <p className="mt-1 text-sm text-muted">
              {tab === 'preparing' ? 'Every unlocked trophy already has its gift on the way.' : 'No gifts match these filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {surgeons.map((s) => (
            <li key={s.surgeonId}>
              <article className="h-full rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="bg-reward flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" aria-hidden>
                    {initials(s.surgeonName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link to={`/surgeons/${s.surgeonId}`} className="font-bold break-words text-ink hover:text-brand">
                        {s.surgeonName}
                      </Link>
                      <TierBadge count={s.caseCount} size="sm" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[s.hospitalName, `${fmtNumber(s.caseCount)} surgeries`].filter(Boolean).join(' · ')}
                    </p>
                    {s.account && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-good-ink">
                        <BadgeCheck size={12} aria-hidden /> Portal account · {s.account}
                      </p>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-3">
                  {s.shown.map((m) => (
                    <li key={m.tier} className="rounded-xl bg-surface-2 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <TrophyIcon tier={m.tier} size={34} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-ink">{m.label} trophy</p>
                          <p className="tabular text-xs text-muted">{fmtNumber(m.at)} surgeries milestone</p>
                        </div>
                        <StatusPill status={m.status} />
                      </div>
                      {(m.gift || m.adminNote) && (
                        <div className="mt-3 space-y-1 text-sm">
                          {m.gift && (
                            <p className="text-ink-2">
                              <span className="label-caps mr-1.5 text-muted">Gift</span>
                              <span className="font-semibold text-ink">{m.gift}</span>
                            </p>
                          )}
                          {m.adminNote && (
                            <p className="text-ink-2">
                              <span className="label-caps mr-1.5 text-muted">{m.status === 'closed' ? 'Reason' : 'Note'}</span>
                              {m.adminNote}
                            </p>
                          )}
                          {(m.dispatchedAt || m.deliveredAt) && (
                            <p className="text-xs text-muted">
                              {[m.dispatchedAt && `Dispatched ${when(m.dispatchedAt)}`, m.deliveredAt && `Delivered ${when(m.deliveredAt)}`].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      )}
                      {['preparing', 'dispatched'].includes(m.status) && (
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button className={`${btnSmall} border border-line text-ink-2 hover:bg-surface`} onClick={() => setClosing({ surgeon: s, milestone: m })} disabled={update.isPending}>
                            <X size={14} aria-hidden /> Close
                          </button>
                          {m.status === 'preparing' ? (
                            <button className={`${btnSmall} bg-brand text-white hover:brightness-110`} onClick={() => setEditing({ surgeon: s, milestone: m, mode: 'send' })} disabled={update.isPending}>
                              <Send size={14} aria-hidden /> Send gift
                            </button>
                          ) : (
                            <>
                              <button className={`${btnSmall} border border-line text-ink-2 hover:bg-surface`} onClick={() => setEditing({ surgeon: s, milestone: m, mode: 'edit' })} disabled={update.isPending}>
                                <Pencil size={14} aria-hidden /> Edit gift
                              </button>
                              <button
                                className={`${btnSmall} bg-good text-white hover:brightness-110`}
                                onClick={() => update.mutate({ surgeonId: s.surgeonId, tier: m.tier, status: 'delivered' })}
                                disabled={update.isPending}
                              >
                                <PackageCheck size={14} aria-hidden /> Mark delivered
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      )}

      <GiftModal
        key={editing ? `gift-${editing.surgeon.surgeonId}-${editing.milestone.tier}-${editing.mode}` : 'gift-none'}
        editing={editing}
        busy={update.isPending}
        onClose={() => setEditing(null)}
        onSave={(gift, adminNote) =>
          update.mutate({ surgeonId: editing.surgeon.surgeonId, tier: editing.milestone.tier, status: 'dispatched', gift, adminNote, edit: editing.mode === 'edit' })
        }
      />
      <CloseModal
        key={closing ? `close-${closing.surgeon.surgeonId}-${closing.milestone.tier}` : 'close-none'}
        closing={closing}
        busy={update.isPending}
        onClose={() => setClosing(null)}
        onConfirm={(adminNote) => update.mutate({ surgeonId: closing.surgeon.surgeonId, tier: closing.milestone.tier, status: 'closed', adminNote })}
      />
    </div>
  );
}

function GiftModal({ editing, busy, onClose, onSave }) {
  const [gift, setGift] = useState(editing?.milestone.gift || '');
  const [note, setNote] = useState(editing?.milestone.adminNote || '');
  if (!editing) return null;
  const { surgeon, milestone, mode } = editing;
  return (
    <Modal open onClose={onClose} title={mode === 'send' ? 'Send customised gift' : 'Edit gift details'} size="md">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(gift, note);
        }}
      >
        <div className="flex items-center gap-3 rounded-xl bg-violet-wash p-3">
          <TrophyIcon tier={milestone.tier} size={40} />
          <div className="min-w-0 text-sm">
            <p className="font-bold text-ink">{surgeon.surgeonName}</p>
            <p className="text-ink-2">
              {milestone.label} trophy · {fmtNumber(milestone.at)} surgeries ({fmtNumber(surgeon.caseCount)} total)
            </p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-ink">
          Gift
          <input
            className={`${control} mt-1.5`}
            value={gift}
            onChange={(e) => setGift(e.target.value)}
            maxLength={300}
            required
            autoFocus
            placeholder="e.g. Engraved Gold trophy + personalised surgical loupes"
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Note to the surgeon <span className="font-normal text-muted">(optional)</span>
          <textarea
            className={`${control} mt-1.5 min-h-20`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Couriered to your hospital — expected by 5 Nov"
          />
        </label>
        <p className="text-xs text-muted">{surgeon.account ? 'The surgeon sees the gift and note in their portal right away.' : 'This surgeon has no portal account yet; the record is kept for your team.'}</p>
        <div className="flex gap-2">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={!gift.trim() || busy}>
            <Gift size={16} aria-hidden /> {mode === 'send' ? 'Mark as dispatched' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CloseModal({ closing, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  if (!closing) return null;
  return (
    <Modal open onClose={onClose} title="Close this milestone?" size="sm">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason);
        }}
      >
        <p className="text-sm text-ink-2">
          {closing.surgeon.surgeonName}'s {closing.milestone.label} gift will be closed without sending. They will see this reason.
        </p>
        <label className="block text-sm font-semibold text-ink">
          Reason
          <textarea
            className={`${control} mt-1.5 min-h-20`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            required
            placeholder="e.g. Already rewarded at the annual surgeons' meet"
          />
        </label>
        <div className="flex gap-2">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${btnDanger} flex-1`} disabled={!reason.trim() || busy}>
            Close milestone
          </button>
        </div>
      </form>
    </Modal>
  );
}
