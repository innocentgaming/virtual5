import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineManager } from '../components/timeline/TimelineManager';
import { RunOfShowManager } from '../components/schedule/RunOfShowManager';
import type { TaskItem, ScheduleItem, EventPlan } from '../types/event';
import { ToastProvider } from '../components/ui';

describe('Timeline & Run of Show Redesign (Step 6)', () => {
  // Helper to get local YYYY-MM-DD
  const formatLocalDate = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const now = new Date();
  const pastD = new Date(now);
  pastD.setDate(now.getDate() - 5);
  const pastDate = formatLocalDate(pastD);

  const futureD = new Date(now);
  futureD.setDate(now.getDate() + 60);
  const futureDate = formatLocalDate(futureD);

  const eventD = new Date(now);
  eventD.setDate(now.getDate() + 100);
  const eventDate = formatLocalDate(eventD);

  const mockTasks: TaskItem[] = [
    {
      id: 'task-venue',
      title: 'Book Heritage Haveli Venue',
      category: 'venue',
      dueDate: pastDate, // Overdue
      completed: false,
      priority: 'urgent',
    },
    {
      id: 'task-caterer',
      title: 'Finalize Royal Marwari Caterer',
      category: 'catering',
      dueDate: futureDate,
      completed: false,
      priority: 'high',
      dependencies: ['task-venue'], // Blocked by task-venue
    },
    {
      id: 'task-photographer',
      title: 'Book Candid Wedding Photographer',
      category: 'vendors',
      dueDate: futureDate,
      completed: true,
      priority: 'medium',
    },
  ];

  const mockSchedule: ScheduleItem[] = [
    {
      id: 'sch-1',
      time: '04:00 PM',
      activity: 'Grand Baraat Procession with Dhol',
      location: 'Front Courtyard',
      responsibleRole: 'Dhol Band & Groom Family',
      notes: 'Ensure dhol procession starts from north gate',
    },
    {
      id: 'sch-2',
      time: '07:30 PM',
      activity: 'Vedic Pheras at Sacred Mandap',
      location: 'Central Mandap',
      responsibleRole: 'Pandit Ji',
    },
    {
      id: 'sch-3',
      time: '10:30 PM',
      activity: 'Late Night Sangeet & Indoor DJ',
      location: 'Indoor Acoustic Banquet',
      responsibleRole: 'DJ / Audio Team',
      notes: 'Indoor acoustic venue only',
    },
  ];

  const createPlan = (tasks: TaskItem[] = mockTasks, schedule: ScheduleItem[] = mockSchedule): EventPlan => ({
    id: 'evt-test-timeline',
    title: 'Royal Rajasthan Wedding',
    eventType: 'wedding',
    eventDate,
    city: 'Jaipur, Rajasthan',
    guestCount: 250,
    totalBudget: 2500000,
    currency: '₹',
    contingencyRate: 0.1,
    venuePreference: 'heritage_haveli',
    foodPreference: 'royal_thali',
    theme: 'Royal Rajputana Gold',
    priorities: ['venue', 'catering'],
    accessibilityNeeds: [],
    budgetItems: [],
    tasks,
    vendors: [],
    ideas: [],
    schedule,
    guests: [],
  });

  it('renders overdue label with days overdue calculation', () => {
    render(
      <ToastProvider>
        <TimelineManager
          plan={createPlan()}
          onToggleTask={vi.fn()}
          onAddTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>
    );

    // Overdue task should display "Overdue (N days overdue)"
    expect(screen.getByText(/Overdue \(\d+ days? overdue\)/i)).toBeInTheDocument();
    // Overdue filter button should indicate 1 overdue task
    expect(screen.getByRole('button', { name: /Overdue \(1\)/i })).toBeInTheDocument();
  });

  it('displays blocked-by-prerequisite state with lock icon and prerequisite chip', () => {
    const { rerender } = render(
      <ToastProvider>
        <TimelineManager
          plan={createPlan()}
          onToggleTask={vi.fn()}
          onAddTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>
    );

    // 'task-caterer' depends on incomplete 'task-venue', so it should show Blocked state
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('⚠ Needs: Book Heritage Haveli Venue')).toBeInTheDocument();

    // Now resolve the prerequisite
    const resolvedTasks: TaskItem[] = mockTasks.map((t) =>
      t.id === 'task-venue' ? { ...t, completed: true } : t
    );

    rerender(
      <ToastProvider>
        <TimelineManager
          plan={createPlan(resolvedTasks)}
          onToggleTask={vi.fn()}
          onAddTask={vi.fn()}
          onDeleteTask={vi.fn()}
        />
      </ToastProvider>
    );

    // Blocked badge should disappear and prerequisite chip should show completed
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
    expect(screen.getByText('✓ Book Heritage Haveli Venue')).toBeInTheDocument();
  });

  it('renders 10:00 PM Curfew divider in Run of Show with Rule 9 protocol', () => {
    render(
      <ToastProvider>
        <RunOfShowManager
          plan={createPlan()}
          onAddScheduleItem={vi.fn()}
          onUpdateScheduleItem={vi.fn()}
          onDeleteScheduleItem={vi.fn()}
        />
      </ToastProvider>
    );

    // Rule 9 banner and 10 PM divider
    expect(screen.getByText(/Curfew: Move Indoors \(10:00 PM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule 9 Protocol:/i)).toBeInTheDocument();

    // Check ritual content & badges
    expect(screen.getAllByText(/Baraat Procession/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: /Grand Baraat Procession with Dhol/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Vedic Pheras at Sacred Mandap/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Late Night Sangeet & Indoor DJ/i })).toBeInTheDocument();
  });
});
