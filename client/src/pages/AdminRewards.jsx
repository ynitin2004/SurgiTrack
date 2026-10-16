import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Gift, PackageCheck, Trophy, X } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import StatusPill from '../components/common/StatusPill';
import { btnDanger, btnGhost, btnSmall, control, errorMessage } from '../components/common/ui';
import { initials } from '../components/surgeon/SurgeonProfileView';
import { fmtNumber } from '../utils/format';
import { PageHeader } from './Dashboard';

const TABS = [
  { key: 'requested', label: 'New' },
  { key: 'approved', label: 'Approved' },
  { key: 'fulfilled', label: 'Delivered' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminRewards() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('requested');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['redemptions', 'all'],
    queryFn: () => api.get('/admin/redemptions').then((r) => r.data),
  });
  const all = data?.items || [];
  const items = tab ? all.filter((r) => r.status === tab) : all;
  const count = (k) => (k ? all.filter((r) => r.status === k).length : all.length);

  const update = useMutation({
    mutationFn: ({ id, status, adminNote }) => api.patch(`/admin/redemptions/${id}`, { status, adminNote }).then((r) => r.data.redemption),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] });
      const verb = { approved: 'approved', fulfilled: 'marked as delivered', rejected: 'rejected' }[r.status];
      toast(`${r.surgeonName}'s request ${verb}.`, 'success');
      setRejecting(null);
      setReason('');
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward requests"
        subtitle={`Surgeons earn one free instrument for every ${data?.every || 50} completed cases`}
      />

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
            {t.label} <span className="tabular ml-1 opacity-75">{count(t.key)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted">Loading…</div>
      ) : !items.length ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <span className="rounded-2xl bg-violet-wash p-4 text-violet" aria-hidden>
              <Gift size={28} />
            </span>
            <p className="mt-4 font-bold text-ink">No {tab ? TABS.find((t) => t.key === tab).label.toLowerCase() : ''} requests</p>
            <p className="mt-1 text-sm text-muted">Requests appear here — and as a popup — the moment a surgeon redeems a milestone.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((r) => (
            <article key={r.id} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="bg-reward flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white" aria-hidden>
                  {initials(r.surgeonName)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/surgeons/${r.surgeonId}`} className="font-bold text-ink hover:text-brand">
                    {r.surgeonName}
                  </Link>
                  <p className="truncate text-xs text-muted">{r.email}</p>
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="label-caps text-muted">Milestone</p>
                  <p className="mt-1 flex items-center gap-1.5 font-bold text-ink">
                    <Trophy size={14} className="text-violet" aria-hidden /> {fmtNumber(r.milestone)} cases
                    <span className="font-medium text-muted">({fmtNumber(r.caseCountAtRequest)} total)</span>
                  </p>
                </div>
                <div>
                  <p className="label-caps text-muted">Instrument</p>
                  <p className="mt-1 font-bold text-ink">{r.instrument}</p>
                </div>
                {r.note && (
                  <div className="sm:col-span-2">
                    <p className="label-caps text-muted">Surgeon's note</p>
                    <p className="mt-1 text-ink-2">{r.note}</p>
                  </div>
                )}
                {r.adminNote && (
                  <div className="sm:col-span-2">
                    <p className="label-caps text-muted">Admin note</p>
                    <p className="mt-1 text-ink-2">{r.adminNote}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  Requested {fmtWhen(r.createdAt)}
                  {r.handledBy && ` · updated by ${r.handledBy}`}
                </p>
                <div className="flex gap-2">
                  {['requested', 'approved'].includes(r.status) && (
                    <button
                      className={`${btnSmall} border border-line text-critical hover:bg-critical-wash`}
                      onClick={() => setRejecting(r)}
                      disabled={update.isPending}
                    >
                      <X size={14} aria-hidden /> Reject
                    </button>
                  )}
                  {r.status === 'requested' && (
                    <button
                      className={`${btnSmall} bg-brand text-white hover:brightness-110`}
                      onClick={() => update.mutate({ id: r.id, status: 'approved' })}
                      disabled={update.isPending}
                    >
                      <Check size={14} aria-hidden /> Approve
                    </button>
                  )}
                  {r.status === 'approved' && (
                    <button
                      className={`${btnSmall} bg-good text-white hover:brightness-110`}
                      onClick={() => update.mutate({ id: r.id, status: 'fulfilled', adminNote: 'Delivered' })}
                      disabled={update.isPending}
                    >
                      <PackageCheck size={14} aria-hidden /> Mark delivered
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Reject reward request" size="sm">
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ id: rejecting.id, status: 'rejected', adminNote: reason });
          }}
        >
          <p className="text-sm text-ink-2">
            {rejecting?.surgeonName} will see this reason and can choose a different instrument for the same milestone.
          </p>
          <label className="block text-sm font-semibold text-ink">
            Reason
            <textarea
              className={`${control} mt-1.5 min-h-24`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
              placeholder="e.g. This instrument is out of stock — please choose another"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className={`${btnGhost} flex-1`} onClick={() => setRejecting(null)}>
              Cancel
            </button>
            <button type="submit" className={`${btnDanger} flex-1`} disabled={!reason.trim() || update.isPending}>
              Reject request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
