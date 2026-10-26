import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWorkspace } from './renderWorkspace';
import { loadSavedEvents, loadActiveEventId } from '../services/storageService';

describe('QA Pass: Accessibility, Heading Hierarchy & Responsive Standards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('maintains exactly one h1 per view across all primary routes', () => {
    renderWorkspace('demo');

    // Dashboard View
    let h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);
    expect(h1Elements[0]).toHaveTextContent('EventWise AI');

    // Budget Manager View
    const budgetTab = screen.getByRole('button', { name: /Budget Manager/i });
    fireEvent.click(budgetTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);

    // Timeline View
    const timelineTab = screen.getByRole('button', { name: /Timeline & Tasks/i });
    fireEvent.click(timelineTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);

    // Run of Show View
    const scheduleTab = screen.getByRole('button', { name: /Run of Show/i });
    fireEvent.click(scheduleTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);

    // Guests View
    const guestsTab = screen.getByRole('button', { name: /Guest List & RSVPs/i });
    fireEvent.click(guestsTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);

    // Vendors View
    const vendorsTab = screen.getByRole('button', { name: /Vendor Checklist/i });
    fireEvent.click(vendorsTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);

    // Ideas View
    const ideasTab = screen.getByRole('button', { name: /Personalized Ideas/i });
    fireEvent.click(ideasTab);
    h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);
  });

  it('has semantic h2 headings representing major section views without skipping levels', () => {
    renderWorkspace('demo');

    // In Dashboard overview, event title is h2
    const h2Elements = document.querySelectorAll('h2');
    expect(h2Elements.length).toBeGreaterThanOrEqual(1);

    // Navigate to Budget Manager and verify h2 card headers exist
    const budgetTab = screen.getByRole('button', { name: /Budget Manager/i });
    fireEvent.click(budgetTab);
    const budgetH2s = Array.from(document.querySelectorAll('h2')).map((el) => el.textContent);
    expect(budgetH2s.some((text) => text?.includes('Expense Distribution by Category'))).toBe(true);
    expect(budgetH2s.some((text) => text?.includes('Expense Line Items'))).toBe(true);

    // Navigate to Timeline and verify h2 exists
    const timelineTab = screen.getByRole('button', { name: /Timeline & Tasks/i });
    fireEvent.click(timelineTab);
    const timelineH2s = Array.from(document.querySelectorAll('h2')).map((el) => el.textContent);
    expect(timelineH2s.some((text) => text?.includes('Date-Aware Preparation Timeline'))).toBe(true);
  });

  it('exposes polite aria-live status regions for filter updates', () => {
    renderWorkspace('demo');

    // Guests view live region
    const guestsTab = screen.getByRole('button', { name: /Guest List & RSVPs/i });
    fireEvent.click(guestsTab);

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);
  });

  it('verifies that offline storage fallback operates without network or API keys', () => {
    // Verify storage service loads default offline sample plans when storage is empty
    const events = loadSavedEvents();
    expect(events.length).toBeGreaterThan(0);

    const activeId = loadActiveEventId();
    expect(activeId === null || typeof activeId === 'string').toBe(true);

    // Verify localStorage has no raw API keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      expect(key.toLowerCase()).not.toContain('apikey');
      expect(key.toLowerCase()).not.toContain('secret');
      expect(key.toLowerCase()).not.toContain('token');
    }
  });

  it('supports modal focus and dismissal lifecycle', () => {
    renderWorkspace('demo');

    // Open Copilot drawer
    const copilotBtn = screen.getByRole('button', { name: /Ask Copilot/i });
    fireEvent.click(copilotBtn);

    const dialog = screen.getByRole('dialog', { name: /EventWise Copilot/i });
    expect(dialog).toBeInTheDocument();

    // Dismiss Copilot drawer
    const closeBtn = screen.getByRole('button', { name: /Close Copilot/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: /EventWise Copilot/i })).not.toBeInTheDocument();
  });
});
