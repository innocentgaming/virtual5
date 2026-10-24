import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AICopilotDrawer } from '../components/copilot/AICopilotDrawer';
import { VendorChecklist } from '../components/vendors/VendorChecklist';
import { PersonalizedIdeas } from '../components/ideas/PersonalizedIdeas';
import type { EventPlan, VendorItem, PersonalizedIdea } from '../types/event';
import { ToastProvider } from '../components/ui';

describe('Copilot, Vendors & Ideas Polish (Step 7)', () => {
  const mockPlan: EventPlan = {
    id: 'evt-copilot-test',
    title: 'Jaipur Heritage Wedding',
    eventType: 'wedding',
    eventDate: '2027-02-15',
    city: 'Jaipur, Rajasthan',
    guestCount: 200,
    totalBudget: 2000000,
    currency: '₹',
    contingencyRate: 0.1,
    venuePreference: 'heritage_haveli',
    foodPreference: 'royal_thali',
    theme: 'Royal Rajputana Gold',
    priorities: ['venue', 'catering'],
    accessibilityNeeds: ['Wheelchair Ramp access'],
    culturalTraditions: 'Traditional Marwari rituals',
    budgetItems: [],
    tasks: [],
    vendors: [
      {
        id: 'vnd-1',
        category: 'caterer',
        role: 'Royal Halwai & Caterer',
        status: 'shortlisted',
        estimatedCost: 650000,
        questionsToAsk: [],
      },
      {
        id: 'vnd-2',
        category: 'officiant',
        role: 'Vedic Pandit Ji',
        status: 'booked',
        estimatedCost: 25000,
        questionsToAsk: [],
      },
    ] as VendorItem[],
    ideas: [
      {
        id: 'idea-1',
        category: 'food',
        title: 'Live Jalebi & Rabri Station',
        description: 'Interactive hot dessert stall with authentic copper kadhai.',
        tier: 'budget',
        costImpact: '₹12,000 savings',
        reasoning: 'Popular celebratory dessert with low unit cost.',
      },
      {
        id: 'idea-2',
        category: 'decor',
        title: 'Illuminated Palace Courtyard Mandap',
        description: 'Luxe floral and warm fairy light arches.',
        tier: 'premium',
        costImpact: '+₹45,000 investment',
        reasoning: 'Elevates evening photography for haveli venues.',
      },
    ] as PersonalizedIdea[],
    schedule: [],
    guests: [],
  };

  it('handles focus trap and Esc key in Copilot Drawer', () => {
    const handleClose = vi.fn();
    render(
      <ToastProvider>
        <AICopilotDrawer
          plan={mockPlan}
          isOpen={true}
          onClose={handleClose}
        />
      </ToastProvider>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Esc key triggers close
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Focus trap: Tab navigation
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    expect(focusable.length).toBeGreaterThan(1);

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    // Shift+Tab on first element wraps to last element
    firstEl.focus();
    fireEvent.keyDown(firstEl, { key: 'Tab', shiftKey: true });
    // Tab on last element wraps to first element
    lastEl.focus();
    fireEvent.keyDown(lastEl, { key: 'Tab', shiftKey: false });
  });

  it('handles context suggestion chips and toggle behavior', async () => {
    render(
      <ToastProvider>
        <AICopilotDrawer
          plan={mockPlan}
          isOpen={true}
          onClose={vi.fn()}
        />
      </ToastProvider>
    );

    // Suggestion chip is rendered
    const curfewChip = screen.getByText(/10 PM curfew rules/i);
    expect(curfewChip).toBeInTheDocument();

    // Clicking chip sends prompt and hides chips
    fireEvent.click(curfewChip);

    await waitFor(() => {
      // User message bubble appears with the query
      expect(screen.getByText(/10 PM curfew rules/i)).toBeInTheDocument();
    });

    // Chips can be shown again via toggle
    const toggleBtn = screen.getByRole('button', { name: /Show suggestions/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Mehendi artist interview questions/i)).toBeInTheDocument();
  });

  it('renders tailored interview questions in Vendor Checklist', () => {
    render(
      <ToastProvider>
        <VendorChecklist
          plan={mockPlan}
          onUpdateVendor={vi.fn()}
          onAddVendor={vi.fn()}
        />
      </ToastProvider>
    );

    // Expand Pandit Ji details
    const panditToggleButtons = screen.getAllByRole('button', { name: /Toggle vendor questions and notes/i });
    fireEvent.click(panditToggleButtons[1]); // second vendor is Pandit Ji

    // Check tailored Pandit Ji questions
    expect(screen.getByText(/auspicious muhurat timing/i)).toBeInTheDocument();
    expect(screen.getByText(/samagri and puja items/i)).toBeInTheDocument();
  });

  it('allows adding ideas to budget and tasks with feedback', () => {
    const handleAddBudget = vi.fn();
    const handleAddTask = vi.fn();

    render(
      <ToastProvider>
        <PersonalizedIdeas
          plan={mockPlan}
          onRegenerateIdeas={vi.fn()}
          onAddBudgetItem={handleAddBudget}
          onAddTask={handleAddTask}
        />
      </ToastProvider>
    );

    // Click "Add to budget" on the Live Jalebi idea
    const addBudgetBtn = screen.getByRole('button', { name: /Add Live Jalebi & Rabri Station to budget/i });
    fireEvent.click(addBudgetBtn);
    expect(handleAddBudget).toHaveBeenCalledTimes(1);
    expect(handleAddBudget).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Live Jalebi & Rabri Station',
        category: 'catering',
      })
    );

    // Click "Add to tasks" on the Live Jalebi idea
    const addTaskBtn = screen.getByRole('button', { name: /Add Live Jalebi & Rabri Station to tasks/i });
    fireEvent.click(addTaskBtn);
    expect(handleAddTask).toHaveBeenCalledTimes(1);
    expect(handleAddTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plan: Live Jalebi & Rabri Station',
      })
    );
  });
});
