import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import RewardModal from './RewardModal';

const RewardsContext = createContext({ rewards: null, openRedeem: () => {} });
const DISMISSED_KEY = 'reward-popup-dismissed';

function readDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY)) || [];
  } catch {
    return [];
  }
}

// Mounted once for surgeon accounts. Pops the reward card automatically when
// there is an unredeemed milestone the surgeon hasn't dismissed this session —
// including live, when a new case pushes them over the next milestone.
export function SurgeonRewardsProvider({ children }) {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState(null);

  const { data: rewards } = useQuery({
    queryKey: ['my-rewards'],
    queryFn: () => api.get('/me/rewards').then((r) => r.data),
  });
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/me/profile').then((r) => r.data),
  });

  const available = rewards?.milestones.filter((m) => m.status === 'available').map((m) => m.milestone) || [];
  const availableKey = available.join(',');

  useEffect(() => {
    if (milestone != null || !availableKey) return;
    const dismissed = readDismissed();
    const fresh = availableKey.split(',').map(Number).filter((m) => !dismissed.includes(m));
    if (fresh.length) setMilestone(Math.max(...fresh));
  }, [availableKey, milestone]);

  const close = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...readDismissed(), ...available])]));
    setMilestone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKey]);

  const openRedeem = useCallback(
    (m) => {
      if (m != null) setMilestone(m);
      else if (availableKey) setMilestone(Math.max(...availableKey.split(',').map(Number)));
    },
    [availableKey]
  );

  return (
    <RewardsContext.Provider value={{ rewards, openRedeem }}>
      {children}
      <RewardModal
        open={milestone != null}
        onClose={close}
        milestone={milestone}
        rewards={rewards}
        name={user?.name}
        favourites={(profile?.instruments || []).map((i) => i.name)}
      />
    </RewardsContext.Provider>
  );
}

export const useSurgeonRewards = () => useContext(RewardsContext);
