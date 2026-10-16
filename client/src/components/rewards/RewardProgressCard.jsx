import { Gift, Trophy } from 'lucide-react';
import { fmtNumber } from '../../utils/format';

// Progress toward the next free-instrument milestone + redeem call to action.
export default function RewardProgressCard({ rewards, onRedeem }) {
  if (!rewards) return null;
  const done = rewards.every - rewards.casesToNext;
  const pct = Math.round((done / rewards.every) * 100);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="bg-reward rounded-2xl p-3 text-white shadow-md" aria-hidden>
          <Trophy size={26} />
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="label-caps text-violet">Free instrument programme</p>
          <h2 className="mt-0.5 text-lg font-extrabold text-ink">
            {rewards.available > 0
              ? `${rewards.available} free instrument${rewards.available > 1 ? 's' : ''} ready to redeem`
              : `${fmtNumber(rewards.casesToNext)} more case${rewards.casesToNext === 1 ? '' : 's'} to your next free instrument`}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-wash"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={rewards.every}
              aria-valuenow={done}
              aria-label="Progress to next milestone"
            >
              <div className="bg-reward h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
            <span className="tabular text-xs font-semibold text-ink-2">
              {done}/{rewards.every} → {fmtNumber(rewards.nextMilestone)} cases
            </span>
          </div>
        </div>
        {rewards.available > 0 && (
          <button
            onClick={onRedeem}
            className="bg-reward inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
          >
            <Gift size={16} aria-hidden /> Redeem now
          </button>
        )}
      </div>
    </section>
  );
}
