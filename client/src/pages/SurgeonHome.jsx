import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import SurgeonProfileView from '../components/surgeon/SurgeonProfileView';
import RewardProgressCard from '../components/rewards/RewardProgressCard';
import { useSurgeonRewards } from '../components/rewards/SurgeonRewards';
import { PageSkeleton } from './Dashboard';
import InventoryMascot from '../components/mascot/InventoryMascot';

// Surgeon portal home: only ever their own data (the API scopes it to the
// surgeon profile linked to the logged-in account).
export default function SurgeonHome() {
  const { rewards, openRedeem } = useSurgeonRewards();
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/me/profile').then((r) => r.data),
  });

  if (isLoading) return <PageSkeleton />;
  if (error) return <p className="text-critical">⚠ {error.response?.data?.message || 'Could not load your profile.'}</p>;

  return (
    <SurgeonProfileView data={data} heading="My dashboard" allCasesHref="/surgeries" mascot={<InventoryMascot />} reportBase="/me">
      <RewardProgressCard rewards={rewards} onRedeem={() => openRedeem()} />
    </SurgeonProfileView>
  );
}
