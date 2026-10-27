import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { SocketProvider, useLive } from '../../context/SocketContext';
import AdminAlerts from '../rewards/AdminAlerts';
import { SurgeonRewardsProvider } from '../rewards/SurgeonRewards';
import { initials } from '../surgeon/SurgeonProfileView';

const NAV = {
  admin: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/surgeries', label: 'Surgeries', icon: ClipboardList },
    { to: '/surgeons', label: 'Surgeons', icon: Stethoscope },
    { to: '/rewards', label: 'Rewards & gifts', icon: Gift, badge: 'pendingGifts' },
    { to: '/users', label: 'Users & access', icon: UserCog, badge: 'pendingUsers' },
  ],
  surgeon: [
    { to: '/', label: 'My dashboard', icon: LayoutDashboard, end: true },
    { to: '/surgeries', label: 'My cases', icon: ClipboardList },
    { to: '/team', label: 'My team', icon: Users },
    { to: '/rewards', label: 'My rewards', icon: Gift, badge: 'availableRewards' },
    { to: '/events', label: 'Upcoming SSI events', icon: CalendarDays },
    { to: '/social', label: 'Social profile', icon: MonitorPlay },
  ],
};

export default function Layout() {
  const { user } = useAuth();
  const content = (
    <Shell>
      <Outlet />
    </Shell>
  );
  return (
    <SocketProvider>
      {user.role === 'surgeon' ? (
        <SurgeonRewardsProvider>{content}</SurgeonRewardsProvider>
      ) : (
        <>
          {content}
          <AdminAlerts />
        </>
      )}
    </SocketProvider>
  );
}

function useBadges(role) {
  const admin = useQuery({
    queryKey: ['admin-counts'],
    queryFn: () => api.get('/admin/counts').then((r) => r.data),
    enabled: role === 'admin',
  });
  const surgeon = useQuery({
    queryKey: ['my-rewards'],
    queryFn: () => api.get('/me/rewards').then((r) => r.data),
    enabled: role === 'surgeon',
  });
  return role === 'admin'
    ? admin.data || {}
    : { availableRewards: surgeon.data?.openGifts || 0 };
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const { connected, lastEventAt } = useLive();
  const [menuOpen, setMenuOpen] = useState(false);
  const badges = useBadges(user.role);
  const nav = NAV[user.role] || [];
  const adminAlerts = (badges.pendingGifts || 0) + (badges.pendingUsers || 0);

  const sidebar = (
    <nav className="flex flex-col gap-1 px-3" aria-label="Main">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive ? 'bg-white text-[#0b3b37] shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <n.icon size={18} aria-hidden />
          <span className="flex-1">{n.label}</span>
          {badges[n.badge] > 0 && (
            <span className="rounded-full bg-[#f59e0b] px-2 py-0.5 text-[0.7rem] font-bold text-[#3b2600]">{badges[n.badge]}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col py-5 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">{sidebar}</div>
        <div className="mx-3 rounded-xl bg-white/10 p-3 text-xs text-white/80">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Activity size={14} aria-hidden /> Live data
          </div>
          <p className="mt-1">Figures update automatically as new surgeries are recorded.</p>
        </div>
      </aside>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="bg-sidebar relative h-full w-72 py-5">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-white" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <div className="mt-8">{sidebar}</div>
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-ink lg:hidden" aria-label="Open menu">
              <Menu size={20} />
            </button>
            <LiveBadge connected={connected} lastEventAt={lastEventAt} />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user.role === 'admin' && (
              <Link
                to={badges.pendingGifts ? '/rewards' : '/users'}
                className="relative rounded-xl p-2 text-ink-2 hover:bg-surface-2"
                aria-label={`${adminAlerts} items need attention`}
              >
                <Bell size={20} />
                {adminAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-critical px-1 text-center text-[0.65rem] leading-5 font-bold text-white">
                    {adminAlerts}
                  </span>
                )}
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold text-ink">{user.name}</div>
              <div className="inline-block rounded-full bg-brand-wash px-2 py-0.5 text-[0.7rem] font-bold text-brand-ink capitalize">
                {user.role}
              </div>
            </div>
            <div className="bg-hero flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white" aria-hidden>
              {initials(user.name)}
            </div>
            <button onClick={logout} className="rounded-xl p-2 text-ink-2 hover:bg-surface-2" aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 text-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
        <Activity size={20} aria-hidden />
      </div>
      <div>
        <div className="text-base leading-tight font-extrabold">SurgiTrack</div>
        <div className="text-[0.7rem] text-white/70">Surgery analytics</div>
      </div>
    </div>
  );
}

// Status shown with a dot + text label, never color alone.
function LiveBadge({ connected, lastEventAt }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
        connected ? 'bg-good-wash text-good-ink' : 'bg-critical-wash text-critical'
      }`}
      role="status"
    >
      <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-good' : 'bg-critical'}`} aria-hidden />
      {connected ? 'Live' : 'Reconnecting…'}
      {lastEventAt && <span className="hidden font-medium opacity-80 sm:inline">· updated {lastEventAt.toLocaleTimeString()}</span>}
    </div>
  );
}
