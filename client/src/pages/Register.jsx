import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/layout/AuthShell';
import { btnPrimary, control, errorMessage } from '../components/common/ui';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name';
  if (!EMAIL_RX.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.password.length < 8) e.password = 'At least 8 characters';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Use letters and numbers';
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
  return e;
}

// Self-registration for surgeons. Accounts start as "pending"; an admin links
// them to the right surgeon profile before they can sign in.
export default function Register() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', hospital: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k]) setErrors(validate(next));
  };
  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(form));
  };

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(v).length) return;
    setBusy(true);
    setServerError('');
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        hospital: form.hospital.trim(),
        password: form.password,
      });
      navigate('/login', { replace: true, state: { registered: true, email: form.email.trim() } });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setServerError(errorMessage(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => {
    const err = touched[k] && errors[k];
    return (
      <div>
        <label htmlFor={`reg-${k}`} className="block text-sm font-semibold text-ink">
          {label}
        </label>
        <input
          id={`reg-${k}`}
          className={`${control} mt-1.5 ${err ? 'border-critical' : ''}`}
          value={form[k]}
          onChange={set(k)}
          onBlur={blur(k)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `reg-${k}-err` : undefined}
          {...props}
        />
        {err && (
          <span id={`reg-${k}-err`} className="mt-1 block text-xs font-medium text-critical">
            {errors[k]}
          </span>
        )}
      </div>
    );
  };

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">Create surgeon account</h2>
        <p className="mt-1.5 text-sm text-ink-2">
          An administrator will verify your details and link your surgery records before you can sign in.
        </p>
        <div className="mt-8 space-y-4">
          {field('name', 'Full name', { placeholder: 'Dr. Firstname Lastname', autoComplete: 'name', autoFocus: true })}
          {field('email', 'Work email', { type: 'email', autoComplete: 'email' })}
          {field('hospital', 'Hospital (optional)', { placeholder: 'Where you operate', autoComplete: 'organization' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
            {field('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
          </div>
        </div>

        {serverError && (
          <p className="mt-4 rounded-xl bg-critical-wash p-3 text-sm text-critical" role="alert">
            ⚠ {serverError}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${btnPrimary} mt-6 w-full py-3`}>
          <UserPlus size={16} aria-hidden /> {busy ? 'Submitting…' : 'Request account'}
        </button>
        <p className="mt-6 text-center text-sm text-ink-2">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
