import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Ban, Check, RotateCcw, ShieldCheck, Stethoscope, UserPlus, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import StatusPill from '../components/common/StatusPill';
import SurgeonPicker from '../components/admin/SurgeonPicker';
import { btnDanger, btnGhost, btnPrimary, btnSmall, control, errorMessage } from '../components/common/ui';
import { initials } from '../components/surgeon/SurgeonProfileView';
import { PageHeader } from './Dashboard';

const TABS = [
  { key: 'pending', label: 'Pending approval' },
  { key: 'active', label: 'Active' },
  { key: 'disabled', label: 'Disabled' },
  { key: '', label: 'All' },
];
const th = 'label-caps py-3 pr-4 font-bold text-muted';

export default function Users() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [approving, setApproving] = useState(null);
  const [confirm, setConfirm] = useState(null); // { user, action }
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.items),
  });
  const all = data || [];
  const items = tab ? all.filter((u) => u.status === tab) : all;
  const count = (k) => (k ? all.filter((u) => u.status === k).length : all.length);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-counts'] });
    queryClient.invalidateQueries({ queryKey: ['surgeons'] });
  };

  const act = useMutation({
    mutationFn: ({ id, action, surgeonId }) => api.patch(`/admin/users/${id}`, { action, surgeonId }).then((r) => r.data),
    onSuccess: (_, { action, name }) => {
      refresh();
      const msg = { approve: 'approved and can now sign in', reject: 'registration rejected', disable: 'disabled and signed out', enable: 're-enabled' }[action];
      toast(`${name} ${msg}.`, 'success');
      setApproving(null);
      setConfirm(null);
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  // shared by the phone cards and the desktop table
  const roleBadge = (u) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2 capitalize">
      {u.role === 'admin' ? <ShieldCheck size={12} aria-hidden /> : <Stethoscope size={12} aria-hidden />}
      {u.role}
      {u.builtIn && ' · built-in'}
    </span>
  );
  const profileCell = (u) =>
    u.surgeonId ? (
      <Link to={`/surgeons/${u.surgeonId}`} className="font-medium text-brand hover:underline">
        {u.surgeonName || 'View profile'}
      </Link>
    ) : u.role === 'surgeon' ? (
      <span className="text-xs text-muted">Not linked yet{u.hospital ? ` · says: ${u.hospital}` : ''}</span>
    ) : (
      '—'
    );
  const actions = (u, locked) =>
    locked ? (
      <span className="text-xs text-muted">{u.builtIn ? 'Managed in .env' : 'You'}</span>
    ) : (
      <div className="flex justify-end gap-2">
        {u.status === 'pending' && (
          <>
            <button className={`${btnSmall} border border-line text-critical hover:bg-critical-wash`} onClick={() => setConfirm({ user: u, action: 'reject' })}>
              <X size={14} aria-hidden /> Reject
            </button>
            <button className={`${btnSmall} bg-brand text-white hover:brightness-110`} onClick={() => setApproving(u)}>
              <Check size={14} aria-hidden /> Approve
            </button>
          </>
        )}
        {u.status === 'active' && (
          <button className={`${btnSmall} border border-line text-ink-2 hover:bg-surface-2`} onClick={() => setConfirm({ user: u, action: 'disable' })}>
            <Ban size={14} aria-hidden /> Disable
          </button>
        )}
        {u.status === 'disabled' && (
          <button
            className={`${btnSmall} border border-line text-ink-2 hover:bg-surface-2`}
            onClick={() => act.mutate({ id: u.id, action: 'enable', name: u.name })}
            disabled={act.isPending}
          >
            <RotateCcw size={14} aria-hidden /> Enable
          </button>
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & access"
        subtitle="Approve surgeon registrations, link them to their surgery records and manage admin access"
        action={
          <button className={btnPrimary} onClick={() => setCreating(true)}>
            <UserPlus size={16} aria-hidden /> Add user
          </button>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-brand text-white shadow-sm' : 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
            }`}
          >
            {t.label} <span className="tabular ml-1 opacity-75">{count(t.key)}</span>
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading…</div>
        ) : !items.length ? (
          <div className="py-10 text-center text-sm text-muted">
            {tab === 'pending' ? 'No registrations waiting for approval.' : 'No users in this list.'}
          </div>
        ) : (
          <>
          <ul className="-mx-1 divide-y divide-line md:hidden">
            {items.map((u) => {
              const locked = u.builtIn || u.id === me.id;
              return (
                <li key={u.id} className="space-y-2 px-1 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-xs font-bold text-brand-ink">
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words text-ink">{u.name}</span>
                      <span className="block truncate text-xs text-muted">{u.email}</span>
                    </span>
                    <StatusPill status={u.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 text-ink-2">
                    {roleBadge(u)}
                    <span className="min-w-0">{profileCell(u)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-12">
                    <span className="text-xs text-muted">
                      Registered {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                    </span>
                    {actions(u, locked)}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="-mx-5 hidden overflow-x-auto px-5 md:-mx-6 md:block md:px-6">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className={th}>User</th>
                  <th className={th}>Role</th>
                  <th className={th}>Surgeon profile</th>
                  <th className={th}>Status</th>
                  <th className={th}>Registered</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const locked = u.builtIn || u.id === me.id;
                  return (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-xs font-bold text-brand-ink">
                            {initials(u.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">{u.name}</span>
                            <span className="block truncate text-xs text-muted">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{roleBadge(u)}</td>
                      <td className="py-3 pr-4 text-ink-2">{profileCell(u)}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={u.status} />
                      </td>
                      <td className="py-3 pr-4 text-xs whitespace-nowrap text-muted">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 pr-0 text-right">{actions(u, locked)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <ApproveModal
        key={approving?.id || 'none'}
        user={approving}
        onClose={() => setApproving(null)}
        busy={act.isPending}
        onApprove={(surgeonId) => act.mutate({ id: approving.id, action: 'approve', surgeonId, name: approving.name })}
      />

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.action === 'reject' ? 'Reject registration?' : 'Disable account?'}
        size="sm"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-2">
            {confirm?.action === 'reject'
              ? `${confirm?.user.name}'s registration will be deleted. They can register again later.`
              : `${confirm?.user.name} will be signed out immediately and won't be able to sign in until re-enabled.`}
          </p>
          <div className="flex gap-2">
            <button className={`${btnGhost} flex-1`} onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              className={`${btnDanger} flex-1`}
              disabled={act.isPending}
              onClick={() => act.mutate({ id: confirm.user.id, action: confirm.action, name: confirm.user.name })}
            >
              {confirm?.action === 'reject' ? 'Reject' : 'Disable'}
            </button>
          </div>
        </div>
      </Modal>

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(u) => {
          refresh();
          toast(`${u.name} added as ${u.role}.`, 'success');
          setCreating(false);
        }}
      />
    </div>
  );
}

function ApproveModal({ user, onClose, onApprove, busy }) {
  const [surgeonId, setSurgeonId] = useState(null);
  const open = Boolean(user);
  return (
    <Modal open={open} onClose={onClose} title="Approve surgeon account" size="md">
      {open && (
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onApprove(surgeonId);
          }}
        >
          <div className="rounded-xl bg-surface-2 p-4 text-sm">
            <p className="font-bold text-ink">{user.name}</p>
            <p className="text-ink-2">{user.email}</p>
            {user.hospital && <p className="mt-1 text-xs text-muted">Hospital given: {user.hospital}</p>}
          </div>
          <p className="text-sm text-ink-2">
            Pick the surgeon profile whose surgery records belong to this person. They will only ever see that profile's data.
          </p>
          <SurgeonPicker key={user.id} value={surgeonId} onChange={setSurgeonId} initialSearch={user.name} />
          <div className="flex gap-2">
            <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={!surgeonId || busy}>
              <Check size={16} aria-hidden /> Approve & link
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const EMPTY = { name: '', email: '', password: '', role: 'surgeon', surgeonId: null };

function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const create = useMutation({
    mutationFn: () => api.post('/admin/users', form).then((r) => r.data.user),
    onSuccess: (u) => {
      setForm(EMPTY);
      setErrors({});
      setMessage('');
      onCreated(u);
    },
    onError: (err) => {
      setErrors(err.response?.data?.errors || {});
      setMessage(errorMessage(err));
    },
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const field = (k, label, props = {}) => (
    <div>
      <label htmlFor={`new-${k}`} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={`new-${k}`}
        className={`${control} mt-1.5 ${errors[k] ? 'border-critical' : ''}`}
        value={form[k]}
        onChange={set(k)}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `new-${k}-err` : undefined}
        {...props}
      />
      {errors[k] && (
        <span id={`new-${k}-err`} className="mt-1 block text-xs font-medium text-critical">
          {errors[k]}
        </span>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add user" size="md">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Role</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { v: 'surgeon', label: 'Surgeon', icon: Stethoscope, hint: 'Sees only their own cases' },
              { v: 'admin', label: 'Admin', icon: ShieldCheck, hint: 'Full dashboard access' },
            ].map((r) => (
              <label
                key={r.v}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${form.role === r.v ? 'border-brand bg-brand-wash' : 'border-line'}`}
              >
                <input type="radio" name="role" value={r.v} checked={form.role === r.v} onChange={set('role')} className="mt-1 accent-[var(--brand)]" />
                <span>
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <r.icon size={14} aria-hidden /> {r.label}
                  </span>
                  <span className="text-xs text-muted">{r.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {field('name', 'Full name', { required: true })}
        {field('email', 'Email', { type: 'email', required: true })}
        {field('password', 'Temporary password', { type: 'password', autoComplete: 'new-password', required: true })}
        {form.role === 'surgeon' && (
          <SurgeonPicker value={form.surgeonId} onChange={(id) => setForm({ ...form, surgeonId: id })} initialSearch={form.name} error={errors.surgeonId} />
        )}
        {message && !Object.keys(errors).length && (
          <p className="text-sm text-critical" role="alert">
            ⚠ {message}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={create.isPending || (form.role === 'surgeon' && !form.surgeonId)}>
            <UserPlus size={16} aria-hidden /> Create user
          </button>
        </div>
      </form>
    </Modal>
  );
}
