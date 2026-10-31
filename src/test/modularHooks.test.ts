import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudget } from '../hooks/useBudget';
import { useGuests } from '../hooks/useGuests';
import { useTimeline } from '../hooks/useTimeline';
import { useVirtualList } from '../hooks/useVirtualList';
import { useCountUp } from '../hooks/useCountUp';
import { SAMPLE_WEDDING } from '../data/sampleEvents';
import type { EventPlan, BudgetItem, GuestItem, TaskItem, ScheduleItem } from '../types/event';

describe('useBudget Hook', () => {
  it('adds a budget item when activeEvent is present', () => {
    let currentPlan: EventPlan = { ...SAMPLE_WEDDING };
    const updateEvent = vi.fn((updated: EventPlan) => {
      currentPlan = updated;
    });

    const { result, rerender } = renderHook(
      ({ plan }) => useBudget(plan, updateEvent),
      { initialProps: { plan: currentPlan } }
    );

    act(() => {
      result.current.addBudgetItem({
        category: 'decor',
        name: 'Floral Archway',
        estimatedCost: 75000,
        isPerGuest: false,
        isPaid: false,
      });
    });

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(currentPlan.budgetItems.some((b) => b.name === 'Floral Archway')).toBe(true);

    // Update item
    rerender({ plan: currentPlan });
    const added = currentPlan.budgetItems.find((b) => b.name === 'Floral Archway') as BudgetItem;
    act(() => {
      result.current.updateBudgetItem({ ...added, actualCost: 80000 });
    });
    expect(currentPlan.budgetItems.find((b) => b.name === 'Floral Archway')?.actualCost).toBe(80000);

    // Update contingency
    act(() => {
      result.current.updateContingencyRate(0.18);
    });
    expect(currentPlan.contingencyRate).toBe(0.18);

    // Delete item
    act(() => {
      result.current.deleteBudgetItem(added.id);
    });
    expect(currentPlan.budgetItems.some((b) => b.id === added.id)).toBe(false);
  });

  it('no-ops safely when activeEvent is undefined', () => {
    const updateEvent = vi.fn();
    const { result } = renderHook(() => useBudget(undefined, updateEvent));

    act(() => {
      result.current.addBudgetItem({
        category: 'catering',
        name: 'Buffet',
        estimatedCost: 10000,
        isPerGuest: false,
        isPaid: false,
      });
      result.current.updateContingencyRate(0.15);
      result.current.deleteBudgetItem('none');
    });

    expect(updateEvent).not.toHaveBeenCalled();
  });
});

describe('useGuests Hook', () => {
  it('adds, updates, and deletes guests', () => {
    let currentPlan: EventPlan = { ...SAMPLE_WEDDING, guests: [] };
    const updateEvent = vi.fn((updated: EventPlan) => {
      currentPlan = updated;
    });

    const { result, rerender } = renderHook(
      ({ plan }) => useGuests(plan, updateEvent),
      { initialProps: { plan: currentPlan } }
    );

    act(() => {
      result.current.addGuest({
        name: 'Rohit Sharma',
        side: 'groom',
        dietary: 'jain',
        rsvpStatus: 'confirmed',
        plusOne: true,
      });
    });

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(currentPlan.guests?.length).toBe(1);

    rerender({ plan: currentPlan });
    const guest = (currentPlan.guests || [])[0] as GuestItem;
    act(() => {
      result.current.updateGuest({ ...guest, tableNumber: 'Table 4' });
    });
    expect(currentPlan.guests?.[0].tableNumber).toBe('Table 4');

    act(() => {
      result.current.deleteGuest(guest.id);
    });
    expect(currentPlan.guests?.length).toBe(0);
  });

  it('no-ops safely when activeEvent is undefined', () => {
    const updateEvent = vi.fn();
    const { result } = renderHook(() => useGuests(undefined, updateEvent));

    act(() => {
      result.current.addGuest({
        name: 'Test',
        side: 'bride',
        dietary: 'pure_veg',
        rsvpStatus: 'pending',
        plusOne: false,
      });
      result.current.deleteGuest('id');
    });

    expect(updateEvent).not.toHaveBeenCalled();
  });
});

