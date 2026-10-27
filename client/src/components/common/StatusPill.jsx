import { Ban, CheckCircle2, Clock, Gift, PackageCheck, Truck, XCircle } from 'lucide-react';

// Status always shows icon + text, never color alone.
const MAP = {
  pending: { label: 'Pending', icon: Clock, cls: 'bg-amber-wash text-warning-ink' },
  active: { label: 'Active', icon: CheckCircle2, cls: 'bg-good-wash text-good-ink' },
  disabled: { label: 'Disabled', icon: Ban, cls: 'bg-surface-2 text-muted' },
  available: { label: 'Ready to redeem', icon: Gift, cls: 'bg-violet-wash text-violet' },
  requested: { label: 'Requested', icon: Clock, cls: 'bg-amber-wash text-warning-ink' },
  approved: { label: 'Approved', icon: CheckCircle2, cls: 'bg-brand-wash text-brand-ink' },
  fulfilled: { label: 'Delivered', icon: PackageCheck, cls: 'bg-good-wash text-good-ink' },
  rejected: { label: 'Rejected', icon: XCircle, cls: 'bg-critical-wash text-critical' },
  // milestone gifts
  preparing: { label: 'Gift being prepared', icon: Gift, cls: 'bg-amber-wash text-warning-ink' },
  dispatched: { label: 'Dispatched', icon: Truck, cls: 'bg-brand-wash text-brand-ink' },
  delivered: { label: 'Delivered', icon: PackageCheck, cls: 'bg-good-wash text-good-ink' },
  closed: { label: 'Closed', icon: XCircle, cls: 'bg-surface-2 text-muted' },
};

export default function StatusPill({ status }) {
  const s = MAP[status] || { label: status, icon: Clock, cls: 'bg-surface-2 text-ink-2' };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.cls}`}>
      <Icon size={12} aria-hidden />
      {s.label}
    </span>
  );
}
