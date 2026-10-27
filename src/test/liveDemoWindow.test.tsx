import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveDemoWindow } from '../components/demo/LiveDemoWindow';
import { SAMPLE_WEDDING } from '../data/sampleEvents';
import { applyDemoScenario, snapshotPlan } from '../services/demoSimulator';

describe('demoSimulator', () => {
  const now = new Date('2026-10-27T10:00:00');

  it('caterer spike adds a positive overrun and raises projected spend', () => {
    const before = snapshotPlan(SAMPLE_WEDDING, now);
    const after = snapshotPlan(applyDemoScenario(SAMPLE_WEDDING, 'caterer', now), now);
    expect(before.overrun).toBe(0);
    expect(after.overrun).toBeGreaterThan(0);
    expect(after.projectedTotal).toBeGreaterThan(before.projectedTotal);
  });

  it('extra guests scale per-guest items and the headcount', () => {
    const next = applyDemoScenario(SAMPLE_WEDDING, 'guests', now);
    expect(next.guestCount).toBe(SAMPLE_WEDDING.guestCount + 30);
    expect(snapshotPlan(next, now).summary.totalEstimated).toBeGreaterThan(
      snapshotPlan(SAMPLE_WEDDING, now).summary.totalEstimated,
    );
  });

  it('rain adds a pandal line item', () => {
    const next = applyDemoScenario(SAMPLE_WEDDING, 'rain', now);
    expect(next.budgetItems.some((i) => i.id === 'demo-pandal')).toBe(true);
    expect(next.venuePreference).toBe('farmhouse_lawn');
  });

  it('date pull-forward lands 10 days out and never mutates the source plan', () => {
    const original = SAMPLE_WEDDING.eventDate;
    const next = applyDemoScenario(SAMPLE_WEDDING, 'date', now);
    expect(next.eventDate).toBe('2026-11-06');
    expect(SAMPLE_WEDDING.eventDate).toBe(original);
  });
});

describe('LiveDemoWindow', () => {
  it('shows the wedding plan and switches celebrations', () => {
    render(<LiveDemoWindow />);
    expect(screen.getByText(/Royal Rajasthan Wedding/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Birthday/i }));
    expect(screen.getByText(/Rooftop Bash/i)).toBeInTheDocument();
  });

  it('applies a what-if, shows the delta, and undoes it', () => {
    render(<LiveDemoWindow />);
    expect(screen.queryByText(/vs\. original plan/i)).not.toBeInTheDocument();
    const chip = screen.getByRole('button', { name: /Caterer raises price 20%/i });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/vs\. original plan/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Undo all/i }));
    expect(screen.queryByText(/vs\. original plan/i)).not.toBeInTheDocument();
  });

  it('navigates between views', () => {
    render(<LiveDemoWindow />);
    fireEvent.click(screen.getByRole('button', { name: /^Budget/i }));
    expect(screen.getByRole('img', { name: /Budget split by category/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Run of show/i }));
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('links to the full demo with the tour switched on', () => {
    render(<LiveDemoWindow />);
    const link = screen.getByRole('link', { name: /full demo with guided tour/i });
    expect(link.getAttribute('href')).toContain('/demo?event=');
    expect(link.getAttribute('href')).toContain('tour=1');
  });
});
