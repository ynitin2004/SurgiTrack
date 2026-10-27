import { tierFor } from '../../utils/tier';
import TrophyIcon from '../rewards/TrophyIcon';

// Trophy badge shown right after a surgeon's name. Beginners (under 50
// surgeries) have no badge. The tier is named in text, so colour is never the
// only signal.
export default function TierBadge({ count, size = 'md', className = '' }) {
  if (count == null) return null;
  const t = tierFor(count);
  if (t.beginner) return null;
  const title = t.next
    ? `${t.label} trophy · ${count} surgeries · ${t.toNext} more to ${t.next.label}`
    : `${t.label} trophy · ${count} surgeries`;
  const sm = size === 'sm';

  return (
    <span
      className={`tier tier-${t.key} inline-flex shrink-0 items-center gap-1 rounded-full align-middle font-bold whitespace-nowrap ${
        sm ? 'py-0.5 pr-2 pl-1 text-[0.68rem]' : 'py-0.5 pr-2.5 pl-1 text-xs'
      } ${className}`}
      title={title}
      aria-label={title}
    >
      <TrophyIcon tier={t.key} size={sm ? 15 : 18} />
      {t.label}
    </span>
  );
}
