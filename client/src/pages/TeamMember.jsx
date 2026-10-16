import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SurgeonProfileView from '../components/surgeon/SurgeonProfileView';
import { PageSkeleton } from './Dashboard';

// A teammate's dashboard — same view as the surgeon's own (read-only, no rewards).
export default function TeamMember() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['team-member', id],
    queryFn: () => api.get(`/me/team/${id}`).then((r) => r.data),
    enabled: id !== user.surgeonId,
    retry: false,
  });

  if (id === user.surgeonId) return <Navigate to="/" replace />;

  const back = (
    <Link to="/team" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      <ArrowLeft size={14} aria-hidden /> My team
    </Link>
  );

  if (isLoading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-3">
        {back}
        <p className="text-critical">⚠ {error.response?.data?.message || 'Could not load this surgeon.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      <SurgeonProfileView data={data} heading="Team member" allCasesHref={`/surgeries?surgeonId=${id}`} reportBase={`/me/team/${id}`} />
    </div>
  );
}
