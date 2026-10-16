import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// UX guard only — every API route enforces the same roles server-side.
export default function ProtectedRoute({ children, roles }) {
  const { token, user, loading } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (loading || !user) return <div className="p-8 text-muted">Loading…</div>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
