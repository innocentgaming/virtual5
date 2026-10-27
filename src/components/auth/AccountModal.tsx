import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { navigate } from '../../router';
import { LogOut, ShieldCheck, KeyRound, Trash2, UserRound, RotateCcw } from 'lucide-react';
import type { EventPlan } from '../../types/event';
import type { UserRole } from '../../types/auth';
import { PasswordField } from './PasswordField';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: EventPlan | null;
  onFeedback?: (msg: string) => void;
  onClearAllEvents?: () => Promise<void> | void;
}

type Tab = 'profile' | 'security';

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onFeedback, onClearAllEvents }) => {
  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name ?? '');
  const [org, setOrg] = useState(user?.organization ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'host');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      onFeedback?.(success);
      after?.();
    } else {
      setError(res.error ?? 'Something went wrong.');
    }
  };

  const signOut = async (everywhere: boolean) => {
    await logout(everywhere);
    navigate('/', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user.name}
      subtitle={user.email}
      size="md"
      ariaLabel={`Account settings for ${user.name}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <Badge variant="wedding">
          <ShieldCheck size={12} style={{ marginRight: 4 }} />
          {user.roleLabel}
        </Badge>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div role="tablist" aria-label="Account sections" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
        {(['profile', 'security'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: tab === t ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            {t === 'profile' ? 'Profile' : 'Password and sessions'}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {tab === 'profile' ? (
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateProfile({ name, organization: org, role }), 'Profile updated.');
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="acct-name" className="form-label">Full name</label>
            <input id="acct-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="acct-role" className="form-label">I am a</label>
              <select id="acct-role" className="form-control" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="planner">Event planner</option>
                <option value="host">Host or couple</option>
                <option value="vendor">Vendor partner</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="acct-org" className="form-label">Company or family name</label>
              <input id="acct-org" className="form-control" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={120} autoComplete="organization" />
            </div>
          </div>
          <Button type="submit" variant="primary" isLoading={busy} leftIcon={<UserRound size={15} />}>
            Save profile
          </Button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => changePassword(current, next), 'Password changed. Other devices were signed out.', () => {
                setCurrent('');
                setNext('');
              });
            }}
          >
            <PasswordField id="acct-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordField id="acct-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" showStrength />
            <Button type="submit" variant="primary" isLoading={busy} disabled={!current || next.length < 8} leftIcon={<KeyRound size={15} />}>
              Change password
            </Button>
          </form>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => void signOut(false)} leftIcon={<LogOut size={15} />}>
              Sign out
            </Button>
            <Button variant="secondary" onClick={() => void signOut(true)}>
              Sign out on all devices
            </Button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Reset Database (Start Clean)</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 var(--space-3)' }}>
              Clear all celebration plans and sample data from your account database so you can start completely fresh.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear all celebration plans and start with a fresh clean database?')) {
                  await onClearAllEvents?.();
                  onFeedback?.('All celebration plans cleared. You now have a fresh clean database.');
                  onClose();
                }
              }}
              leftIcon={<RotateCcw size={14} />}
            >
              Reset to Clean Database
            </Button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
            <strong style={{ fontSize: 'var(--text-sm)' }}>Delete account</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 var(--space-3)' }}>
              This permanently removes your account and every event plan saved to it. It cannot be undone.
            </p>
            {confirmingDelete ? (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => deleteAccount(deletePw), 'Your account was deleted.', () => navigate('/', { replace: true }));
                }}
              >
                <PasswordField id="acct-delete" label="Enter your password to confirm" value={deletePw} onChange={setDeletePw} autoComplete="current-password" />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button type="submit" variant="danger" isLoading={busy} disabled={!deletePw} leftIcon={<Trash2 size={15} />}>
                    Delete my account
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)} leftIcon={<Trash2 size={15} />}>
                Delete account…
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
