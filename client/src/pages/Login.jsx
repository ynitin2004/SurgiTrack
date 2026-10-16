import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Clock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/layout/AuthShell';
import { btnPrimary, control, errorMessage } from '../components/common/ui';

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError({ code: err.response?.data?.code, message: errorMessage(err, 'Login failed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back</h2>
        <p className="mt-1.5 text-sm text-ink-2">Sign in to your admin or surgeon account.</p>

        {location.state?.registered && !error && (
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-brand-wash p-3 text-sm text-brand-ink" role="status">
            <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
            Registration received. You can sign in once an administrator approves your account.
          </p>
        )}

        <label className="mt-8 block text-sm font-semibold text-ink">
          Email
          <input className={`${control} mt-1.5`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="mt-4 block text-sm font-semibold text-ink">
          Password
          <input className={`${control} mt-1.5`} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${error.code === 'PENDING' ? 'bg-amber-wash text-warning-ink' : 'bg-critical-wash text-critical'}`}
            role="alert"
          >
            {error.code === 'PENDING' ? '⏳ ' : '⚠ '}
            {error.message}
          </p>
        )}

        <button type="submit" disabled={busy || !email || !password} className={`${btnPrimary} mt-6 w-full py-3`}>
          <LogIn size={16} aria-hidden /> {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-6 text-center text-sm text-ink-2">
          Surgeon without an account?{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
