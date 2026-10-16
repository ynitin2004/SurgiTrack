import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Gift, PartyPopper, Sparkles } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../common/Modal';
import { btnGhost, control, errorMessage } from '../common/ui';
import { fmtNumber } from '../../utils/format';

// Surgeon-facing reward card: congratulates, lets them pick the free
// instrument and sends the redemption request to the admins.
export default function RewardModal({ open, onClose, milestone, rewards, name, favourites = [] }) {
  const queryClient = useQueryClient();
  const [instrument, setInstrument] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (open) {
      setInstrument('');
      setNote('');
      setDone(null);
    }
  }, [open, milestone]);

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['instrument-options'],
    queryFn: () => api.get('/me/instrument-options').then((r) => r.data.items),
    enabled: open,
  });

  const favSet = useMemo(() => new Set(favourites.map((f) => f.toLowerCase())), [favourites]);
  const favOptions = (options || []).filter((o) => favSet.has(o.toLowerCase()));
  const otherOptions = (options || []).filter((o) => !favSet.has(o.toLowerCase()));

  const redeem = useMutation({
    mutationFn: () => api.post('/me/rewards/redeem', { milestone, instrument, note }).then((r) => r.data.redemption),
    onSuccess: (r) => {
      setDone(r);
      queryClient.invalidateQueries({ queryKey: ['my-rewards'] });
    },
  });

  const lastRejection = rewards?.milestones.find((m) => m.milestone === milestone)?.lastRejection;

  return (
    <Modal open={open} onClose={onClose} bare size="md" labelledBy="reward-title">
      <div className="bg-reward relative overflow-hidden px-6 pt-7 pb-6 text-white">
        <span className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <span className="absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="float rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
            {done ? <PartyPopper size={30} aria-hidden /> : <Gift size={30} aria-hidden />}
          </div>
          <div>
            <p className="label-caps text-white/80">Milestone unlocked · {fmtNumber(milestone)} cases</p>
            <h2 id="reward-title" className="mt-1 text-2xl leading-tight font-extrabold">
              {done ? 'Request sent!' : `Congratulations, ${name}!`}
            </h2>
            <p className="mt-1.5 text-sm text-white/90">
              {done
                ? 'Our team has been notified and will get in touch to deliver your instrument.'
                : `You've completed ${fmtNumber(rewards?.caseCount)} robotic surgeries. As a thank-you, you've earned one free instrument from us.`}
            </p>
          </div>
        </div>
        {!done && rewards?.available > 1 && (
          <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            <Sparkles size={12} aria-hidden /> You have {rewards.available} rewards ready to redeem
          </p>
        )}
      </div>

      {done ? (
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3 rounded-xl bg-good-wash p-4 text-sm text-good-ink">
            <CheckCircle2 size={18} aria-hidden />
            <span>
              <b>{done.instrument}</b> requested for your {fmtNumber(done.milestone)}-case milestone.
            </span>
          </div>
          <button className={`${btnGhost} w-full`} onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            redeem.mutate();
          }}
        >
          {lastRejection && (
            <p className="rounded-xl bg-critical-wash p-3 text-sm text-critical">
              Your previous request for this milestone was declined: “{lastRejection.adminNote}”. You can choose again.
            </p>
          )}
          <label className="block text-sm font-semibold text-ink">
            Choose your free instrument
            <select
              className={`${control} mt-1.5`}
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
              disabled={optionsLoading}
            >
              <option value="">{optionsLoading ? 'Loading instruments…' : 'Select an instrument'}</option>
              {favOptions.length > 0 && (
                <optgroup label="Your most used">
                  {favOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label={favOptions.length ? 'All instruments' : 'Instruments'}>
                {otherOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink">
            Delivery note <span className="font-normal text-muted">(optional)</span>
            <textarea
              className={`${control} mt-1.5 min-h-20 resize-y`}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Deliver to the OT coordinator at my hospital"
            />
          </label>
          {redeem.isError && (
            <p className="text-sm text-critical" role="alert">
              ⚠ {errorMessage(redeem.error)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className={`${btnGhost} sm:flex-1`} onClick={onClose}>
              Maybe later
            </button>
            <button
              type="submit"
              disabled={!instrument || redeem.isPending}
              className="bg-reward inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:flex-1"
            >
              <Gift size={16} aria-hidden /> {redeem.isPending ? 'Sending…' : 'Redeem my instrument'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
