import { Link } from 'react-router-dom';
import { ArrowRight, Gift } from 'lucide-react';
import { fmtNumber } from '../../utils/format';
import TrophyIcon from './TrophyIcon';

// Current trophy, progress to the next milestone and gift status.
// `showLink` adds a "View rewards" button (dashboard); the rewards page omits it.
export default function RewardProgressCard({ rewards, showLink = true }) {
  if (!rewards) return null;
  const { tier, next, caseCount, casesToNext, openGifts } = rewards;
  const pct = Math.round((rewards.progress || 0) * 100);
  const title = !tier
    ? `${fmtNumber(casesToNext)} more surger${casesToNext === 1 ? 'y' : 'ies'} to your Bronze trophy`
    : next
      ? `${tier.label} trophy · ${fmtNumber(casesToNext)} more to ${next.label}`
      : `${tier.label} trophy — the highest milestone`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        <div className={`shrink-0 rounded-2xl p-2 ${tier ? 'bg-violet-wash' : 'bg-surface-2'}`}>
          <TrophyIcon tier={tier?.tier || 'bronze'} locked={!tier} size={56} />
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <p className="label-caps text-violet">SSI trophy rewards</p>
          <h2 className="mt-0.5 text-lg font-extrabold text-ink">{title}</h2>
          {next && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div
                className="h-2.5 min-w-32 flex-1 overflow-hidden rounded-full bg-violet-wash"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={next.at}
                aria-valuenow={caseCount}
                aria-label={`Progress to the ${next.label} trophy`}
              >
                <div className="bg-reward h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
              <span className="tabular text-xs font-semibold text-ink-2">
                {fmtNumber(caseCount)}/{fmtNumber(next.at)} surgeries → {next.label}
              </span>
            </div>
          )}
          {openGifts > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning-ink">
              <Gift size={13} aria-hidden /> {openGifts} customised gift{openGifts === 1 ? '' : 's'} on the way from SSI
            </p>
          )}
        </div>
        {showLink && (
          <Link
            to="/rewards"
            className="bg-reward inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
          >
            View rewards <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
