import { useCallback } from 'react';
import type { EventPlan, BudgetItem } from '../types/event';

export function useBudget(
  activeEvent: EventPlan | undefined,
  updateEvent: (updated: EventPlan) => void
) {
  const addBudgetItem = useCallback(
    (item: Omit<BudgetItem, 'id'>) => {
      if (!activeEvent) return;
      const newItem: BudgetItem = {
        ...item,
        id: `budget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      updateEvent({
        ...activeEvent,
        budgetItems: [...activeEvent.budgetItems, newItem],
      });
    },
    [activeEvent, updateEvent]
  );

  const updateBudgetItem = useCallback(
    (item: BudgetItem) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        budgetItems: activeEvent.budgetItems.map((b) => (b.id === item.id ? item : b)),
      });
    },
    [activeEvent, updateEvent]
  );

  const deleteBudgetItem = useCallback(
    (id: string) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        budgetItems: activeEvent.budgetItems.filter((b) => b.id !== id),
      });
    },
    [activeEvent, updateEvent]
  );

  const updateContingencyRate = useCallback(
    (rate: number) => {
      if (!activeEvent) return;
      const safeRate = Math.max(0, Math.min(0.5, rate));
      updateEvent({
        ...activeEvent,
        contingencyRate: safeRate,
      });
    },
    [activeEvent, updateEvent]
  );

  return {
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    updateContingencyRate,
  };
}

