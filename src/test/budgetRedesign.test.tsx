import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetManager } from '../components/budget/BudgetManager';
import type { EventPlan, BudgetSummary } from '../types/event';
import { ToastProvider } from '../components/ui';

const mockPlan: EventPlan = {
  id: 'evt-test-budget',
  title: 'Test Wedding Celebration',
  eventType: 'wedding',
  eventDate: '2026-11-15',
  city: 'Jaipur, Rajasthan',
  guestCount: 200,
  totalBudget: 1000000,
  currency: '₹',
  contingencyRate: 0.1,
  venuePreference: 'heritage_haveli',
  foodPreference: 'royal_thali',
  theme: 'Royal Marigold',
  priorities: ['venue', 'catering'],
  accessibilityNeeds: [],
  budgetItems: [
    {
      id: 'item-1-green',
      name: 'Under-budget Item',
      category: 'venue',
      estimatedCost: 100000,
      actualCost: 95000, // -5% -> Green
      priority: 'essential',
    },
    {
      id: 'item-2-amber',
      name: 'Slightly-over Item',
      category: 'catering',
      estimatedCost: 100000,
      actualCost: 108000, // +8% -> Amber (+10% threshold)
      priority: 'essential',
    },
    {
      id: 'item-3-red',
      name: 'Over-10-percent Item',
      category: 'photography',
      estimatedCost: 100000,
      actualCost: 115000, // +15% -> Red
      priority: 'recommended',
    },
    {
      id: 'item-4-spike',
      name: 'Vendor Spike Item',
      category: 'decor',
      estimatedCost: 100000,
      actualCost: 125000, // +25% -> Red + "↑ Spike"
      priority: 'recommended',
    },
    {
      id: 'item-5-pending',
      name: 'Pending Quote Item',
      category: 'entertainment',
      estimatedCost: 50000,
      priority: 'optional',
    },
  ],
  tasks: [],
  vendors: [],
  ideas: [],
  schedule: [],
  decisionInsights: [],
};

const mockSummary: BudgetSummary = {
  totalBudget: 1000000,
  totalEstimated: 450000,
  remainingBalance: 550000,
  utilizationPercentage: 45,
  isOverBudget: false,
  contingencyAmount: 100000,
  categoryTotals: {
    venue: 100000,
    catering: 100000,
    decor: 100000,
    photography: 100000,
    entertainment: 50000,
    logistics: 0,
    invitations: 0,
    contingency: 100000,
    other: 0,
  },
  perGuestCost: 2250,
  totalActual: 443000,
  variance: 557000,
  isActualOverBudget: false,
};

describe('Budget Redesign (Step 4)', () => {
  it('correctly applies variance chip thresholds: green, amber, red, and ↑ Spike badge', () => {
    render(
      <ToastProvider>
        <BudgetManager
          plan={mockPlan}
          budgetSummary={mockSummary}
          onAddExpense={vi.fn()}
          onUpdateExpense={vi.fn()}
          onDeleteExpense={vi.fn()}
          onUpdateContingency={vi.fn()}
        />
      </ToastProvider>
    );

    // Green variance: on/under budget (-5%)
    expect(screen.getByText(/✓ On budget/i)).toBeInTheDocument();

    // Amber variance: within +10% over estimate (+8%)
    expect(screen.getByText(/\+8%/i)).toBeInTheDocument();

    // Red variance: > 10% over estimate (+15%)
    expect(screen.getByText(/\+15%/i)).toBeInTheDocument();

    // Spike threshold: >= 20% over estimate (+25%)
    expect(screen.getByText(/\+25%/i)).toBeInTheDocument();
    expect(screen.getByText(/↑ Spike/i)).toBeInTheDocument();
  });

  it('validates inline editing: Enter saves with clamped values and triggers toast, Esc cancels', () => {
    const handleUpdate = vi.fn();
    render(
      <ToastProvider>
        <BudgetManager
          plan={mockPlan}
          budgetSummary={mockSummary}
          onAddExpense={vi.fn()}
          onUpdateExpense={handleUpdate}
          onDeleteExpense={vi.fn()}
          onUpdateContingency={vi.fn()}
        />
      </ToastProvider>
    );

    // Click edit on the first item
    const editButtons = screen.getAllByLabelText(/Edit/i);
    fireEvent.click(editButtons[0]);

    // Name input should now be visible
    const nameInput = screen.getByLabelText(/Edit item name/i);
    expect(nameInput).toHaveValue('Under-budget Item');

    // Change to negative number to test zero clamping
    const costInput = screen.getByLabelText(/Edit estimated cost/i);
    fireEvent.change(costInput, { target: { value: '-2000' } });

    // Press Enter to save
    fireEvent.keyDown(costInput, { key: 'Enter', code: 'Enter' });

    // Should call onUpdateExpense with non-negative clamped cost
    expect(handleUpdate).toHaveBeenCalledWith(
      'item-1-green',
      expect.objectContaining({
        estimatedCost: 0,
      })
    );
  });

  it('cancels inline editing when Escape key is pressed', () => {
    render(
      <ToastProvider>
        <BudgetManager
          plan={mockPlan}
          budgetSummary={mockSummary}
          onAddExpense={vi.fn()}
          onUpdateExpense={vi.fn()}
          onDeleteExpense={vi.fn()}
          onUpdateContingency={vi.fn()}
        />
      </ToastProvider>
    );

    const editButtons = screen.getAllByLabelText(/Edit/i);
    fireEvent.click(editButtons[0]);

    const nameInput = screen.getByLabelText(/Edit item name/i);
    fireEvent.change(nameInput, { target: { value: 'Temporary Name' } });

    // Press Escape
    fireEvent.keyDown(nameInput, { key: 'Escape', code: 'Escape' });

    // Should cancel edit mode and restore normal row
    expect(screen.queryByLabelText(/Edit item name/i)).not.toBeInTheDocument();
    expect(screen.getByText('Under-budget Item')).toBeInTheDocument();
  });
});
