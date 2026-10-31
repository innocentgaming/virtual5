import type {
  EventPlan,
  BudgetSummary,
  BudgetCategory,
  BudgetItem,
} from '../types/event';

export type BudgetSummaryPlanInput = Pick<
  EventPlan,
  'totalBudget' | 'budgetItems' | 'contingencyRate' | 'guestCount'
>;

/**
 * Pure calculation engine for Indian Rupee event budgets, category distributions,
 * contingency reserves, per-guest allocations, and contract-vs-actual variance.
 *
 * Supports both overloaded signatures:
 * 1. calculateBudgetSummary(plan: EventPlan)
 * 2. calculateBudgetSummary(totalBudget, items, contingencyRate, guestCount)
 *
 * @param planOrBudget - Active EventPlan object or total planned budget in INR
 * @param items - Optional array of BudgetItem instances (when first param is number)
 * @param contingencyRate - Optional contingency percentage (default 0.10)
 * @param guestCount - Optional attendee count for per-guest calculation (default 1)
 * @returns Fully computed BudgetSummary
 */
export function calculateBudgetSummary(
  planOrBudget: number | BudgetSummaryPlanInput,
  items?: BudgetItem[],
  contingencyRate: number = 0.10,
  guestCount: number = 1
): BudgetSummary {
  let totalBudget = 0;
  let budgetItems: BudgetItem[] = [];
  let rate = contingencyRate;
  let count = guestCount;

  if (typeof planOrBudget === 'object' && planOrBudget !== null) {
    totalBudget = planOrBudget.totalBudget;
    budgetItems = planOrBudget.budgetItems || [];
    rate = planOrBudget.contingencyRate ?? 0.10;
    count = planOrBudget.guestCount ?? 1;
  } else {
    totalBudget = planOrBudget;
    budgetItems = items || [];
  }

  const safeBudget = Math.max(0, isNaN(totalBudget) ? 0 : totalBudget);
  const safeContingencyRate = Math.max(0, Math.min(0.5, isNaN(rate) ? 0.10 : rate));

  const categoryTotals: Record<BudgetCategory, number> = {
    venue: 0,
    catering: 0,
    decor: 0,
    photography: 0,
    entertainment: 0,
    logistics: 0,
    invitations: 0,
    contingency: 0,
    other: 0,
  };

  let nonContingencySum = 0;
  let totalActual = 0;

  for (const item of budgetItems) {
    if (item.category === 'contingency') continue;
    const cost = Math.max(0, isNaN(item.estimatedCost) ? 0 : item.estimatedCost);
    if (categoryTotals[item.category] !== undefined) {
      categoryTotals[item.category] += cost;
    } else {
      categoryTotals.other += cost;
    }
    nonContingencySum += cost;

    if (item.actualCost !== undefined && !isNaN(item.actualCost)) {
      totalActual += Math.max(0, item.actualCost);
    } else if (item.isPaid) {
      totalActual += cost;
    }
  }

  const contingencyAmount = Math.round(safeBudget * safeContingencyRate);
  categoryTotals.contingency = contingencyAmount;

  const totalEstimated = nonContingencySum + contingencyAmount;
  const remainingBalance = safeBudget - totalEstimated;
  const utilizationPercentage = safeBudget > 0
    ? Math.round((totalEstimated / safeBudget) * 1000) / 10
    : 0;
  const isOverBudget = totalEstimated > safeBudget;

  const safeGuestCount = Math.max(1, isNaN(count) ? 1 : count);
  const perGuestCost = Math.round(totalEstimated / safeGuestCount);
  const variance = safeBudget - totalActual;
  const isActualOverBudget = totalActual > safeBudget;

  return {
    totalBudget: safeBudget,
    totalEstimated,
    remainingBalance,
    utilizationPercentage,
    isOverBudget,
    contingencyAmount,
    categoryTotals,
    perGuestCost,
    totalActual,
    variance,
    isActualOverBudget,
  };
}
