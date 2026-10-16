import { CalendarDays, Clock, ExternalLink, MapPin, Ticket } from 'lucide-react';
import { SSI_EVENTS } from '../data/ssiEvents';
import { PageHeader } from './Dashboard';

const DAY_FMT = { day: '2-digit' };
const MONTH_FMT = { month: 'short' };

// Six event blocks; filled from data/ssiEvents.js, placeholders until then.
export default function SsiEvents() {
  const announced = SSI_EVENTS.filter((e) => e.title).length;
  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Upcoming SSI events"
        subtitle={announced ? `${announced} upcoming event${announced === 1 ? '' : 's'}` : 'Event details will be announced here soon'}
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {SSI_EVENTS.map((e, i) => (
          <li key={e.id} className="rise" style={{ '--i': i }}>
            {e.title ? <EventCard event={e} /> : <PlaceholderCard n={i + 1} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DateBadge({ date }) {
  const d = date ? new Date(`${date}T00:00:00`) : null;
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-wash text-brand-ink">
      {d && !Number.isNaN(d.getTime()) ? (
        <>
          <span className="text-xl leading-none font-extrabold">{d.toLocaleDateString('en-IN', DAY_FMT)}</span>
          <span className="label-caps mt-1">{d.toLocaleDateString('en-IN', MONTH_FMT)}</span>
        </>
      ) : (
        <CalendarDays size={22} aria-hidden />
      )}
    </div>
  );
}

function EventCard({ event: e }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-4">
        <DateBadge date={e.date} />
        <div className="min-w-0">
          <h2 className="font-bold break-words text-ink">{e.title}</h2>
          <div className="mt-1 space-y-0.5 text-xs text-ink-2">
            {e.time && (
              <p className="flex items-center gap-1.5">
                <Clock size={12} className="text-muted" aria-hidden /> {e.time}
              </p>
            )}
            {e.location && (
              <p className="flex items-center gap-1.5">
                <MapPin size={12} className="text-muted" aria-hidden /> {e.location}
              </p>
            )}
          </div>
        </div>
      </div>
      {e.description && <p className="mt-3 text-sm text-ink-2">{e.description}</p>}
      {e.link && (
        <a
          href={e.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-sm font-semibold text-brand hover:underline"
        >
          Event details <ExternalLink size={14} aria-hidden />
        </a>
      )}
    </article>
  );
}

function PlaceholderCard({ n }) {
  return (
    <article
      className="flex h-full min-h-44 flex-col rounded-2xl border border-dashed border-line bg-surface p-4 sm:p-5"
      aria-label={`Event slot ${n}: details coming soon`}
    >
      <div className="flex items-start gap-4">
        <DateBadge />
        <div className="min-w-0 flex-1 space-y-2 pt-1" aria-hidden>
          <div className="h-3.5 w-3/4 rounded-full bg-surface-2" />
          <div className="h-3 w-1/2 rounded-full bg-surface-2" />
          <div className="h-3 w-2/3 rounded-full bg-surface-2" />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <span className="label-caps text-muted">Event {n}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-wash px-2.5 py-1 text-xs font-semibold text-warning-ink">
          <Ticket size={12} aria-hidden /> Details coming soon
        </span>
      </div>
    </article>
  );
}
