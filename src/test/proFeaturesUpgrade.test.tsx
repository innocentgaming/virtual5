import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsAppInviteModal } from '../components/guests/WhatsAppInviteModal';
import { TableSeatingPlanner } from '../components/guests/TableSeatingPlanner';
import { BudgetManager } from '../components/budget/BudgetManager';
import { RunOfShowManager } from '../components/schedule/RunOfShowManager';
import { TimelineManager } from '../components/timeline/TimelineManager';
import { VendorChecklist } from '../components/vendors/VendorChecklist';
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

  describe('RunOfShowManager Pro Upgrades', () => {
    it('supports Muhurat timing ripple preview and saving shift to plan', () => {
      const onUpdateScheduleItem = vi.fn();
      render(
        <RunOfShowManager
          plan={SAMPLE_WEDDING}
          onAddScheduleItem={vi.fn()}
          onUpdateScheduleItem={onUpdateScheduleItem}
          onDeleteScheduleItem={vi.fn()}
        />
      );

      // Verify timing ripple controller is present
      expect(screen.getByText(/Muhurat & Baraat Timing Shift Ripple:/i)).toBeInTheDocument();

      // Click +30 min Baraat Rush chip
      const plus30Btn = screen.getByRole('button', { name: /\+30 min \(Baraat Rush\)/i });
      fireEvent.click(plus30Btn);

      // Check preview badge
      expect(screen.getByText(/\+30 min shifted/i)).toBeInTheDocument();

      // Click Save Shift to Plan
      const saveBtn = screen.getByRole('button', { name: /Save Shift to Plan/i });
      fireEvent.click(saveBtn);

      expect(onUpdateScheduleItem).toHaveBeenCalled();
    });

    it('filters schedule by crew call-sheet role chips', () => {
      render(
        <RunOfShowManager
          plan={SAMPLE_WEDDING}
          onAddScheduleItem={vi.fn()}
          onUpdateScheduleItem={vi.fn()}
          onDeleteScheduleItem={vi.fn()}
        />
      );

      // Verify role filter chips are present
      expect(screen.getByText(/Call-Sheet Filter:/i)).toBeInTheDocument();
      const allCrewsBtn = screen.getByRole('button', { name: /All Crews/i });
      expect(allCrewsBtn).toBeInTheDocument();
    });

    it('opens Police Loudspeaker NOC modal and provides copyable application letter', () => {
      render(
        <RunOfShowManager
          plan={SAMPLE_WEDDING}
          onAddScheduleItem={vi.fn()}
          onUpdateScheduleItem={vi.fn()}
          onDeleteScheduleItem={vi.fn()}
        />
      );

      const nocGuideBtn = screen.getByRole('button', { name: /Police Loudspeaker NOC Guide & Letter/i });
      fireEvent.click(nocGuideBtn);

      // Check modal content
      expect(screen.getAllByText(/Noise Pollution \(Regulation and Control\) Rules, 2000/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Sound Vendor Decibel Undertaking:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy Letter Draft/i })).toBeInTheDocument();
    });
  });

  describe('TimelineManager Vedic Samagri Kit', () => {
    it('opens Vedic Ritual & Puja Samagri Kit modal and toggles procurement checklist items', () => {
      render(
        <TimelineManager
          plan={SAMPLE_WEDDING}
          onToggleTask={vi.fn()}
          onAddTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      );

      const samagriBtn = screen.getByRole('button', { name: /Puja Samagri Kit/i });
      fireEvent.click(samagriBtn);

      expect(screen.getByText(/Vedic Ritual & Puja Samagri Kit/i)).toBeInTheDocument();
      expect(screen.getByText(/1. Mandap & Kalash Sthapana/i)).toBeInTheDocument();
      expect(screen.getByText(/Pure Desi Ghee \(Cow Ghee\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy for WhatsApp/i })).toBeInTheDocument();
    });
  });

  describe('VendorChecklist GST & TDS Estimator', () => {
    it('opens GST & TDS Estimator modal and computes tax breakdowns accurately', () => {
      render(
        <VendorChecklist
          plan={SAMPLE_WEDDING}
          onUpdateVendor={vi.fn()}
          onAddVendor={vi.fn()}
        />
      );

      const gstBtn = screen.getByRole('button', { name: /GST & TDS Estimator/i });
      fireEvent.click(gstBtn);

      expect(screen.getByText(/Indian Event Vendor GST & TDS Estimator/i)).toBeInTheDocument();
      expect(screen.getByText(/Contractor Base Service Value:/i)).toBeInTheDocument();

      // Default is ₹1,00,000 base with 18% GST = ₹18,000 GST, Total ₹1,18,000
      expect(screen.getByText(/\+₹18,000/i)).toBeInTheDocument();
      expect(screen.getAllByText(/₹1,18,000/i).length).toBeGreaterThanOrEqual(1);

      // Change slab to 5% composite catering
      const slabSelect = screen.getByLabelText(/Applicable GST Slab/i);
      fireEvent.change(slabSelect, { target: { value: '5' } });

      expect(screen.getByText(/\+₹5,000/i)).toBeInTheDocument();
      expect(screen.getAllByText(/₹1,05,000/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
