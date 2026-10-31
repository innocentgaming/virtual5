import React, { Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useLocation } from './router';
import { Redirect } from './routerComponents';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyWithPreload } from './utils/lazyWithPreload';
import './index.css';

const LandingPage = lazyWithPreload(() => import('./pages/LandingPage').then((m) => ({ default: m.default ?? m.LandingPage })));
const Workspace = lazyWithPreload(() => import('./Workspace').then((m) => ({ default: m.Workspace })));
const AuthPages = {
  login: lazyWithPreload(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage }))),
  signup: lazyWithPreload(() => import('./pages/AuthPages').then((m) => ({ default: m.SignupPage }))),
  forgot: lazyWithPreload(() => import('./pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage }))),
  reset: lazyWithPreload(() => import('./pages/AuthPages').then((m) => ({ default: m.ResetPasswordPage }))),
};
const RsvpPage = lazyWithPreload(() => import('./pages/RsvpPage').then((m) => ({ default: m.RsvpPage })));
const AdminPage = lazyWithPreload(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const Privacy = lazyWithPreload(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const Terms = lazyWithPreload(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const NotFound = lazyWithPreload(() => import('./pages/LegalPages').then((m) => ({ default: m.NotFoundPage })));

function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );
}

function Routes(): React.ReactElement {
  const { pathname, search } = useLocation();
  const { status, user } = useAuth();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  const rsvpMatch = /^\/rsvp\/([A-Za-z0-9_-]{1,64})$/.exec(path);
  if (rsvpMatch) return <RsvpPage token={rsvpMatch[1]} />;

  switch (path) {
    case '/':
      return <LandingPage />;
    case '/demo':
      return <Workspace mode="demo" />;
    case '/app':
      if (status === 'loading') return <Loading />;
      if (status === 'anonymous') return <Redirect to={`/login?next=${encodeURIComponent('/app')}`} />;
      // key: a different signed-in user must never reuse the previous user's in-memory plans
      return <Workspace key={user?.id ?? 'account'} mode="account" />;
    case '/admin':
      if (status === 'loading') return <Loading />;
      if (status === 'anonymous') return <Redirect to={`/login?next=${encodeURIComponent('/admin')}`} />;
      return <AdminPage />;
    case '/login':
    case '/signup':
    case '/forgot-password': {
      if (status === 'authenticated') {
        const next = search.get('next');
        return <Redirect to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'} />;
      }
      const Page = path === '/login' ? AuthPages.login : path === '/signup' ? AuthPages.signup : AuthPages.forgot;
      return <Page />;
    }
    case '/reset-password':
      return <AuthPages.reset />;
    case '/privacy':
      return <Privacy />;
    case '/terms':
      return <Terms />;
    default:
      return <NotFound />;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
