import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { TOKEN_KEY } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.clear();
    queryClient.clear(); // never show the previous user's cached data
    setToken(null);
    setUser(null);
    setLoading(false);
  }, [queryClient]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => !cancelled && setUser(res.data.user))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    queryClient.clear();
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
