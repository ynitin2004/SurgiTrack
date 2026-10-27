import { Gift, Trophy } from 'lucide-react';
import Card from '../components/common/Card';
import StatusPill from '../components/common/StatusPill';
import RewardProgressCard from '../components/rewards/RewardProgressCard';
import { useSurgeonRewards } from '../components/rewards/SurgeonRewards';
import TrophyIcon from '../components/rewards/TrophyIcon';
import { fmtDate, fmtNumber } from '../utils/format';
import { PageHeader, PageSkeleton } from './Dashboard';

const GIFT_TEXT = {
  preparing: 'The SSI team is preparing a customised gift for you.',
  dispatched: 'Your gift is on its way.',
  delivered: 'Gift delivered — congratulations!',
  closed: 'This milestone was closed by the SSI team.',
};

// Surgeon portal: trophy cabinet (all milestones) + the gift for each unlocked one.
export default function SurgeonRewardsPage() {
  const { rewards } = useSurgeonRewards();
  if (!rewards) return <PageSkeleton />;
  const { caseCount, ladder, milestones } = rewards;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My rewards"
        subtitle={`Trophy badges and customised gifts from SSI at 50, 100, 200, 500 and 1,000 surgeries — you have completed ${fmtNumber(caseCount)}`}
      />
      <RewardProgressCard rewards={rewards} showLink={false} />

      <Card title="Trophy cabinet" subtitle="Each milestone unlocks a trophy badge and a customised gift" icon={Trophy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {ladder.map((m, i) => {
            const gift = milestones.find((x) => x.tier === m.tier);
            const toGo = m.at - caseCount;
            return (
              <li
                key={m.tier}
                className={`rise flex flex-col items-center rounded-2xl border p-4 text-center ${
                  m.reached ? 'border-transparent bg-violet-wash' : 'border-dashed border-line'
                } ${i === ladder.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
                style={{ '--i': i }}
              >
                <TrophyIcon tier={m.tier} locked={!m.reached} size={64} />
                <p className={`mt-2 font-extrabold ${m.reached ? 'text-ink' : 'text-muted'}`}>{m.label}</p>
                <p className="tabular text-xs text-muted">{fmtNumber(m.at)} surgeries</p>
                <div className="mt-2">
                  {m.reached ? (
                    <StatusPill status={gift?.status || 'preparing'} />
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      {fmtNumber(toGo)} to go
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="My gifts" subtitle="Customised gifts sent by the SSI team for each trophy" icon={Gift}>
        {!milestones.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <TrophyIcon tier="bronze" locked size={56} />
            <p className="mt-3 font-bold text-ink">No trophies yet</p>
            <p className="mt-1 text-sm text-muted">
              Your first trophy and gift unlock at 50 surgeries — {fmtNumber(Math.max(0, 50 - caseCount))} to go.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {milestones.map((m) => (
              <li key={m.tier} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0 sm:flex-nowrap">
                <TrophyIcon tier={m.tier} size={40} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{m.label} trophy</span>
                    <span className="tabular text-xs text-muted">· {fmtNumber(m.at)} surgeries</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{m.gift ? <span className="font-semibold text-ink">{m.gift}</span> : GIFT_TEXT[m.status]}</p>
                  {m.gift && m.status !== 'closed' && <p className="mt-0.5 text-xs text-muted">{GIFT_TEXT[m.status]}</p>}
                  {m.adminNote && <p className="mt-1 text-xs text-muted">Note from SSI: “{m.adminNote}”</p>}
                  {(m.dispatchedAt || m.deliveredAt) && (
                    <p className="mt-1 text-xs text-muted">
                      {[m.dispatchedAt && `Dispatched ${fmtDate(new Date(m.dispatchedAt).getTime())}`, m.deliveredAt && `Delivered ${fmtDate(new Date(m.deliveredAt).getTime())}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <StatusPill status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
