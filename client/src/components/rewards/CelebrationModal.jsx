import { useNavigate } from 'react-router-dom';
import { Gift, PartyPopper } from 'lucide-react';
import Modal from '../common/Modal';
import { btnGhost } from '../common/ui';
import { fmtNumber } from '../../utils/format';
import TrophyIcon from './TrophyIcon';

// Surgeon-facing popup when a trophy milestone is unlocked: congratulates and
// explains that the SSI team is preparing a customised gift.
export default function CelebrationModal({ open, onClose, milestone, rewards, name }) {
  const navigate = useNavigate();
  if (!open || !milestone) return null;
  const otherOpen = (rewards?.openGifts || 0) - 1;

  return (
    <Modal open onClose={onClose} bare size="sm" labelledBy="trophy-title">
      <div className="bg-reward relative overflow-hidden px-6 pt-6 pb-5 text-center text-white">
        <span className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
        <span className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center justify-center gap-2 text-white/85">
          <PartyPopper size={16} aria-hidden />
          <span className="label-caps">Milestone unlocked · {fmtNumber(milestone.at)} surgeries</span>
        </div>
        <div className="float relative mx-auto mt-4 w-fit rounded-full bg-white/15 p-3">
          <TrophyIcon tier={milestone.tier} size={84} />
        </div>
        <h2 id="trophy-title" className="relative mt-3 text-2xl leading-tight font-extrabold">
          {milestone.label} trophy
        </h2>
        <p className="relative mt-1 text-sm text-white/90">Congratulations, {name || 'Doctor'}!</p>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-3 rounded-xl bg-violet-wash p-4 text-sm">
          <Gift size={18} className="mt-0.5 shrink-0 text-violet" aria-hidden />
          <p className="text-ink-2">
            You have completed <span className="font-bold text-ink">{fmtNumber(rewards?.caseCount)}</span> robotic surgeries. The SSI team
            is preparing a <span className="font-semibold text-ink">customised gift</span> for you — you will see its status on My rewards.
          </p>
        </div>
        {otherOpen > 0 && (
          <p className="text-center text-xs text-muted">
            +{otherOpen} more gift{otherOpen === 1 ? '' : 's'} from earlier milestones on the way
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="bg-reward inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
            onClick={() => {
              onClose();
              navigate('/rewards');
            }}
          >
            <Gift size={16} aria-hidden /> View my rewards
          </button>
        </div>
      </div>
    </Modal>
  );
}
