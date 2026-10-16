import { Gift, Lock, Trophy } from 'lucide-react';
import Card from '../components/common/Card';
import StatusPill from '../components/common/StatusPill';
import RewardProgressCard from '../components/rewards/RewardProgressCard';
import { useSurgeonRewards } from '../components/rewards/SurgeonRewards';
import { fmtNumber } from '../utils/format';
import { PageHeader, PageSkeleton } from './Dashboard';

export default function SurgeonRewardsPage() {
  const { rewards, openRedeem } = useSurgeonRewards();
  if (!rewards) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My rewards"
        subtitle={`One free instrument for every ${rewards.every} completed cases — you have completed ${fmtNumber(rewards.caseCount)}`}
      />
      <RewardProgressCard rewards={rewards} onRedeem={() => openRedeem()} />

      <Card title="Milestones" subtitle="Each milestone can be redeemed once" icon={Trophy}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rewards.milestones.map((m) => (
            <div
              key={m.milestone}
              className={`rounded-2xl border p-4 ${m.status === 'available' ? 'border-transparent bg-violet-wash' : 'border-line bg-surface-2'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-extrabold text-ink">
                  <Trophy size={16} className="text-violet" aria-hidden /> {fmtNumber(m.milestone)} cases
                </span>
                <StatusPill status={m.status} />
              </div>
              {m.redemption ? (
                <p className="mt-3 text-sm text-ink-2">
                  <span className="font-semibold text-ink">{m.redemption.instrument}</span>
                  {m.redemption.adminNote && ` · ${m.redemption.adminNote}`}
                </p>
              ) : (
                <>
                  {m.lastRejection && (
                    <p className="mt-3 text-xs text-critical">Previous request declined: “{m.lastRejection.adminNote}”</p>
                  )}
                  <button
                    onClick={() => openRedeem(m.milestone)}
                    className="bg-reward mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white transition hover:brightness-110"
                  >
                    <Gift size={14} aria-hidden /> Redeem free instrument
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-line p-4">
            <span className="flex items-center gap-2 font-extrabold text-muted">
              <Lock size={16} aria-hidden /> {fmtNumber(rewards.nextMilestone)} cases
            </span>
            <p className="mt-3 text-sm text-muted">
              {fmtNumber(rewards.casesToNext)} more case{rewards.casesToNext === 1 ? '' : 's'} to unlock
            </p>
          </div>
        </div>
      </Card>

      {rewards.history.length > 0 && (
        <Card title="Request history" icon={Gift}>
          <ul className="divide-y divide-[var(--border)]">
            {rewards.history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="w-28 font-semibold text-ink">{fmtNumber(r.milestone)} cases</span>
                <span className="min-w-0 flex-1 text-ink-2">
                  {r.instrument}
                  {r.adminNote && <span className="text-muted"> · {r.adminNote}</span>}
                </span>
                <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
