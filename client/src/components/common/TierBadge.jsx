import { Award, Crown, Medal, Trophy } from 'lucide-react';
import { tierFor } from '../../utils/tier';

const ICONS = { bronze: Medal, silver: Medal, gold: Medal, champion: Trophy, legend: Crown };

// Medal badge shown right after a surgeon's name. Tier is named in text, so
// the colour is never the only signal.
export default function TierBadge({ count, size = 'md', className = '' }) {
  if (count == null) return null;
  const t = tierFor(count);
  const Icon = ICONS[t.key] || Award;
  const title = t.next
    ? `${t.label} surgeon · ${count} surgeries · ${t.toNext} more to ${t.next.label}`
    : `${t.label} surgeon · ${count} surgeries`;
  const sm = size === 'sm';

  return (
    <span
      className={`tier tier-${t.key} inline-flex shrink-0 items-center gap-1 rounded-full align-middle font-bold whitespace-nowrap ${
        sm ? 'px-2 py-0.5 text-[0.68rem]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      title={title}
      aria-label={title}
    >
      <Icon size={sm ? 11 : 13} strokeWidth={2.5} aria-hidden />
      {t.label}
    </span>
  );
}
