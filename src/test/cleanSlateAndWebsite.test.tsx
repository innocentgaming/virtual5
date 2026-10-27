import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { preloadAllTabs } from '../utils/lazyWithPreload';
import type { AuthUser } from '../types/auth';

const mockFreshUser: AuthUser = {
  id: 'fresh_user_456',
  name: 'Aarohi Mehta',
  email: 'aarohi@example.com',
  role: 'host',
  roleLabel: 'Host or Couple',
  organization: 'Mehta Celebrations',
  initials: 'AM',
  permissions: ['manage_events'],
  createdAt: new Date().toISOString(),
};

describe('Clean Slate for Logged-In Users & Event Website Builder', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
    await preloadAllTabs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a fresh clean slate onboarding hub for a newly logged-in user without demo data leakage', async () => {
    window.history.pushState({}, '', '/login');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      if (url.includes('/api/auth/login')) {
        return new Response(JSON.stringify({ ok: true, user: mockFreshUser }), { status: 200 });
      }
      if (url.includes('/api/events')) {
        // Return 0 events for a brand new user
        return new Response(JSON.stringify({ events: [], activeId: null, updatedAt: 0 }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    // Log in
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'aarohi@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/app');
    });

    // 1. Verify user's greeting appears on the clean slate screen
    expect(await screen.findByRole('heading', { level: 1, name: /Welcome, Aarohi!/i })).toBeInTheDocument();
    expect(screen.getByText(/Your account starts empty. Tell us about your event and we’ll build a personalised plan/i)).toBeInTheDocument();

    // 2. Verify that workspace dashboard and user avatar are NOT shown yet
    expect(screen.queryByRole('button', { name: /Mobile Bottom Overview/i })).not.toBeInTheDocument();
    expect(screen.queryByText('AM')).not.toBeInTheDocument(); // Full planner header with avatar is not shown until first plan is made

    // 3. Verify event setup form is ready for creating their first celebration
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument();
  });

  it('allows opening the Event Website modal and exploring website previews', async () => {
    window.history.pushState({}, '', '/demo');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<App />);

    // In demo mode, click "Event Website" in the header
    const websiteBtn = await screen.findByRole('button', { name: /Event Website Builder/i });
    expect(websiteBtn).toBeInTheDocument();
    fireEvent.click(websiteBtn);

    // Verify modal elements render
    expect(await screen.findByRole('heading', { level: 2, name: /Event Website & Invitation Builder/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Live Preview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Design & Themes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Publish & Share/i })).toBeInTheDocument();
  });
});
