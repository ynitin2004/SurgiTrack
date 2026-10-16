import { CirclePlay, ExternalLink } from 'lucide-react';
import { SOCIAL_PROFILES } from '../data/socialProfiles';
import { PageHeader } from './Dashboard';

// Surgeons' YouTube channels: photo, name and a link that opens in a new tab.
export default function SocialProfile() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Social profile" subtitle="Surgical videos and talks from our surgeons on YouTube" />
      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {SOCIAL_PROFILES.map((p, i) => (
          <li key={p.id} className="rise" style={{ '--i': i }}>
            <ProfileCard p={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileCard({ p }) {
  return (
    <a
      href={p.channel}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${p.name} on YouTube (opens in a new tab)`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-white">
        <img
          src={p.photo}
          alt={p.name}
          loading="lazy"
          width="480"
          height="600"
          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-[#ff0033] px-3 py-1.5 text-xs font-bold text-white shadow-md">
          <CirclePlay size={14} aria-hidden /> YouTube
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-bold text-ink">{p.name}</h2>
        {p.affiliation && <p className="mt-0.5 text-xs text-muted">{p.affiliation}</p>}
        <p className="mt-2 truncate text-sm text-ink-2" title={p.handle}>
          {p.handle}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-brand group-hover:underline">
          Visit channel <ExternalLink size={14} aria-hidden />
        </span>
      </div>
    </a>
  );
}
