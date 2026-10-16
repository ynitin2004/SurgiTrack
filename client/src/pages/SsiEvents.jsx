import { Building2, CalendarDays, Clock, ExternalLink, Link2Off, MapPin } from 'lucide-react';
import { SSI_EVENTS } from '../data/ssiEvents';
import { PageHeader } from './Dashboard';

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// cover gradients (white text on all of them, so they work in both themes)
const TONES = {
  teal: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  violet: 'linear-gradient(135deg, #4a3aa7 0%, #7c3aed 100%)',
  amber: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
  rose: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
  blue: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  green: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
};

const parse = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

// "23–25 Oct 2026" · "30 Oct – 1 Nov 2026" · "24 Nov 2026"
function dateRange(start, end) {
  const s = parse(start);
  const e = parse(end || start);
  if (s.getTime() === e.getTime()) return `${s.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  }
  const sy = s.getFullYear() === e.getFullYear() ? '' : ` ${s.getFullYear()}`;
  return `${s.getDate()} ${MONTHS[s.getMonth()]}${sy} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

function statusOf(ev, today) {
  const s = parse(ev.start).getTime();
  const e = parse(ev.end || ev.start).getTime();
  if (today > e) return { key: 'ended', label: 'Ended' };
  if (today >= s) return { key: 'live', label: 'Happening now' };
  const days = Math.round((s - today) / DAY);
  return { key: 'soon', label: days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`, days };
}

// Upcoming / ongoing first by start date; finished events move to the end.
export default function SsiEvents() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const events = SSI_EVENTS.map((ev) => ({ ...ev, status: statusOf(ev, today) })).sort(
    (a, b) => (a.status.key === 'ended') - (b.status.key === 'ended') || a.start.localeCompare(b.start)
  );
  const upcoming = events.filter((e) => e.status.key !== 'ended').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Upcoming SSI events"
        subtitle={upcoming ? `${upcoming} upcoming conference${upcoming === 1 ? '' : 's'} where you can meet the SSI team` : 'No upcoming events right now'}
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((ev, i) => (
          <li key={ev.id} className="rise" style={{ '--i': i }}>
            <EventCard ev={ev} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cover({ ev }) {
  const s = parse(ev.start);
  return (
    <div
      className="relative flex aspect-[16/9] flex-col justify-between overflow-hidden p-4 text-white"
      style={ev.image ? undefined : { background: TONES[ev.tone] || TONES.teal }}
    >
      {ev.image ? (
        <img src={ev.image} alt={`${ev.title} poster`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <span className="absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <span className="relative label-caps text-white/85">{ev.country}</span>
          <div className="relative">
            <p className="text-3xl leading-none font-extrabold tracking-tight break-words sm:text-[2rem]">{ev.short}</p>
            <p className="mt-1.5 text-sm font-semibold text-white/90">{ev.city}</p>
          </div>
        </>
      )}
      <div className="absolute top-3 right-3 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-md" aria-hidden>
        <span className="text-lg leading-none font-extrabold text-ink">{s.getDate()}</span>
        <span className="label-caps mt-0.5 text-[0.62rem] text-muted">{MONTHS[s.getMonth()]}</span>
      </div>
    </div>
  );
}

const STATUS_CLS = {
  soon: 'bg-brand-wash text-brand-ink',
  live: 'bg-good-wash text-good-ink',
  ended: 'bg-surface-2 text-muted',
};

function EventCard({ ev }) {
  const ended = ev.status.key === 'ended';
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition ${
        ended ? 'opacity-70' : 'hover:-translate-y-0.5'
      }`}
    >
      <Cover ev={ev} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLS[ev.status.key]}`}>
            {ev.status.key === 'live' && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" aria-hidden />}
            {ev.status.label}
          </span>
        </div>
        <h2 className="mt-2.5 font-bold break-words text-ink">{ev.title}</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          <li className="flex items-start gap-2">
            <CalendarDays size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <span className="tabular">{dateRange(ev.start, ev.end)}</span>
          </li>
          {ev.time && (
            <li className="flex items-start gap-2">
              <Clock size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              {ev.time}
            </li>
          )}
          <li className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <span>{[ev.venue, `${ev.city}, ${ev.country}`].filter(Boolean).join(' · ')}</span>
          </li>
          {ev.organiser && (
            <li className="flex items-start gap-2">
              <Building2 size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <span>{ev.organiser}</span>
            </li>
          )}
        </ul>
        {ev.description && <p className="mt-3 text-sm text-muted">{ev.description}</p>}
        <div className="mt-auto pt-4">
          {ev.link ? (
            <a
              href={ev.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {ev.link.label} <ExternalLink size={14} aria-hidden />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Link2Off size={14} aria-hidden /> Link to be shared
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