describe('useTimeline Hook', () => {
  it('adds, toggles, updates, and deletes tasks', () => {
    let currentPlan: EventPlan = { ...SAMPLE_WEDDING };
    const updateEvent = vi.fn((updated: EventPlan) => {
      currentPlan = updated;
    });

    const { result, rerender } = renderHook(
      ({ plan }) => useTimeline(plan, updateEvent),
      { initialProps: { plan: currentPlan } }
    );

    act(() => {
      result.current.addTask({
        title: 'Book Shehnai Troupe',
        category: 'entertainment',
        daysBeforeEvent: 30,
        completed: false,
        criticalPath: true,
      });
    });

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(currentPlan.tasks.some((t) => t.title === 'Book Shehnai Troupe')).toBe(true);

    rerender({ plan: currentPlan });
    const task = currentPlan.tasks.find((t) => t.title === 'Book Shehnai Troupe') as TaskItem;
    act(() => {
      result.current.toggleTask(task.id);
    });
    expect(currentPlan.tasks.find((t) => t.id === task.id)?.completed).toBe(true);

    act(() => {
      result.current.updateTask({ ...task, title: 'Book Shehnai & Dhol Troupe' });
    });
    expect(currentPlan.tasks.find((t) => t.id === task.id)?.title).toBe('Book Shehnai & Dhol Troupe');

    act(() => {
      result.current.deleteTask(task.id);
    });
    expect(currentPlan.tasks.some((t) => t.id === task.id)).toBe(false);
  });

  it('adds, updates, deletes schedule items and shifts muhurat', () => {
    let currentPlan: EventPlan = { ...SAMPLE_WEDDING, schedule: [] };
    const updateEvent = vi.fn((updated: EventPlan) => {
      currentPlan = updated;
    });

    const { result, rerender } = renderHook(
      ({ plan }) => useTimeline(plan, updateEvent),
      { initialProps: { plan: currentPlan } }
    );

    act(() => {
      result.current.addScheduleItem({
        title: 'Baraat Procession',
        startTime: '19:00',
        endTime: '20:30',
        description: 'Procession with brass band',
        isCriticalMuhurat: false,
      });
    });

    expect(currentPlan.schedule?.length).toBe(1);

    rerender({ plan: currentPlan });
    const item = (currentPlan.schedule || [])[0] as ScheduleItem;
    act(() => {
      result.current.updateScheduleItem({ ...item, isCriticalMuhurat: true });
    });
    expect(currentPlan.schedule?.[0].isCriticalMuhurat).toBe(true);

    // Repace timeline with a new date
    act(() => {
      result.current.repaceTimeline('2026-11-20');
    });
    expect(currentPlan.eventDate).toBe('2026-11-20');

    act(() => {
      result.current.deleteScheduleItem(item.id);
    });
    expect(currentPlan.schedule?.length).toBe(0);
  });
});

describe('useVirtualList Hook', () => {
  it('returns non-virtual view when items are under threshold', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i, label: `Item ${i}` }));
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 40, threshold: 50 })
    );

    expect(result.current.isVirtual).toBe(false);
    expect(result.current.visibleItems.length).toBe(20);
    expect(result.current.topSpacerHeight).toBe(0);
    expect(result.current.bottomSpacerHeight).toBe(0);
  });

  it('computes virtual slicing window when items exceed threshold', () => {
    const items = Array.from({ length: 300 }, (_, i) => ({ id: i, label: `Item ${i}` }));
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50, threshold: 100, overscan: 2 })
    );

    expect(result.current.isVirtual).toBe(true);
    expect(result.current.totalHeight).toBe(300 * 50);
    expect(result.current.visibleItems.length).toBeLessThan(300);
  });
});

describe('useCountUp Hook', () => {
  it('returns target directly under test or reduced motion', () => {
    const { result } = renderHook(() => useCountUp(50000, 400));
    expect(result.current).toBe(50000);
  });
});
