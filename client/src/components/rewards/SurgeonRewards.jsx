import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import CelebrationModal from './CelebrationModal';

const RewardsContext = createContext({ rewards: null, openCelebration: () => {} });
const SEEN_KEY = 'trophy-celebrated';

function readSeen() {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY)) || [];
  } catch {
    return [];
  }
}

// Mounted once for surgeon accounts. Celebrates a newly unlocked trophy (its
// gift still being prepared) once per session — including live, when a new
// case pushes the surgeon over the next milestone.
export function SurgeonRewardsProvider({ children }) {
  const { user } = useAuth();
  const [tier, setTier] = useState(null);

  const { data: rewards } = useQuery({
    queryKey: ['my-rewards'],
    queryFn: () => api.get('/me/rewards').then((r) => r.data),
  });

  // newest first, so the highest new trophy is celebrated
  const fresh = (rewards?.milestones || []).filter((m) => m.status === 'preparing').map((m) => m.tier);
  const freshKey = fresh.join(',');

  useEffect(() => {
    if (tier != null || !freshKey) return;
    const seen = readSeen();
    const first = freshKey.split(',').find((t) => !seen.includes(t));
    if (first) setTier(first);
  }, [freshKey, tier]);

  const close = useCallback(() => {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), ...fresh])]));
    setTier(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey]);

  const openCelebration = useCallback((t) => setTier(t || rewards?.tier?.tier || null), [rewards]);

  return (
    <RewardsContext.Provider value={{ rewards, openCelebration }}>
      {children}
      <CelebrationModal
        open={tier != null}
        onClose={close}
        milestone={rewards?.milestones.find((m) => m.tier === tier) || null}
        rewards={rewards}
        name={user?.name}
      />
    </RewardsContext.Provider>
  );
}

export const useSurgeonRewards = () => useContext(RewardsContext);
