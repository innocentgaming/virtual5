import React, { useState } from 'react';
import { navigate, safeNextPath, useLocation, usePageTitle } from '../router';
import { Link } from '../routerComponents';
import { useAuth } from '../hooks/useAuth';
import { PasswordField } from '../components/auth/PasswordField';
import type { UserRole } from '../types/auth';
import { Brand } from './SiteChrome';
import '../site.css';

const SIDE_COPY = {
  login: { h: 'Pick up where you left off.', p: 'Your budgets, guest lists and schedules are saved to your account and open on any device.' },
  signup: { h: 'Your whole celebration in one place.', p: 'Create an account to save plans, sync across devices and come back to them whenever you need.' },
  recover: { h: 'It happens to everyone.', p: 'Reset links work once and expire after 30 minutes, so an old email cannot be used to get into your account.' },
};

const AuthLayout: React.FC<{ side: keyof typeof SIDE_COPY; children: React.ReactNode }> = ({ side, children }) => (
  <div className="site">
    <div className="s-auth">
      <div className="s-auth__main">
        <Brand />
        <main className="s-auth__form-wrap">{children}</main>
      </div>
      <aside className="s-auth__side" aria-hidden="true">
        <div className="s-auth__pattern" />
        <h2>{SIDE_COPY[side].h}</h2>
        <p>{SIDE_COPY[side].p}</p>
      </aside>
    </div>
  </div>
);

const Spinner = () => <span className="s-spinner" aria-hidden="true" />;

const ErrorBox: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="s-alert s-alert--error">
      {message}
    </div>
  ) : null;

// ---------------------------------------------------------------------------

