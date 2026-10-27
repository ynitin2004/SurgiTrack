import { useId } from 'react';

// Metallic trophy per tier: [highlight, body, shadow]. Locked trophies are grey.
const METALS = {
  bronze: ['#f6c79a', '#c47a3a', '#7a3f12'],
  silver: ['#ffffff', '#c3ccd8', '#6b7686'],
  gold: ['#fff3b0', '#f5c542', '#a87908'],
  champion: ['#d9d3fb', '#7c3aed', '#3f2f99'],
  legend: ['#fbcfe8', '#c026d3', '#4a3aa7'],
  locked: ['#eef1f0', '#c9d1cf', '#94a09d'],
};

// Trophy badge artwork (decorative; the tier is always named in text nearby).
export default function TrophyIcon({ tier = 'gold', size = 24, locked = false, className = '' }) {
  const uid = `tr${useId().replace(/:/g, '')}`;
  const [hi, body, dark] = METALS[locked ? 'locked' : tier] || METALS.gold;
  const legend = tier === 'legend' && !locked;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}-cup`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hi} />
          <stop offset="55%" stopColor={body} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={body} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      {legend && (
        <path d="M21 13 L24 5 L29 10 L32 3 L35 10 L40 5 L43 13 Z" fill="#facc15" stroke="#a16207" strokeWidth="1.2" strokeLinejoin="round" />
      )}
      {/* handles */}
      <path d="M19 18 H12 C12 28 16 33 22 34" fill="none" stroke={`url(#${uid}-base)`} strokeWidth="4" strokeLinecap="round" />
      <path d="M45 18 H52 C52 28 48 33 42 34" fill="none" stroke={`url(#${uid}-base)`} strokeWidth="4" strokeLinecap="round" />
      {/* cup */}
      <path d="M18 13 H46 V25 C46 34.5 40 41 32 41 C24 41 18 34.5 18 25 Z" fill={`url(#${uid}-cup)`} stroke={dark} strokeWidth="1.2" />
      <path d="M22 16 C22 26 24 33 28 37" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      {/* star */}
      <path
        d="M32 19.5 L34.1 23.8 L38.8 24.4 L35.4 27.6 L36.3 32.3 L32 30 L27.7 32.3 L28.6 27.6 L25.2 24.4 L29.9 23.8 Z"
        fill={locked ? '#ffffff' : '#fffbeb'}
        fillOpacity={locked ? 0.7 : 0.95}
      />
      {/* stem + base */}
      <rect x="29" y="41" width="6" height="7" fill={`url(#${uid}-base)`} />
      <rect x="22" y="47" width="20" height="5" rx="1.5" fill={`url(#${uid}-cup)`} stroke={dark} strokeWidth="1" />
      <rect x="18" y="52" width="28" height="8" rx="2" fill={`url(#${uid}-base)`} />
      <rect x="25" y="54.5" width="14" height="3" rx="1" fill="#fff" fillOpacity="0.35" />
    </svg>
  );
}
