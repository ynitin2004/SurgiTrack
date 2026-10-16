import { useEffect, useId } from 'react';
import brandMark from '../../assets/surgitrack-mark.svg';

/*
 * RA-ONE's body: a robot elephant dressed for an Indian temple festival - a gold nettipattam
 * (forehead caparison) carrying the brand mark, a saffron drape, a maroon jhool with gold tassels,
 * ivory tusks and a lotus scepter. Used by InventoryMascot.
 * Gradient/filter ids are made unique per instance with useId so two copies can be on screen.
 * Animated parts are driven by the .orbi-* classes in mascot.css.
 */
const RobotFigure = () => {
  const uid = `orbi${useId().replace(/:/g, '')}`;
  return (
        <svg className="orbi-svg" viewBox="0 0 160 200" aria-hidden="true">
            <defs>
              {/* glossy robot shell lit from the top-left */}
              <radialGradient id={`${uid}-shell`} cx="34%" cy="28%" r="80%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#eef2fb" />
                <stop offset="80%" stopColor="#c9d4ef" />
                <stop offset="100%" stopColor="#a6b5e2" />
              </radialGradient>
              <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d2a4d" />
                <stop offset="100%" stopColor="#0b1226" />
              </linearGradient>
              <linearGradient id={`${uid}-brand`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2851e4" />
                <stop offset="55%" stopColor="#5777ea" />
                <stop offset="100%" stopColor="#5a9be8" />
              </linearGradient>
              <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#dbe6ff" />
                <stop offset="55%" stopColor="#5a9be8" />
                <stop offset="100%" stopColor="#2851e4" />
              </radialGradient>
              <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* festival regalia */}
              <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="45%" stopColor="#f5c542" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
              <linearGradient id={`${uid}-cape`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffa94d" />
                <stop offset="100%" stopColor="#e2621b" />
              </linearGradient>
              <linearGradient id={`${uid}-jhool`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b3203a" />
                <stop offset="100%" stopColor="#6e1024" />
              </linearGradient>
              <linearGradient id={`${uid}-ivory`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fffdf6" />
                <stop offset="100%" stopColor="#e6d9b8" />
              </linearGradient>
              <linearGradient id={`${uid}-lotus`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd3e1" />
                <stop offset="100%" stopColor="#e2588a" />
              </linearGradient>
              <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* ground shadow (breathes with the steps) */}
            <ellipse className="orbi-shadow" cx="80" cy="192" rx="38" ry="6" fill="rgba(40, 81, 228, 0.22)" filter={`url(#${uid}-soft)`} />

            {/* sturdy elephant feet with ivory toenails: step alternately while walking */}
            <g className="orbi-foot orbi-foot-l">
              <rect x="57" y="166" width="19" height="20" rx="7" fill={`url(#${uid}-shell)`} />
              <circle cx="61.5" cy="183" r="1.8" fill={`url(#${uid}-ivory)`} />
              <circle cx="66.5" cy="183.6" r="1.8" fill={`url(#${uid}-ivory)`} />
              <circle cx="71.5" cy="183" r="1.8" fill={`url(#${uid}-ivory)`} />
            </g>
            <g className="orbi-foot orbi-foot-r">
              <rect x="84" y="166" width="19" height="20" rx="7" fill={`url(#${uid}-shell)`} />
              <circle cx="88.5" cy="183" r="1.8" fill={`url(#${uid}-ivory)`} />
              <circle cx="93.5" cy="183.6" r="1.8" fill={`url(#${uid}-ivory)`} />
              <circle cx="98.5" cy="183" r="1.8" fill={`url(#${uid}-ivory)`} />
            </g>

            <g className="orbi-float">
              {/* saffron drape behind the body, gold-trimmed */}
              <path className="orbi-cape" d="M56 104 C40 112 34 148 30 172 Q80 184 130 172 C126 148 120 112 104 104 Z" fill={`url(#${uid}-cape)`} stroke={`url(#${uid}-gold)`} strokeWidth="2.5" strokeLinejoin="round" />

              {/* body: egg-shaped shell under a maroon jhool, with the pulsing core as its centre jewel */}
              <g className="orbi-body">
                <path d="M80 100 C110 100 120 130 114 152 C108 174 52 174 46 152 C40 130 50 100 80 100 Z" fill={`url(#${uid}-shell)`} />
                <path d="M58 112 C66 104 78 103 86 105" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9" />
                <path d="M50 116 Q80 106 110 116 L107 146 Q80 156 53 146 Z" fill={`url(#${uid}-jhool)`} stroke={`url(#${uid}-gold)`} strokeWidth="2" strokeLinejoin="round" />
                <path d="M55 120 Q80 111.5 105 120 L102.5 142 Q80 150.5 57.5 142 Z" fill="none" stroke="#f5c542" strokeWidth="1" strokeDasharray="2 2.5" opacity="0.9" />
                {[[57, 147.5], [68, 150.6], [80, 151.5], [92, 150.6], [103, 147.5]].map(([cx, cy]) => (
                  <circle key={cx} cx={cx} cy={cy} r="2.1" fill={`url(#${uid}-gold)`} />
                ))}
                <circle className="orbi-core-ring" cx="80" cy="130" r="11" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2" opacity="0.85" />
                <circle className="orbi-core" cx="80" cy="130" r="6" fill={`url(#${uid}-core)`} filter={`url(#${uid}-glow)`} />
              </g>

              {/* gold scepter in his left hand, crowned with a glowing lotus */}
              <g className="orbi-scepter">
                <line x1="31" y1="170" x2="24.5" y2="112" stroke={`url(#${uid}-gold)`} strokeWidth="4" strokeLinecap="round" />
                {/* drawn at y 81-99, shifted below the ear */}
                <g filter={`url(#${uid}-glow)`} transform="translate(0 13)">
                  <path d="M24.5 99 C17.5 97 14 91.5 15 86.5 C19.5 87.5 23 92 24.5 99 Z" fill={`url(#${uid}-lotus)`} />
                  <path d="M24.5 99 C31.5 97 35 91.5 34 86.5 C29.5 87.5 26 92 24.5 99 Z" fill={`url(#${uid}-lotus)`} />
                  <path d="M24.5 99 C19.5 93 20.5 86 24.5 81 C28.5 86 29.5 93 24.5 99 Z" fill={`url(#${uid}-lotus)`} stroke="#ffd3e1" strokeWidth="0.6" />
                </g>
              </g>

              {/* arms: swing in time with his stride; the right one gives a royal wave every few seconds */}
              <ellipse className="orbi-arm orbi-arm-l" cx="40" cy="130" rx="8" ry="22" fill={`url(#${uid}-shell)`} transform="rotate(16 40 130)" />
              <g className="orbi-royal-wave">
                <ellipse className="orbi-arm orbi-arm-r" cx="120" cy="130" rx="8" ry="22" fill={`url(#${uid}-shell)`} transform="rotate(-16 120 130)" />
              </g>

              {/* head (floats separately above the body) */}
              <g className="orbi-head">
                {/* big fan ears behind the head, with brand-blue circuit panels; they flap gently */}
                <g className="orbi-ear orbi-ear-l">
                  <path d="M46 40 C28 30 10 40 10 60 C10 80 22 94 40 88 C46 86 48 78 48 70 Z" fill={`url(#${uid}-shell)`} />
                  <path d="M42 46 C30 40 18 48 18 62 C18 76 26 86 38 82 C42 80 43 74 43 68 Z" fill={`url(#${uid}-brand)`} opacity="0.85" />
                  <path d="M38 52 L26 60 L30 72 M26 60 L20 62" stroke="#dbe6ff" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
                  <circle cx="30" cy="72" r="1.6" fill="#dbe6ff" />
                </g>
                <g className="orbi-ear orbi-ear-r">
                  <path d="M114 40 C132 30 150 40 150 60 C150 80 138 94 120 88 C114 86 112 78 112 70 Z" fill={`url(#${uid}-shell)`} />
                  <path d="M118 46 C130 40 142 48 142 62 C142 76 134 86 122 82 C118 80 117 74 117 68 Z" fill={`url(#${uid}-brand)`} opacity="0.85" />
                  <path d="M122 52 L134 60 L130 72 M134 60 L140 62" stroke="#dbe6ff" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
                  <circle cx="130" cy="72" r="1.6" fill="#dbe6ff" />
                </g>

                <path d="M80 20 C110 20 122 38 120 56 C118 76 102 86 80 86 C58 86 42 76 40 56 C38 38 50 20 80 20 Z" fill={`url(#${uid}-shell)`} />
                <path d="M52 34 C60 27 70 24 82 25" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.95" />

                {/* nettipattam: the gold forehead caparison, with the brand mark at its heart */}
                <g className="orbi-crown">
                  <path d="M60 21 Q80 13 100 21 L96 34 Q80 45 64 34 Z" fill={`url(#${uid}-gold)`} stroke="#a87908" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="71" cy="33.5" r="1.4" fill="#a87908" />
                  <circle cx="89" cy="33.5" r="1.4" fill="#a87908" />
                  <circle className="orbi-crown-jewel" cx="66" cy="24.5" r="2.4" fill="#e53950" />
                  <circle className="orbi-crown-jewel" cx="94" cy="24.5" r="2.4" fill="#e53950" />
                  <circle className="orbi-crown-jewel" cx="80" cy="39" r="2" fill="#5a9be8" />
                  <circle cx="80" cy="27.5" r="5.8" fill="#ffffff" />
                  <image href={brandMark} x="75.5" y="23" width="9" height="9" />
                </g>

                <rect x="48" y="44" width="64" height="24" rx="12" fill={`url(#${uid}-visor)`} />
                <rect x="52" y="46.5" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.08" />
                <g className="orbi-eyes" filter={`url(#${uid}-glow)`}>
                  <g className="orbi-eyes-open">
                    <ellipse cx="67" cy="56" rx="6.5" ry="5" fill="#8fb8ff" />
                    <ellipse cx="93" cy="56" rx="6.5" ry="5" fill="#8fb8ff" />
                  </g>
                  <g className="orbi-eyes-happy" fill="none" stroke="#8fb8ff" strokeWidth="3.4" strokeLinecap="round">
                    <path d="M60 59 Q67 50 74 59" />
                    <path d="M86 59 Q93 50 100 59" />
                  </g>
                </g>

                {/* ivory tusks with gold bands */}
                <path d="M66 70 Q58 83 64 94" stroke={`url(#${uid}-ivory)`} strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M94 70 Q102 83 96 94" stroke={`url(#${uid}-ivory)`} strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M61.5 76 L67.5 78" stroke="#f5c542" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M98.5 76 L92.5 78" stroke="#f5c542" strokeWidth="2.4" strokeLinecap="round" />

                {/* segmented robot trunk: sways idly, lifts for a trumpet when he waves */}
                <g className="orbi-trunk">
                  <path d="M80 64 C80 82 74 92 78 102 C81 110 92 112 96 104" stroke="#d3dcf3" strokeWidth="11" strokeLinecap="round" fill="none" />
                  <path d="M80 64 C80 82 74 92 78 102 C81 110 92 112 96 104" stroke="#a6b5e2" strokeWidth="11" strokeDasharray="1.6 7" fill="none" />
                  <path d="M78 66 C78 80 73 90 76 100" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
                  <circle cx="96" cy="104" r="2" fill="#1d2a4d" />
                </g>
              </g>
            </g>
          </svg>
  );
};

/* Eyes and head follow the cursor: sets the --orbi-eye-x/y and --orbi-tilt vars on ref's element */
export const useLookAtCursor = (ref) => {
  useEffect(() => {
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        const clamp = (v) => Math.max(-1, Math.min(1, v * 2.2));
        el.style.setProperty('--orbi-eye-x', `${clamp(dx) * 5}px`);
        el.style.setProperty('--orbi-eye-y', `${clamp(dy) * 3}px`);
        el.style.setProperty('--orbi-tilt', `${clamp(dx) * 7}deg`);
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(frame); };
  }, [ref]);
};

export default RobotFigure;
