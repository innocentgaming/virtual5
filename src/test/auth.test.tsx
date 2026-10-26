import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('User Authentication & Authorization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders default authenticated planner profile pill in the header', async () => {
    render(<App />);

    // Default persona should be Vikram Malhotra (Lead Event Planner)
    const userPill = await screen.findByRole('button', { name: /User Profile: Vikram Malhotra/i });
    expect(userPill).toBeInTheDocument();
    expect(userPill).toHaveTextContent('Vikram');
    expect(userPill).toHaveTextContent('Pro Planner');
    expect(userPill).toHaveTextContent('VM');
  });

  it('opens User Profile modal and allows switching between demo personas', async () => {
    render(<App />);

    const userPill = await screen.findByRole('button', { name: /User Profile: Vikram Malhotra/i });
    fireEvent.click(userPill);

    // Modal dialog should be open
    const modalDialog = await screen.findByRole('dialog', { name: /Vikram Malhotra/i });
    expect(modalDialog).toBeInTheDocument();
    expect(screen.getByText(/Lead Event Planner/i)).toBeInTheDocument();

    // Switch persona to Ananya (Host / Bride)
    const ananyaBtn = screen.getByRole('button', { name: /♥ Ananya \(Host\)/i });
    fireEvent.click(ananyaBtn);

    // Header should update to Ananya
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Profile: Ananya Sharma/i })).toBeInTheDocument();
    });
  });

  it('handles sign out flow: reverts to unauthenticated and exposes Sign In button', async () => {
    render(<App />);

    // Open profile modal
    const userPill = await screen.findByRole('button', { name: /User Profile: Vikram Malhotra/i });
    fireEvent.click(userPill);

    // Click Sign Out
    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);

    // Header should now display Sign In button
    const signInBtn = await screen.findByRole('button', { name: /Sign In/i });
    expect(signInBtn).toBeInTheDocument();
  });

  it('opens Auth Modal from Sign In button and allows 1-click demo login', async () => {
    render(<App />);

    // Sign out first
    const userPill = await screen.findByRole('button', { name: /User Profile: Vikram Malhotra/i });
    fireEvent.click(userPill);
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));

    // Click Sign In
    const signInBtn = await screen.findByRole('button', { name: /Sign In/i });
    fireEvent.click(signInBtn);

    // Auth modal should open
    const authModal = await screen.findByRole('dialog', { name: /Sign In to EventWise AI/i });
    expect(authModal).toBeInTheDocument();

    // Click 1-click Demo Account: Vikram Malhotra
    const demoPlannerBtn = screen.getByRole('button', { name: /Vikram Malhotra ★ Lead Pro Planner/i });
    fireEvent.click(demoPlannerBtn);

    // Should log in and display Vikram's profile pill again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Profile: Vikram Malhotra/i })).toBeInTheDocument();
    });
  });

  it('supports account creation / registration tab in Auth Modal', async () => {
    render(<App />);

    // Sign out first
    const userPill = await screen.findByRole('button', { name: /User Profile: Vikram Malhotra/i });
    fireEvent.click(userPill);
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));

    // Click Sign In
    const signInBtn = await screen.findByRole('button', { name: /Sign In/i });
    fireEvent.click(signInBtn);

    // Auth modal should open
    const authModal = await screen.findByRole('dialog', { name: /Sign In to EventWise AI/i });
    expect(authModal).toBeInTheDocument();

    // Switch to Create Account tab
    const createTab = await screen.findByRole('tab', { name: /Create Account/i });
    fireEvent.click(createTab);

    // Fill in registration fields
    const nameInput = screen.getByLabelText(/Full Name \*/i);
    const emailInput = screen.getByLabelText(/Email Address \*/i);
    const passwordInput = screen.getByLabelText(/Password \*/i);

    fireEvent.change(nameInput, { target: { value: 'Pooja Agarwal' } });
    fireEvent.change(emailInput, { target: { value: 'pooja@udaipurweddings.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    // Click Create Free Account
    const submitBtn = screen.getByRole('button', { name: /Create Free Account/i });
    fireEvent.click(submitBtn);

    // Should be authenticated as Pooja Agarwal
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Profile: Pooja Agarwal/i })).toBeInTheDocument();
    });
  });
});
