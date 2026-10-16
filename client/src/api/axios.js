import axios from 'axios';

export const TOKEN_KEY = 'dashboard_token';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // expired/invalid token -> back to login
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
