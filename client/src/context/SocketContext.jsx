import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

// Production: connect straight to the API host (VITE_SOCKET_URL) so WebSockets
// work; dev: same origin through the Vite proxy.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const SocketContext = createContext({ socket: null, connected: false, lastEventAt: null });

// One live connection per logged-in session. Cache wiring (see AGENT.md):
//   admin:   stats:update -> ['summary'] replaced in place
//            surgery:change / surgeon:change -> lists invalidated
//            redemption:* / user:registered -> admin badge + lists invalidated
//   surgeon: my:surgery-change / reward:update -> own profile, cases, rewards refetch
export function SocketProvider({ children }) {
  const { token, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(null);

  const role = user?.role;
  const userId = user?.id;

  useEffect(() => {
    if (!token || !userId) return;
    const s = io(SOCKET_URL, { auth: { token } });
    const touch = () => setLastEventAt(new Date());
    const invalidate = (...keys) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

    s.on('connect', () => setConnected(true));
    s.on('disconnect', (reason) => {
      setConnected(false);
      // the server only force-disconnects when an admin disables the account
      if (reason === 'io server disconnect') logout();
    });
    s.on('connect_error', (err) => {
      setConnected(false);
      if (/not active|no longer exists|not linked/i.test(err.message)) logout();
    });

    if (role === 'admin') {
      s.on('stats:update', (summary) => {
        queryClient.setQueryData(['summary'], summary);
        touch();
      });
      s.on('surgery:change', () => {
        invalidate('surgeries', 'surgeon', 'surgeons');
        touch();
      });
      s.on('surgeon:change', () => {
        invalidate('surgeons', 'surgeon');
        touch();
      });
      s.on('redemption:new', () => invalidate('admin-counts', 'redemptions'));
      s.on('redemption:updated', () => invalidate('admin-counts', 'redemptions'));
      s.on('user:registered', () => invalidate('admin-counts', 'admin-users'));
    } else {
      s.on('my:surgery-change', () => {
        invalidate('my-profile', 'my-rewards', 'surgeries');
        touch();
      });
      s.on('reward:update', () => {
        invalidate('my-rewards');
        touch();
      });
    }

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, userId, role, queryClient, logout]);

  return <SocketContext.Provider value={{ socket, connected, lastEventAt }}>{children}</SocketContext.Provider>;
}

export const useLive = () => useContext(SocketContext);

// Subscribe a component to one socket event for as long as it is mounted.
export function useSocketEvent(event, handler) {
  const { socket } = useLive();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
