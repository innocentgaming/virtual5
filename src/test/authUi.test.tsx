import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { safeNextPath } from '../router';
import { preloadAllTabs } from '../utils/lazyWithPreload';
import type { AuthUser } from '../types/auth';
import { generateFallbackPlan } from '../services/fallbackPlanner';

const mockUser: AuthUser = {
  id: 'user_123',
  name: 'Devika Patel',
  email: 'devika@example.com',
  role: 'planner',
  roleLabel: 'Event Planner',
  initials: 'DP',
  permissions: ['manage_events'],
  createdAt: new Date().toISOString(),
};

describe('Frontend Routing, Auth UI, and Safe Paths', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
    await preloadAllTabs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('safely normalizes next paths and rejects open redirect exploits', () => {
    expect(safeNextPath('/app')).toBe('/app');
    expect(safeNextPath('/demo')).toBe('/demo');
    expect(safeNextPath('/privacy')).toBe('/privacy');
    expect(safeNextPath('/terms')).toBe('/terms');

    // Open redirects and external protocol attempts
    expect(safeNextPath('https://evil.com')).toBe('/app');
    expect(safeNextPath('http://malicious.org')).toBe('/app');
    expect(safeNextPath('//evil.com')).toBe('/app');
    expect(safeNextPath('/\\evil.com')).toBe('/app');
    expect(safeNextPath('javascript:alert(1)')).toBe('/app');

    // Circular auth paths fallback to default
    expect(safeNextPath('/login')).toBe('/app');
    expect(safeNextPath('/signup')).toBe('/app');
    expect(safeNextPath(null)).toBe('/app');
    expect(safeNextPath('')).toBe('/app');
  });

  it('renders public landing page at "/" with key showcase elements', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /Plan the whole celebration, down to the muhurat/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Explore the demo/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Destination wedding/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions people ask first/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users visiting /app to /login?next=/app', async () => {
    window.history.pushState({}, '', '/app');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toContain('next=%2Fapp');
    });

    expect(screen.getByRole('heading', { level: 1, name: /Sign in/i })).toBeInTheDocument();
  });

  it('renders demo mode with banner and sample events', async () => {
    window.history.pushState({}, '', '/demo');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByText(/You are exploring a demo with sample events/i)).toBeInTheDocument();
    expect(screen.getByText(/Create an account to save/i)).toBeInTheDocument();
    expect(screen.getByText(/Personalized Event Planning & Decision Engine/i)).toBeInTheDocument();
  });

  it('renders 404 page for unknown routes', async () => {
    window.history.pushState({}, '', '/unknown-route-12345');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /404 — Page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/Return home/i)).toBeInTheDocument();
  });

  it('shows login error alert on invalid credentials', async () => {
    window.history.pushState({}, '', '/login');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      if (url.includes('/api/auth/login')) {
        return new Response(JSON.stringify({ ok: false, error: 'Incorrect email or password.' }), { status: 401 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /Sign in/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword123!' } });
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Incorrect email or password/i);
  });

  it('shows signup error alert when server rejects registration', async () => {
    window.history.pushState({}, '', '/signup');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      if (url.includes('/api/auth/signup')) {
        return new Response(JSON.stringify({ ok: false, error: 'An account with this email already exists.' }), { status: 409 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /Create your account/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Full name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const termsCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Create account/i });

    fireEvent.change(nameInput, { target: { value: 'Ananya Sharma' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/An account with this email already exists/i);
  });

  async function signInWithEventsDoc(eventsDoc: { events: unknown[]; activeId: string | null; updatedAt: number }) {
    window.history.pushState({}, '', '/login');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      if (url.includes('/api/auth/login')) {
        return new Response(JSON.stringify({ ok: true, user: mockUser }), { status: 200 });
      }
      if (url.includes('/api/events')) {
        return new Response(JSON.stringify(eventsDoc), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /Sign in/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'devika@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'CorrectPassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/app');
    });
  }

  it('shows a brand-new account an empty "create your first plan" screen, never sample or device data', async () => {
    // Simulate leftovers from a previous visitor / the demo on this same browser.
    localStorage.setItem('eventwise_ai_events_v2', JSON.stringify([{ id: 'someone-else', title: 'Previous Visitor Wedding' }]));

    await signInWithEventsDoc({ events: [], activeId: null, updatedAt: 0 });

    expect(await screen.findByRole('heading', { level: 1, name: /Welcome, Devika!/i })).toBeInTheDocument();
    // The planner workspace (header with the account avatar, dashboard of a sample plan) is not rendered yet.
    expect(screen.queryByText('DP')).not.toBeInTheDocument();
    expect(screen.queryByText(/Previous Visitor Wedding/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mobile Bottom Overview/i })).not.toBeInTheDocument();
  });

  it('loads the signed-in account\'s own saved plans into the workspace', async () => {
    const plan = generateFallbackPlan({
      title: 'Devika & Rahul Pune Wedding',
      eventType: 'wedding',
      eventDate: '2027-03-01',
      city: 'Pune, Maharashtra',
      guestCount: 120,
      totalBudget: 900000,
    });

    await signInWithEventsDoc({ events: [plan], activeId: plan.id, updatedAt: 1700000000000 });

    expect(await screen.findByText('DP')).toBeInTheDocument();
    expect(screen.queryByText(/Aarav & Ananya/i)).not.toBeInTheDocument();
  });
});
