import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellRing, Gift } from 'lucide-react';
import api from '../../api/axios';
import { useSocketEvent } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { btnGhost, btnPrimary } from '../common/ui';
import { fmtNumber } from '../../utils/format';
import TrophyIcon from './TrophyIcon';

const SEEN_KEY = 'admin-gifts-popup-seen';

// gifts still to send, as [{ key, surgeonName, label, tier, at, caseCount }]
const toSend = (data) =>
  (data?.surgeons || []).flatMap((s) =>
    s.milestones
      .filter((m) => m.status === 'preparing')
      .map((m) => ({ key: `${s.surgeonId}:${m.tier}`, surgeonName: s.surgeonName, caseCount: s.caseCount, ...m }))
  );

// Admin-side popups:
//  • live: a new case pushes a surgeon past a trophy milestone -> "Dr X reached Gold!"
//  • on login: gifts still to send from milestones reached earlier
export default function AdminAlerts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [queue, setQueue] = useState([]);
  const [backlog, setBacklog] = useState(null);
  const known = useRef(null); // keys seen so far; null until the first load

  const { data } = useQuery({
    queryKey: ['admin-gifts'],
    queryFn: () => api.get('/admin/gifts').then((r) => r.data),
  });

  useEffect(() => {
    if (!data) return;
    const pending = toSend(data);
    if (known.current === null) {
      known.current = new Set(pending.map((p) => p.key));
      if (pending.length && !sessionStorage.getItem(SEEN_KEY)) {
        sessionStorage.setItem(SEEN_KEY, '1');
        setBacklog(pending);
      }
      return;
    }
    const fresh = pending.filter((p) => !known.current.has(p.key));
    pending.forEach((p) => known.current.add(p.key));
    if (fresh.length) setQueue((q) => [...q, ...fresh.filter((f) => !q.some((x) => x.key === f.key))]);
  }, [data]);

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
            <span className="label-caps">Trophy milestone reached</span>
          </div>
          <div className="relative mt-3 flex items-center gap-3">
            <TrophyIcon tier={current.tier} size={56} />
            <h2 id="admin-alert-title" className="text-xl leading-snug font-extrabold">
              {current.surgeonName} reached the {current.label} trophy!
            </h2>
          </div>
          <p className="relative mt-2 text-sm text-white/90">
            {fmtNumber(current.at)} surgeries milestone · {fmtNumber(current.caseCount)} in total. Time to send their customised gift.
          </p>
        </div>
        <div className="flex gap-2 p-6">
          <button className={`${btnGhost} flex-1`} onClick={next}>
            {queue.length > 1 ? `Next (${queue.length - 1})` : 'Later'}
          </button>
          <button className={`${btnPrimary} flex-1`} onClick={go}>
            <Gift size={16} aria-hidden /> Send gift
          </button>
        </div>
      </Modal>
    );
  }

  if (backlog?.length) {
    return (
      <Modal open onClose={() => setBacklog(null)} title="Trophy gifts to send" size="sm">
        <div className="space-y-4 p-6">
          <p className="text-sm text-ink-2">
            {backlog.length} trophy milestone{backlog.length > 1 ? 's are' : ' is'} waiting for a customised gift.
          </p>
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {backlog.slice(0, 6).map((g) => (
              <li key={g.key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                <TrophyIcon tier={g.tier} size={30} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{g.surgeonName}</span>
                  <span className="block truncate text-xs text-muted">
                    {g.label} trophy · {fmtNumber(g.at)} surgeries
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {backlog.length > 6 && <p className="text-xs text-muted">+{backlog.length - 6} more</p>}
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
