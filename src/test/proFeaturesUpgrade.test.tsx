import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsAppInviteModal } from '../components/guests/WhatsAppInviteModal';
import { TableSeatingPlanner } from '../components/guests/TableSeatingPlanner';
import { BudgetManager } from '../components/budget/BudgetManager';
import { SAMPLE_WEDDING } from '../data/sampleEvents';
import type { BudgetSummary, GuestItem } from '../types/event';

describe('Pro Features Upgrade Suite', () => {
  const mockBudgetSummary: BudgetSummary = {
    totalBudget: 3500000,
    totalEstimated: 3100000,
    remainingBalance: 400000,
    utilizationPercentage: 88,
    isOverBudget: false,
    contingencyAmount: 420000,
    categoryTotals: {
      venue: 800800,
      catering: 1293600,
      decor: 123200,
      photography: 554400,
      entertainment: 154000,
      logistics: 154000,
      invitations: 0,
      contingency: 420000,
      other: 0,
    },
    perGuestCost: 8857,
    totalActual: 3100000,
    variance: 0,
    isActualOverBudget: false,
  };

  const sampleGuests: GuestItem[] = [
    {
      id: 'g-1',
      name: 'Raja Man Singh',
      rsvpStatus: 'attending',
      dietary: 'jain',
      plusOne: true,
      tableNumber: 'Table 1',
    },
    {
      id: 'g-2',
      name: 'Maharani Gayatri',
      rsvpStatus: 'attending',
      dietary: 'pure_veg',
      plusOne: false,
      tableNumber: 'Table 1',
    },
    {
      id: 'g-3',
      name: 'Vikramaditya',
      rsvpStatus: 'pending',
      dietary: 'none',
      plusOne: false,
      tableNumber: '',
    },
  ];

  describe('WhatsAppInviteModal', () => {
    it('renders invitation modal with tone selection tabs and WhatsApp message preview', () => {
      const handleClose = vi.fn();
      render(<WhatsAppInviteModal isOpen={true} onClose={handleClose} plan={SAMPLE_WEDDING} />);

      expect(screen.getByText(/WhatsApp & Digital Invitation Broadcast/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Royal Traditional/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Modern Celebration/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Gentle RSVP Reminder/i })).toBeInTheDocument();
      expect(screen.getByText(/Shree Ganeshaya Namah/i)).toBeInTheDocument();
    });

    it('switches to Modern and Reminder formats when clicking tone tabs', () => {
      render(<WhatsAppInviteModal isOpen={true} onClose={vi.fn()} plan={SAMPLE_WEDDING} />);

      fireEvent.click(screen.getByRole('button', { name: /Modern Celebration/i }));
      expect(screen.getByText(/Save the Date & Join the Celebration!/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Gentle RSVP Reminder/i }));
      expect(screen.getAllByText(/Gentle RSVP Reminder/i).length).toBeGreaterThanOrEqual(2);
    });

    it('handles copy action and WhatsApp opening', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<WhatsAppInviteModal isOpen={true} onClose={vi.fn()} plan={SAMPLE_WEDDING} />);

      // Test WhatsApp link click
      const waButton = screen.getByRole('button', { name: /Open in WhatsApp/i });
      fireEvent.click(waButton);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('api.whatsapp.com/send?text='),
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });
  });

  describe('TableSeatingPlanner', () => {
    it('renders banquet tables with guest counts, capacity, and dietary badges', () => {
      const onUpdateGuest = vi.fn();
      render(
        <TableSeatingPlanner
          guests={sampleGuests}
          onUpdateGuest={onUpdateGuest}
          defaultTableCapacity={10}
        />
      );

      expect(screen.getByRole('heading', { name: 'Table 1', level: 4 })).toBeInTheDocument();
      expect(screen.getByText(/Raja Man Singh/i)).toBeInTheDocument();
      expect(screen.getByText(/🌱 1 Jain/i)).toBeInTheDocument();
      expect(screen.getByText(/🥗 1 Pure Veg/i)).toBeInTheDocument();
    });

    it('shows unassigned guests tray and allows table assignment', () => {
      const onUpdateGuest = vi.fn();
      render(
        <TableSeatingPlanner
          guests={sampleGuests}
          onUpdateGuest={onUpdateGuest}
          defaultTableCapacity={10}
        />
      );

      expect(screen.getByText(/Unassigned Guests Tray/i)).toBeInTheDocument();
      expect(screen.getByText(/Vikramaditya/i)).toBeInTheDocument();

      const assignSelect = screen.getByLabelText(/Assign Vikramaditya to table/i);
      fireEvent.change(assignSelect, { target: { value: 'Table 1' } });

      expect(onUpdateGuest).toHaveBeenCalledWith('g-3', { tableNumber: 'Table 1' });
    });
  });

  describe('BudgetManager Pro Enhancements', () => {
    it('renders Vendor Payment Milestones card and Export CSV button', () => {
      render(
        <BudgetManager
          plan={SAMPLE_WEDDING}
          budgetSummary={mockBudgetSummary}
          onAddExpense={vi.fn()}
          onUpdateExpense={vi.fn()}
          onDeleteExpense={vi.fn()}
          onUpdateContingency={vi.fn()}
        />
      );

      expect(screen.getByText(/Vendor Payment Milestones & Settlement/i)).toBeInTheDocument();
      const exportButtons = screen.getAllByRole('button', { name: /Export CSV/i });
      expect(exportButtons.length).toBeGreaterThan(0);
    });
  });
});
