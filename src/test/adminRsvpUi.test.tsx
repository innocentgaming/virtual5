import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { preloadAllTabs } from '../utils/lazyWithPreload';
import type { AuthUser } from '../types/auth';

const baseUser: AuthUser = {
  id: 'u1', name: 'Kiran Nandi', email: 'kiran@example.com', role: 'planner', roleLabel: 'Lead Event Planner',
  initials: 'KN', permissions: [], createdAt: new Date().toISOString(),
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockApi(user: AuthUser | null, extra: (url: string, init?: RequestInit) => Response | undefined = () => undefined) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const custom = extra(url, init);
    if (custom) return custom;
    if (url.includes('/api/auth/me')) return json({ user, storage: 'redis' });
    if (url.includes('/api/admin/stats')) {
      return json({
        storage: 'redis', generatedAt: new Date().toISOString(),
        totals: { users: 12, admins: 1, disabled: 0, events: 30, usersWithEvents: 9, new7: 3, new30: 8, active30: 7, failedLogins24h: 2 },
        byRole: { host: 7, planner: 3, vendor: 2 },
        signupsByDay: Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, count: i % 4 })),
        truncated: false,
      });
    }
    if (url.includes('/api/admin/users')) {
      return json({
        users: [
          { id: 'u1', name: 'Kiran Nandi', email: 'kiran@example.com', role: 'planner', organization: null, isAdmin: true, disabled: false, createdAt: new Date().toISOString(), lastLoginAt: null, eventCount: 2 },
          { id: 'u2', name: 'Asha Rao', email: 'asha@example.com', role: 'host', organization: null, isAdmin: false, disabled: false, createdAt: new Date().toISOString(), lastLoginAt: null, eventCount: 1 },
        ],
        total: 2, page: 1, pageSize: 20,
      });
    }
    return json({});
  });
}

describe('Admin dashboard UI', () => {
  beforeEach(async () => {
    window.history.pushState({}, '', '/admin');
    await preloadAllTabs();
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends anonymous visitors to sign in', async () => {
    mockApi(null);
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.location.search).toContain('next=%2Fadmin');
  });

  it('shows an access-denied screen to non-admin users and never calls the admin API', async () => {
    const spy = mockApi(baseUser);
    render(<App />);
    expect(await screen.findByRole('heading', { name: /administrators only/i })).toBeInTheDocument();
    expect(spy.mock.calls.some(([u]) => String(u).includes('/api/admin/'))).toBe(false);
  });

  it('shows overview numbers, users and management actions to an admin, and has no a11y violations', async () => {
    mockApi({ ...baseUser, isAdmin: true });
    const { container } = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    expect(await screen.findByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /daily sign-ups/i })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole('tab', { name: /users/i }));
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    // You cannot act on yourself; others get the full set of actions.
    expect(screen.getByText('This is you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make admin' })).toBeInTheDocument();
  });

  it('asks to type the email before deleting a user', async () => {
    const spy = mockApi({ ...baseUser, isAdmin: true });
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: /users/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('button', { name: /delete permanently/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/email to confirm/i), { target: { value: 'asha@example.com' } });
    expect(confirm).toBeEnabled();
    expect(spy.mock.calls.some(([u]) => String(u).includes('user-delete'))).toBe(false);
  });
});

describe('Public RSVP page', () => {
  const TOKEN = 'abcdefghijklmnopqrstuvwx';
  beforeEach(async () => {
    window.history.pushState({}, '', `/rsvp/${TOKEN}`);
    await preloadAllTabs();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the invitation, submits a real request and confirms', async () => {
    let submitted: Record<string, unknown> | null = null;
    mockApi(null, (url, init) => {
      if (url.includes('/api/rsvp/info')) return json({ title: 'Asha weds Ravi', date: '2027-02-14', venue: 'Jaipur', hosts: null, closed: false });
      if (url.includes('/api/rsvp/submit')) {
        submitted = JSON.parse(String(init?.body));
        return json({ ok: true }, 201);
      }
      return undefined;
    });
    const { container } = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Asha weds Ravi' })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);

    fireEvent.change(screen.getByLabelText(/your full name/i), { target: { value: 'Meera Shah' } });
    fireEvent.change(screen.getByLabelText(/extra people/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /send my reply/i }));

    expect(await screen.findByText(/see you there/i)).toBeInTheDocument();
    expect(submitted).toMatchObject({ token: TOKEN, name: 'Meera Shah', attending: true, guests: 2, website: '' });
  });

  it('shows server validation errors and a friendly message for invalid links', async () => {
    mockApi(null, (url) => (url.includes('/api/rsvp/info') ? json({ error: 'This RSVP link is not valid.' }, 404) : undefined));
    render(<App />);
    expect(await screen.findByRole('heading', { name: /invitation not found/i })).toBeInTheDocument();
  });

  it('says so when RSVPs are closed instead of showing the form', async () => {
    mockApi(null, (url) => (url.includes('/api/rsvp/info') ? json({ title: 'Closed Party', date: null, venue: null, hosts: null, closed: true }) : undefined));
    render(<App />);
    expect(await screen.findByText(/now closed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send my reply/i })).toBeNull();
  });
});

describe('ErrorBoundary', () => {
  it('replaces a crashed screen with a recovery page and reports the error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: true }, 202));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error('kaboom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(await screen.findByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('/api/client-error'))).toBe(true));
    consoleSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});