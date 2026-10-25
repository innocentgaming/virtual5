import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuestManager } from '../components/guests/GuestManager';
import type { GuestItem, EventPlan } from '../types/event';
import { ToastProvider } from '../components/ui';

const mockGuests: GuestItem[] = [
  {
    id: 'g-1',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    rsvpStatus: 'attending',
    dietary: 'jain',
    plusOne: true,
    plusOneName: 'Pooja',
    tableNumber: 'Table 1',
  },
  {
    id: 'g-2',
    name: 'Sunita Patel',
    email: 'sunita@example.com',
    rsvpStatus: 'attending',
    dietary: 'pure_veg',
    plusOne: false,
    tableNumber: 'Table 1',
  },
  {
    id: 'g-3',
    name: 'Zayn Malik',
    email: 'zayn@example.com',
    rsvpStatus: 'pending',
    dietary: 'halal',
    plusOne: false,
  },
  {
    id: 'g-4',
    name: 'Priya Verma',
    email: 'priya@example.com',
    rsvpStatus: 'declined',
    dietary: 'gluten_free',
    plusOne: false,
  },
];

const createPlanWithCapacity = (targetCapacity: number, guests = mockGuests): EventPlan => ({
  id: 'evt-test-guests',
  title: 'Royal Indian Wedding',
  eventType: 'wedding',
  eventDate: '2026-12-10',
  city: 'Jaipur, Rajasthan',
  guestCount: targetCapacity,
  totalBudget: 1500000,
  currency: '₹',
  contingencyRate: 0.1,
  venuePreference: 'heritage_haveli',
  foodPreference: 'royal_thali',
  theme: 'Royal Marigold',
  priorities: ['venue', 'catering'],
  accessibilityNeeds: [],
  budgetItems: [],
  tasks: [],
  vendors: [],
  ideas: [],
  schedule: [],
  guests,
});

describe('Guests Redesign (Step 5)', () => {
  it('filters guests correctly using filter chips (Jain, Has +1, Confirmed)', () => {
    render(
      <ToastProvider>
        <GuestManager
          plan={createPlanWithCapacity(10)}
          onAddGuest={vi.fn()}
          onUpdateGuest={vi.fn()}
          onDeleteGuest={vi.fn()}
        />
      </ToastProvider>
    );

    // Initial all view
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Sunita Patel')).toBeInTheDocument();
    expect(screen.getByText('Zayn Malik')).toBeInTheDocument();
    expect(screen.getByText('Priya Verma')).toBeInTheDocument();

    // Click Jain chip
    fireEvent.click(screen.getByRole('button', { name: /Jain/i }));
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Zayn Malik')).not.toBeInTheDocument();

    // Click Has +1 chip
    fireEvent.click(screen.getByRole('button', { name: /Has \+1/i }));
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Sunita Patel')).not.toBeInTheDocument();

    // Click Confirmed chip
    fireEvent.click(screen.getByRole('button', { name: /^Confirmed/i }));
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Sunita Patel')).toBeInTheDocument();
    expect(screen.queryByText('Priya Verma')).not.toBeInTheDocument();
  });

  it('triggers capacity thresholds: amber when >90%, red when >100% (Rule 6)', () => {
    // Total confirmed heads: Aarav (1+1) + Sunita (1) = 3 heads
    // Case 1: Target capacity 3 -> 3/3 = 100% -> Amber threshold (>90% and <=100%)
    const { rerender } = render(
      <ToastProvider>
        <GuestManager
          plan={createPlanWithCapacity(3)}
          onAddGuest={vi.fn()}
          onUpdateGuest={vi.fn()}
          onDeleteGuest={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Approaching planned capacity/i)).toBeInTheDocument();

    // Case 2: Target capacity 2 -> 3/2 = 150% -> Red danger threshold (>100%)
    rerender(
      <ToastProvider>
        <GuestManager
          plan={createPlanWithCapacity(2)}
          onAddGuest={vi.fn()}
          onUpdateGuest={vi.fn()}
          onDeleteGuest={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Rule 6 Triggered: RSVP headcount exceeds planned venue capacity/i)).toBeInTheDocument();
  });

  it('renders persistent info banner for Jain/Pure Veg kitchen counter with accurate count', () => {
    render(
      <ToastProvider>
        <GuestManager
          plan={createPlanWithCapacity(10)}
          onAddGuest={vi.fn()}
          onUpdateGuest={vi.fn()}
          onDeleteGuest={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Dedicated Pure Veg \/ Jain Kitchen Counter Required/i)).toBeInTheDocument();
    expect(screen.getByText(/2 guests/i)).toBeInTheDocument();
  });
});
