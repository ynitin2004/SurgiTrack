import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import SurgeonProfileView from '../components/surgeon/SurgeonProfileView';
import { PageSkeleton } from './Dashboard';

export default function SurgeonDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['surgeon', id],
    queryFn: () => api.get(`/surgeons/${id}`).then((r) => r.data),
  });

  const back = (
    <Link to="/surgeons" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      <ArrowLeft size={14} aria-hidden /> All surgeons
    </Link>
  );

  if (isLoading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-3">
        {back}
        <p className="text-critical">⚠ {error.response?.data?.message || 'Could not load surgeon.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      <SurgeonProfileView data={data} heading="Surgeon profile" allCasesHref={`/surgeries?surgeonId=${id}`} reportBase={`/surgeons/${id}`} />
    </div>
  );
}
