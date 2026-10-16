import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellRing, Gift, Trophy } from 'lucide-react';
import api from '../../api/axios';
import { useSocketEvent } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { btnGhost, btnPrimary } from '../common/ui';
import { fmtNumber } from '../../utils/format';

const SEEN_KEY = 'admin-pending-popup-seen';

// Admin-side popups:
//  • live: a surgeon redeems a milestone -> "Dr X completed N cases and requested …"
//  • on login: pending requests that arrived while no admin was online
export default function AdminAlerts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [queue, setQueue] = useState([]);
  const [backlog, setBacklog] = useState(null);

  const { data: pending } = useQuery({
    queryKey: ['redemptions', 'requested'],
    queryFn: () => api.get('/admin/redemptions', { params: { status: 'requested' } }).then((r) => r.data.items),
  });

  useEffect(() => {
    if (!pending?.length || sessionStorage.getItem(SEEN_KEY)) return;
    sessionStorage.setItem(SEEN_KEY, '1');
    setBacklog(pending);
  }, [pending]);

  useSocketEvent(
    'redemption:new',
    useCallback((r) => setQueue((q) => (q.some((x) => x.id === r.id) ? q : [...q, r])), [])
  );
  useSocketEvent(
    'user:registered',
    useCallback((u) => toast(`New registration from ${u.name} is waiting for approval.`, 'info'), [toast])
  );

  const current = queue[0];
  const next = () => setQueue((q) => q.slice(1));
  const go = () => {
    setQueue([]);
    setBacklog(null);
    navigate('/rewards');
  };

  if (current) {
    return (
      <Modal open onClose={next} bare size="sm" labelledBy="admin-alert-title">
        <div className="bg-reward relative overflow-hidden px-6 pt-6 pb-5 text-white">
          <span className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex items-center gap-2 text-white/85">
            <BellRing size={16} aria-hidden />
            <span className="label-caps">New reward request</span>
          </div>
          <h2 id="admin-alert-title" className="relative mt-3 text-xl leading-snug font-extrabold">
            {current.surgeonName} completed {fmtNumber(current.milestone)} cases!
          </h2>
          <p className="relative mt-1 text-sm text-white/90">and has requested their free instrument.</p>
        </div>
        <div className="space-y-4 p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Instrument</dt>
            <dd className="font-semibold text-ink">{current.instrument}</dd>
            <dt className="text-muted">Total cases</dt>
            <dd className="tabular font-semibold text-ink">{fmtNumber(current.caseCountAtRequest)}</dd>
            {current.note && (
              <>
                <dt className="text-muted">Note</dt>
                <dd className="text-ink-2">{current.note}</dd>
              </>
            )}
          </dl>
          <div className="flex gap-2">
            <button className={`${btnGhost} flex-1`} onClick={next}>
              {queue.length > 1 ? `Next (${queue.length - 1})` : 'Dismiss'}
            </button>
            <button className={`${btnPrimary} flex-1`} onClick={go}>
              <Gift size={16} aria-hidden /> Review request
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (backlog?.length) {
    return (
      <Modal open onClose={() => setBacklog(null)} title="Pending reward requests" size="sm">
        <div className="space-y-4 p-6">
          <p className="text-sm text-ink-2">
            {backlog.length} surgeon{backlog.length > 1 ? 's have' : ' has'} reached a milestone and requested a free instrument.
          </p>
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {backlog.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                <span className="rounded-lg bg-violet-wash p-2 text-violet" aria-hidden>
                  <Trophy size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{r.surgeonName}</span>
                  <span className="block truncate text-xs text-muted">
                    {fmtNumber(r.milestone)} cases · {r.instrument}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button className={`${btnGhost} flex-1`} onClick={() => setBacklog(null)}>
              Later
            </button>
            <button className={`${btnPrimary} flex-1`} onClick={go}>
              Review all
            </button>
          </div>
        </div>
      </Modal>
    );
  }
  return null;
}
