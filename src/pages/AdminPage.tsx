import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, LogOut, RefreshCw, Search, ShieldCheck, Users, Activity, DatabaseBackup, LayoutDashboard } from 'lucide-react';
import { usePageTitle } from '../router';
import { Link } from '../routerComponents';
import { Button, Logo, Modal } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { adminApi, type AdminStats, type AdminUserRow, type AuditRow } from '../services/adminApi';
import type { UserRole } from '../types/auth';
import '../admin.css';

type Tab = 'overview' | 'users' | 'activity' | 'data';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
  { id: 'users', label: 'Users', icon: <Users size={15} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
  { id: 'data', label: 'Data & backup', icon: <DatabaseBackup size={15} /> },
];

const ACTIVITY_LABELS: Record<string, string> = {
  signup: 'Signed up',
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  login_blocked: 'Blocked sign-in (disabled)',
  password_changed: 'Changed password',
  password_reset: 'Reset password',
  account_deleted: 'Deleted account',
  rsvp_link_created: 'Created RSVP link',
  admin_user_updated: 'Admin changed a user',
  admin_sessions_revoked: 'Admin signed a user out',
  admin_user_deleted: 'Admin deleted a user',
  admin_backup_downloaded: 'Backup downloaded',
};

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

export function AdminPage(): React.ReactElement {
  usePageTitle('Admin | EventWise AI', { noindex: true });
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  if (!user?.isAdmin) {
    return (
      <main className="adm adm--denied" id="main">
        <div className="adm-denied" role="alert">
          <ShieldCheck size={36} aria-hidden="true" />
          <h1>Administrators only</h1>
          <p>Your account does not have access to this area.</p>
          <Link to="/app" className="btn btn-primary">Back to my events</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top__brand">
          <Logo size="sm" />
          <span className="adm-top__badge">Admin</span>
        </div>
        <div className="adm-top__right">
          <Link to="/app" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back to app</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main id="main" className="adm-main">
        <h1 className="adm-title">Administration</h1>
        <div role="tablist" aria-label="Admin sections" className="adm-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`adm-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`adm-panel-${t.id}`} className={`adm-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <section role="tabpanel" id={`adm-panel-${tab}`} aria-labelledby={`adm-tab-${tab}`}>
          {tab === 'overview' && <Overview />}
          {tab === 'users' && <UsersTab selfId={user.id} />}
          {tab === 'activity' && <ActivityTab />}
          {tab === 'data' && <DataTab />}
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function useLoad<T>(fn: () => Promise<{ ok: true } & T | { ok: false; error: string }>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fn();
    if (res.ok) {
      setData(res as unknown as T);
      setError(null);
    } else setError(res.error);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, reload: load };
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="adm-error">
      <span>{message}</span>
      {onRetry && <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="adm-stat">
      <span className="adm-stat__value">{value}</span>
      <span className="adm-stat__label">{label}</span>
      {hint && <span className="adm-stat__hint">{hint}</span>}
    </div>
  );
}

function Overview() {
  const { data, error, loading, reload } = useLoad<AdminStats>(() => adminApi.stats(), []);
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return <p role="status" className="adm-muted">Loading overview…</p>;
  const t = data.totals;
  const max = Math.max(1, ...data.signupsByDay.map((d) => d.count));
  const roleTotal = Math.max(1, t.users);
  return (
    <div className="adm-stack" aria-busy={loading}>
      {data.storage === 'memory' && (
        <ErrorBanner message="Accounts are stored in temporary memory and will be lost on restart. Connect Upstash Redis (or set DATA_DIR) before real users sign up." />
      )}
      <div className="adm-stats">
        <Stat label="Total users" value={t.users} hint={`${t.new7} new this week`} />
        <Stat label="Active (30 days)" value={t.active30} hint="signed in" />
        <Stat label="Event plans" value={t.events} hint={`${t.usersWithEvents} users have plans`} />
        <Stat label="Failed sign-ins (24h)" value={t.failedLogins24h} hint={t.failedLogins24h > 20 ? 'Unusually high' : 'Normal'} />
      </div>

      <div className="adm-card">
        <h2>New sign-ups, last 30 days</h2>
        <svg className="adm-chart" viewBox="0 0 300 80" role="img" aria-label={`Daily sign-ups for the last 30 days, ${t.new30} in total`} preserveAspectRatio="none">
          {data.signupsByDay.map((d, i) => {
            const h = (d.count / max) * 70;
            return (
              <rect key={d.date} x={i * 10 + 1} y={76 - h} width={8} height={Math.max(h, d.count ? 2 : 0.8)} rx={1.5} className={d.count ? 'adm-bar' : 'adm-bar adm-bar--empty'}>
                <title>{`${d.date}: ${d.count}`}</title>
              </rect>
            );
          })}
        </svg>
        <div className="adm-chart__axis"><span>{data.signupsByDay[0]?.date}</span><span>{data.signupsByDay.at(-1)?.date}</span></div>
      </div>

      <div className="adm-card">
        <h2>Who is using it</h2>
        <ul className="adm-bars">
          {(['host', 'planner', 'vendor'] as UserRole[]).map((r) => (
            <li key={r}>
              <span>{r === 'host' ? 'Hosts & couples' : r === 'planner' ? 'Event planners' : 'Vendors'}</span>
              <span className="adm-meter" aria-hidden="true"><i style={{ width: `${(data.byRole[r] / roleTotal) * 100}%` }} /></span>
              <strong>{data.byRole[r]}</strong>
            </li>
          ))}
        </ul>
        <p className="adm-muted">{t.admins} administrator{t.admins === 1 ? '' : 's'} · {t.disabled} disabled account{t.disabled === 1 ? '' : 's'}</p>
      </div>
    </div>
  );
}

function UsersTab({ selfId }: { selfId: string }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminApi.users({ q: query, page, filter }), [query, page, filter]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setQuery(q.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setActionError(null);
    const res = await fn();
    if (res.ok) {
      setNotice(done);
      await reload();
    } else setActionError(res.error ?? 'Action failed.');
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search users</span>
          <input type="search" placeholder="Search name, email or organisation" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} />
        </label>
        <label>
          <span className="sr-only">Filter users</span>
          <select className="form-control" value={filter} onChange={(e) => { setPage(1); setFilter(e.target.value); }}>
            <option value="">All users</option>
            <option value="admins">Administrators</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void reload()}><RefreshCw size={14} /> Refresh</button>
      </div>

      {notice && <p role="status" className="adm-notice">{notice}</p>}
      {actionError && <ErrorBanner message={actionError} />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="adm-tablewrap" aria-busy={loading}>
        <table className="adm-table">
          <caption className="sr-only">Registered users</caption>
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col">Plans</th>
              <th scope="col">Joined</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => {
              const self = u.id === selfId;
              return (
                <tr key={u.id} className={u.disabled ? 'is-disabled' : ''}>
                  <td data-label="User">
                    <strong>{u.name}</strong>
                    {u.isAdmin && <span className="adm-pill adm-pill--admin">Admin</span>}
                    {u.disabled && <span className="adm-pill adm-pill--off">Disabled</span>}
                    <div className="adm-muted">{u.email}</div>
                  </td>
                  <td data-label="Role">
                    <select aria-label={`Role for ${u.name}`} className="form-control adm-select" value={u.role} disabled={self}
                      onChange={(e) => void act(() => adminApi.updateUser(u.id, { role: e.target.value as UserRole }), `Updated ${u.name}.`)}>
                      <option value="host">Host</option>
                      <option value="planner">Planner</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </td>
                  <td data-label="Plans">{u.eventCount ?? 0}</td>
                  <td data-label="Joined">{fmtDate(u.createdAt)}</td>
                  <td data-label="Last sign-in">{fmtDate(u.lastLoginAt)}</td>
                  <td data-label="Actions">
                    {self ? <span className="adm-muted">This is you</span> : (
                      <div className="adm-rowactions">
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => void act(() => adminApi.updateUser(u.id, { isAdmin: !u.isAdmin }), u.isAdmin ? `${u.name} is no longer an admin.` : `${u.name} is now an admin.`)}>
                          {u.isAdmin ? 'Remove admin' : 'Make admin'}
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => void act(() => adminApi.updateUser(u.id, { disabled: !u.disabled }), u.disabled ? `${u.name} can sign in again.` : `${u.name} has been disabled and signed out.`)}>
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => void act(() => adminApi.revokeSessions(u.id), `${u.name} was signed out everywhere.`)}>
                          Sign out
                        </button>
                        <button type="button" className="btn btn-sm adm-danger" onClick={() => { setDeleting(u); setConfirmEmail(''); }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {data && data.users.length === 0 && (
              <tr><td colSpan={6} className="adm-empty">No users match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="adm-pager">
          <span className="adm-muted">{data.total} user{data.total === 1 ? '' : 's'}</span>
          <div>
            <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="adm-muted"> Page {page} of {pages} </span>
            <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}

      {deleting && (
        <Modal isOpen onClose={() => setDeleting(null)} title="Delete this user?" subtitle={deleting.email} size="sm" ariaLabel="Delete user confirmation">
          <p>This permanently deletes <strong>{deleting.name}</strong> and all of their event plans. It cannot be undone. Type their email to confirm.</p>
          <label htmlFor="adm-confirm" className="form-label">Email to confirm</label>
          <input id="adm-confirm" className="form-control" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off" />
          <div className="adm-modalactions">
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="primary" disabled={confirmEmail !== deleting.email} onClick={() => {
              const target = deleting;
              setDeleting(null);
              void act(() => adminApi.deleteUser(target.id, confirmEmail), `${target.name} was deleted.`);
            }}>Delete permanently</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActivityTab() {
  const [type, setType] = useState('');
  const { data, error, loading, reload } = useLoad<{ entries: AuditRow[] }>(() => adminApi.activity(type || undefined), [type]);
  const types = useMemo(() => Object.keys(ACTIVITY_LABELS), []);
  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <label>
          <span className="sr-only">Filter by activity type</span>
          <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All activity</option>
            {types.map((t) => <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void reload()}><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <div className="adm-tablewrap" aria-busy={loading}>
        <table className="adm-table">
          <caption className="sr-only">Recent activity</caption>
          <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Who</th><th scope="col">Details</th><th scope="col">IP</th></tr></thead>
          <tbody>
            {data?.entries.map((a) => (
              <tr key={a.id} className={a.type === 'login_failed' || a.type === 'login_blocked' ? 'is-warn' : ''}>
                <td data-label="When">{fmtDate(a.at)}</td>
                <td data-label="What">{ACTIVITY_LABELS[a.type] ?? a.type}</td>
                <td data-label="Who">{a.actorEmail ?? a.targetEmail ?? '—'}{a.actorEmail && a.targetEmail && a.targetEmail !== a.actorEmail ? <div className="adm-muted">→ {a.targetEmail}</div> : null}</td>
                <td data-label="Details">{a.detail ?? ''}</td>
                <td data-label="IP" className="adm-muted">{a.ip ?? ''}</td>
              </tr>
            ))}
            {data && data.entries.length === 0 && <tr><td colSpan={5} className="adm-empty">No activity recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="adm-muted">The most recent 1,000 events are kept.</p>
    </div>
  );
}

function DataTab() {
  const { data, error, reload } = useLoad<AdminStats>(() => adminApi.stats(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setErr(null);
    const res = await adminApi.downloadBackup();
    setBusy(false);
    if (res.ok) setMsg('Backup downloaded. Store it somewhere safe: it contains password hashes and personal data.');
    else setErr(res.error);
  };

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <h2>Storage</h2>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : (
          <p>
            Database: <strong>{data ? (data.storage === 'redis' ? 'Upstash Redis (persistent)' : data.storage === 'file' ? 'Disk file (persistent)' : 'Temporary memory (NOT persistent)') : '…'}</strong>
          </p>
        )}
        <p className="adm-muted">Live health check: <code>/api/health</code>. Point your uptime monitor at it.</p>
      </div>
      <div className="adm-card">
        <h2>Backup</h2>
        <p>Download everything: users, event plans, RSVP links and replies, and the activity log, as one JSON file. Do this regularly. To restore, run <code>npm run restore -- file.json</code> on the server.</p>
        {msg && <p role="status" className="adm-notice">{msg}</p>}
        {err && <ErrorBanner message={err} />}
        <Button variant="primary" onClick={download} isLoading={busy} leftIcon={<Download size={15} />}>Download backup</Button>
      </div>
    </div>
  );
}

export default AdminPage;