import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SurgeonHome from './pages/SurgeonHome';
import Surgeries from './pages/Surgeries';
import Surgeons from './pages/Surgeons';
import SurgeonDetail from './pages/SurgeonDetail';
import AdminRewards from './pages/AdminRewards';
import SurgeonRewardsPage from './pages/SurgeonRewardsPage';
import Users from './pages/Users';
import Team from './pages/Team';
import TeamMember from './pages/TeamMember';
import SsiEvents from './pages/SsiEvents';
import SocialProfile from './pages/SocialProfile';

// Same URL, different page per role.
function ByRole({ admin, surgeon }) {
  const { user } = useAuth();
  return user.role === 'admin' ? admin : surgeon;
}

const adminOnly = (el) => <ProtectedRoute roles={['admin']}>{el}</ProtectedRoute>;
const surgeonOnly = (el) => <ProtectedRoute roles={['surgeon']}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ByRole admin={<Dashboard />} surgeon={<SurgeonHome />} />} />
        <Route path="/surgeries" element={<Surgeries />} />
        <Route path="/rewards" element={<ByRole admin={<AdminRewards />} surgeon={<SurgeonRewardsPage />} />} />
        <Route path="/surgeons" element={adminOnly(<Surgeons />)} />
        <Route path="/surgeons/:id" element={adminOnly(<SurgeonDetail />)} />
        <Route path="/users" element={adminOnly(<Users />)} />
        <Route path="/team" element={surgeonOnly(<Team />)} />
        <Route path="/team/:id" element={surgeonOnly(<TeamMember />)} />
        <Route path="/events" element={surgeonOnly(<SsiEvents />)} />
        <Route path="/social" element={surgeonOnly(<SocialProfile />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
