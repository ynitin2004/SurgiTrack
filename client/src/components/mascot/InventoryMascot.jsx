import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../common/Modal';
import { useSurgeonRewards } from '../rewards/SurgeonRewards';
import { fmtDate } from '../../utils/format';
import RobotFigure, { useLookAtCursor } from './RobotFigure';
import './mascot.css';

/*
 * RA-ONE on the surgeon dashboard: strides in from the right, stops beside the
 * surgeon's name (phones: at the right edge of his own row), waves, and
 * announces the newest instruments in the catalogue. Click him to see them
 * again; hover for a hello. Under prefers-reduced-motion he just appears.
 */
const HELLO = "Hi there! 👋 I'm RA-ONE";
const INVITE = 'Look what we have new in our inventory! 👀';
const SEEN_KEY = 'inventory-mascot-seen';
const WALK_SPEED = 110; // px per second

const readSeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
const writeSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable */
  }
};

export default function InventoryMascot({ className = '' }) {
  const trackRef = useRef(null);
  const walkerRef = useRef(null);
  const robotRef = useRef(null);
  const [walk, setWalk] = useState({ left: null, duration: 0 });
  const [walking, setWalking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [bubble, setBubble] = useState(null); // null | 'invite'
  const [bubbleSide, setBubbleSide] = useState('right');
  const [bubbleMax, setBubbleMax] = useState(270);
  const [showList, setShowList] = useState(false);
  const { rewards, openRedeem } = useSurgeonRewards();

  const { data } = useQuery({
    queryKey: ['new-inventory'],
    queryFn: () => api.get('/me/inventory/new').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const items = data?.items || [];
  const hasNews = items.length > 0;

  // left edge of the track on wider screens (right after the name), right edge on phones
  const stopLeft = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const w = walkerRef.current?.offsetWidth || 96;
    const wide = window.matchMedia?.('(min-width: 640px)').matches;
    return wide ? 0 : Math.max(0, track.clientWidth - w);
  }, []);

  // open into the free space of his own track (between the name and the
  // Export button) so the bubble never covers either; width capped to fit
  const pickBubbleSide = useCallback(() => {
    const r = robotRef.current?.getBoundingClientRect();
    const t = trackRef.current?.getBoundingClientRect();
    if (!r || !t) return;
    const right = t.right - r.right - 10;
    const left = r.left - Math.max(t.left, 0) - 10;
    const side = right >= 170 || right >= left ? 'right' : 'left';
    setBubbleSide(side);
    setBubbleMax(Math.max(150, Math.min(270, side === 'right' ? right : left)));
  }, []);

  const wave = useCallback(() => {
    setWaving(true);
    setTimeout(() => setWaving(false), 1300);
  }, []);

  // walk in once laid out: start at the track's right edge, then transition `left`
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let id = requestAnimationFrame(() => {
      const target = stopLeft();
      if (reduce) {
        setWalk({ left: target, duration: 0 });
        requestAnimationFrame(pickBubbleSide);
        return;
      }
      const start = Math.max(target, track.clientWidth - (walkerRef.current?.offsetWidth || 96));
      if (start - target < 4) {
        // nowhere to walk (phones): just arrive
        setWalk({ left: target, duration: 0 });
        requestAnimationFrame(() => {
          pickBubbleSide();
          wave();
        });
        return;
      }
      setWalk({ left: start, duration: 0 });
      id = requestAnimationFrame(() => {
        id = requestAnimationFrame(() => {
          setWalking(true);
          setWalk({ left: target, duration: Math.max(1.6, (start - target) / WALK_SPEED) });
        });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [stopLeft, pickBubbleSide, wave]);

  // first time this session (and once the inventory has loaded): announce it
  useEffect(() => {
    if (walking || walk.left === null || !hasNews || readSeen()) return undefined;
    const t = setTimeout(() => setBubble('invite'), 700);
    return () => clearTimeout(t);
  }, [walking, walk.left, hasNews]);

  const onArrive = () => {
    if (!walking) return;
    setWalking(false);
    pickBubbleSide();
    wave();
  };

  // stay in place when the layout changes width
  useEffect(() => {
    const onResize = () => {
      if (!walking) {
        setWalk({ left: stopLeft(), duration: 0 });
        pickBubbleSide();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [walking, stopLeft, pickBubbleSide]);

  useLookAtCursor(robotRef);

  const dismiss = () => {
    writeSeen();
    setBubble(null);
  };
  const show = () => {
    writeSeen();
    setBubble(null);
    setShowList(true);
  };
  const onPoke = () => {
    if (walking) return;
    wave();
    if (hasNews) setBubble((b) => (b === 'invite' ? null : 'invite'));
  };

  let content = null;
  if (bubble === 'invite') {
    content = (
      <>
        <div>{INVITE}</div>
        <div className="orbi-bubble-actions">
          <button type="button" className="ra-tour-btn ra-tour-btn-primary" onClick={(e) => { e.stopPropagation(); show(); }}>
            Show me
          </button>
          <button type="button" className="ra-tour-btn ra-tour-btn-ghost" onClick={(e) => { e.stopPropagation(); dismiss(); }}>
            Later
          </button>
        </div>
      </>
    );
  } else if (hovered) {
    content = hasNews && !walking ? `${HELLO}. Click me to see what's new!` : HELLO;
  }

  const available = rewards?.available || 0;

  return (
    <div className={`orbi-track ${className}`} ref={trackRef}>
      <div
        ref={walkerRef}
        className={`orbi-walker ${walking ? 'is-walking' : ''}`}
        style={walk.left === null ? { visibility: 'hidden' } : { left: `${walk.left}px`, transitionDuration: `${walk.duration}s` }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'left') onArrive();
        }}
      >
        <div
          ref={robotRef}
          className={`orbi ${waving ? 'is-waving' : ''} ${hovered ? 'is-happy' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="RA-ONE: see what's new in our instrument inventory"
          onClick={onPoke}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPoke();
            }
          }}
          onMouseEnter={() => {
            setHovered(true);
            if (!walking) wave();
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <div
            className={`orbi-bubble orbi-bubble-${bubbleSide} ${content ? 'is-open' : ''} ${bubble === 'invite' ? 'is-interactive' : ''}`}
            style={{ maxWidth: `${bubbleMax}px` }}
            aria-live="polite"
          >
            {content || HELLO}
          </div>
          <div className="orbi-stage">
            <RobotFigure />
          </div>
        </div>
      </div>

      <Modal open={showList} onClose={() => setShowList(false)} title="New in our inventory" size="md">
        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-2">The latest instruments added to the SurgiTrack catalogue.</p>
          <ul className="divide-y divide-line">
            {items.map((it, i) => (
              <li key={it._id} className="rise flex items-start gap-3 py-3" style={{ '--i': i }}>
                <span className="mt-0.5 rounded-lg bg-brand-wash p-2 text-brand" aria-hidden>
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{it.name}</span>
                    <span className="rounded-full bg-good-wash px-2 py-0.5 text-[0.68rem] font-bold text-good-ink">New</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {[it.category, it.shortLabel && `Code ${it.shortLabel}`, it.maxUses && `${it.maxUses} uses per instrument`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs whitespace-nowrap text-muted">
                  {it.addedAt ? `Added ${fmtDate(new Date(it.addedAt).getTime())}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            {available > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowList(false);
                  openRedeem();
                }}
                className="bg-reward inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110"
              >
                <Gift size={16} aria-hidden /> Redeem a free instrument
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowList(false)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-2"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