export function LoginPage(): React.ReactElement {
  usePageTitle('Sign in | EventWise AI', { noindex: true });
  const { login } = useAuth();
  const { search } = useLocation();
  const next = safeNextPath(search.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(email, password, remember);
    setBusy(false);
    if (res.ok) navigate(next, { replace: true });
    else setError(res.error || 'Failed to sign in.');
  };

  return (
    <AuthLayout side="login">
      <h1>Sign in</h1>
      <p className="s-auth__sub">Welcome back. Enter your details to open your plans.</p>
      <form className="s-form" onSubmit={submit} noValidate={false}>
        <ErrorBox message={error} />
        <div className="s-field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <PasswordFieldS id="login-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="s-form__row">
          <label className="s-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Keep me signed in for 30 days</span>
          </label>
          <Link to="/forgot-password" className="s-link">Forgot password?</Link>
        </div>
        <button type="submit" className="s-btn s-btn--ink s-btn--block" disabled={busy}>
          {busy ? <><Spinner /> Signing in</> : 'Sign in'}
        </button>
      </form>
      <p className="s-auth__switch">
        New here? <Link to={`/signup${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="s-link">Create a free account</Link>
      </p>
      <p className="s-auth__demo">
        Just looking around? <Link to="/demo" className="s-link">Explore the demo</Link> without an account.
      </p>
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------

export function SignupPage(): React.ReactElement {
  usePageTitle('Create your account | EventWise AI', { noindex: true });
  const { signup } = useAuth();
  const { search } = useLocation();
  const next = safeNextPath(search.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('host');
  const [org, setOrg] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signup({ name, email, password, role, organization: org, acceptTerms: accepted });
    setBusy(false);
    if (res.ok) navigate(next, { replace: true });
    else setError(res.error || 'Failed to create account.');
  };

  return (
    <AuthLayout side="signup">
      <h1>Create your account</h1>
      <p className="s-auth__sub">Free to use. Takes under a minute.</p>
      <form className="s-form" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="s-field">
          <label htmlFor="su-name">Full name</label>
          <input id="su-name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="s-field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="s-field">
          <label htmlFor="su-role">I am planning as</label>
          <select id="su-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="host">A host or couple</option>
            <option value="planner">An event planner</option>
            <option value="vendor">A vendor partner</option>
          </select>
        </div>
        <div className="s-field">
          <label htmlFor="su-org">Company or family name (optional)</label>
          <input id="su-org" autoComplete="organization" maxLength={120} value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <PasswordFieldS id="su-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" showStrength />
        <label className="s-check">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
          <span>
            I agree to the <Link to="/terms" className="s-link" target="_blank" rel="noopener noreferrer">Terms</Link> and <Link to="/privacy" className="s-link" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
          </span>
        </label>
        <button type="submit" className="s-btn s-btn--ink s-btn--block" disabled={busy}>
          {busy ? <><Spinner /> Creating account</> : 'Create account'}
        </button>
      </form>
      <p className="s-auth__switch">
        Already have an account? <Link to={`/login${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="s-link">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------

export function ForgotPasswordPage(): React.ReactElement {
  usePageTitle('Reset your password | EventWise AI', { noindex: true });
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ devResetLink?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await forgotPassword(email);
    setBusy(false);
    if (res.ok) setSent({ devResetLink: res.devResetLink });
    else setError(res.error || 'Failed to send reset link.');
  };

  return (
    <AuthLayout side="recover">
      <h1>Reset your password</h1>
      {sent ? (
        <>
          <div role="status" className="s-alert s-alert--ok" style={{ marginTop: '1.5rem' }}>
            If an account exists for {email}, a reset link is on its way. It works once and expires in 30 minutes.
          </div>
          {sent.devResetLink && (
            <div className="s-alert s-alert--info" style={{ marginTop: '1rem' }}>
              Development mode (no email provider configured): <a href={sent.devResetLink} className="s-link">{sent.devResetLink}</a>
            </div>
          )}
          <p className="s-auth__switch"><Link to="/login" className="s-link">Back to sign in</Link></p>
        </>
      ) : (
        <>
          <p className="s-auth__sub">Enter the email you signed up with and we will send you a link.</p>
          <form className="s-form" onSubmit={submit}>
            <ErrorBox message={error} />
            <div className="s-field">
              <label htmlFor="fp-email">Email</label>
              <input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <button type="submit" className="s-btn s-btn--ink s-btn--block" disabled={busy}>
              {busy ? <><Spinner /> Sending</> : 'Send reset link'}
            </button>
          </form>
          <p className="s-auth__switch"><Link to="/login" className="s-link">Back to sign in</Link></p>
        </>
      )}
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------

export function ResetPasswordPage(): React.ReactElement {
  usePageTitle('Choose a new password | EventWise AI', { noindex: true });
  const { resetPassword } = useAuth();
  const { search } = useLocation();
  const token = search.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await resetPassword(token, password);
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error || 'Failed to reset password.');
  };

  return (
    <AuthLayout side="recover">
      <h1>Choose a new password</h1>
      {!token ? (
        <>
          <div role="alert" className="s-alert s-alert--error" style={{ marginTop: '1.5rem' }}>
            This reset link is incomplete. Request a new one.
          </div>
          <p className="s-auth__switch"><Link to="/forgot-password" className="s-link">Send a new link</Link></p>
        </>
      ) : done ? (
        <>
          <div role="status" className="s-alert s-alert--ok" style={{ marginTop: '1.5rem' }}>
            Your password was changed. All other devices have been signed out.
          </div>
          <p style={{ marginTop: '1.5rem' }}><Link to="/login" className="s-btn s-btn--ink s-btn--block">Sign in</Link></p>
        </>
      ) : (
        <form className="s-form" onSubmit={submit}>
          <ErrorBox message={error} />
          <PasswordFieldS id="rp-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" showStrength />
          <button type="submit" className="s-btn s-btn--ink s-btn--block" disabled={busy}>
            {busy ? <><Spinner /> Saving</> : 'Save new password'}
          </button>
          {error && <p><Link to="/forgot-password" className="s-link">Send a new link</Link></p>}
        </form>
      )}
    </AuthLayout>
  );
}

/** PasswordField wrapped in the public-site field styling. */
const PasswordFieldS: React.FC<React.ComponentProps<typeof PasswordField>> = (props) => (
  <div className="s-field s-field--password">
    <PasswordField {...props} className="s-pw" />
  </div>
);
