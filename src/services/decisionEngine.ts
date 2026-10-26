import type {
  EventPlan,
  BudgetSummary,
  DecisionInsight,
  BudgetCategory,
  TaskItem,
} from '../types/event';
import { RULES_CONFIG } from '../constants/rulesConfig';
import { DECISION_RULES_REGISTRY } from './rulesRegistry';


/**
 * Pure calculation engine for Indian Rupee event budgets, category distributions,
 * contingency reserves, per-guest allocations, and contract-vs-actual variance.
 *
 * @param totalBudget - Total planned budget in Indian Rupees (INR)
 * @param items - List of budget items and vendor contracts
 * @param contingencyRate - Percentage reserved for contingencies (default 0.10, max 0.50)
 * @param guestCount - Total expected attendees for per-guest cost derivation
 * @returns Complete calculated BudgetSummary
 */
export function calculateBudgetSummary(
  totalBudget: number,
  items: EventPlan['budgetItems'],
  contingencyRate: number = 0.10,
  guestCount: number = 1
): BudgetSummary {
  const safeBudget = Math.max(0, isNaN(totalBudget) ? 0 : totalBudget);
  const safeContingencyRate = Math.max(0, Math.min(0.5, isNaN(contingencyRate) ? 0.10 : contingencyRate));

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

  for (const item of items) {
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

  const safeGuestCount = Math.max(1, isNaN(guestCount) ? 1 : guestCount);
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

export interface BlockedTaskAudit {
  blockedTaskId: string;
  blockedTaskTitle: string;
  prerequisiteId: string;
  prerequisiteTitle: string;
}

/**
 * Detects tasks that are blocked because a prerequisite task is overdue and incomplete.
 */
export function detectBlockedTasks(tasks: TaskItem[], currentDateStr?: string): BlockedTaskAudit[] {
  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const blockedList: BlockedTaskAudit[] = [];

  for (const task of tasks) {
    if (task.completed || !task.dependencies || task.dependencies.length === 0) continue;

    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId);
      if (depTask && !depTask.completed) {
        const depDate = new Date(depTask.dueDate);
        depDate.setHours(0, 0, 0, 0);
        // If prerequisite is overdue or due on/after the dependent task
        if (depDate.getTime() < now.getTime() || depDate.getTime() >= new Date(task.dueDate).getTime()) {
          blockedList.push({
            blockedTaskId: task.id,
            blockedTaskTitle: task.title,
            prerequisiteId: depTask.id,
            prerequisiteTitle: depTask.title,
          });
        }
      }
    }
  }

  return blockedList;
}

/**
 * Recomputes task due dates when an event date shifts earlier or later.
 * Compresses timelines during short-notice windows (<14 or <21 days) and respects task dependencies.
 */
export function repaceTimelineTasks(
  tasks: TaskItem[],
  oldDateStr: string,
  newDateStr: string,
  currentDateStr?: string
): TaskItem[] {
  if (!tasks || tasks.length === 0) return [];

  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const targetDate = new Date(newDateStr);
  targetDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const oldTargetDate = new Date(oldDateStr);
  oldTargetDate.setHours(0, 0, 0, 0);

  return tasks.map((task) => {
    // Keep already completed tasks on their historical completion date
    if (task.completed) {
      return task;
    }

    // Past or today event: clamp all to today
    if (daysRemaining <= 0) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
    }

    // Short-notice triage window (< 14 days) - compress by priority
    if (daysRemaining <= 14) {
      let offsetDaysFromNow = 1;
      if (task.priority === 'urgent') offsetDaysFromNow = Math.min(daysRemaining, 2);
      else if (task.priority === 'high') offsetDaysFromNow = Math.min(daysRemaining, Math.max(2, Math.round(daysRemaining * 0.4)));
      else if (task.priority === 'medium') offsetDaysFromNow = Math.min(daysRemaining, Math.max(3, Math.round(daysRemaining * 0.7)));
      else offsetDaysFromNow = Math.min(daysRemaining, Math.max(4, Math.round(daysRemaining * 0.9)));

      const newDate = new Date(now.getTime() + offsetDaysFromNow * 86400000);
      const yyyy = newDate.getFullYear();
      const mm = String(newDate.getMonth() + 1).padStart(2, '0');
      const dd = String(newDate.getDate()).padStart(2, '0');
      return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
    }

    // Standard proportional re-pacing
    const taskCurrentDate = new Date(task.dueDate);
    taskCurrentDate.setHours(0, 0, 0, 0);
    const oldLeadDays = Math.max(0, Math.round((oldTargetDate.getTime() - taskCurrentDate.getTime()) / 86400000));
    const oldTotalSpan = Math.max(1, Math.round((oldTargetDate.getTime() - now.getTime()) / 86400000));
    const ratio = Math.max(0.05, Math.min(1.0, oldLeadDays / oldTotalSpan));

    const newLeadDays = Math.max(1, Math.round(daysRemaining * ratio));
    const computedTaskDate = new Date(targetDate.getTime() - newLeadDays * 86400000);

    // Ensure due date is not in the past relative to now
    if (computedTaskDate.getTime() < now.getTime()) {
      computedTaskDate.setTime(now.getTime());
    }

    const yyyy = computedTaskDate.getFullYear();
    const mm = String(computedTaskDate.getMonth() + 1).padStart(2, '0');
    const dd = String(computedTaskDate.getDate()).padStart(2, '0');
    return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
  });
}

/**
 * Deterministic, side-effect free decision engine evaluating 12 culturally tailored
 * rules across Indian wedding, birthday, and festival planning constraints.
 * Iterates over the modular Rules Registry and returns actionable insights and trade-offs.
 *
 * @param plan - Event plan parameters (budget, guests, vendors, venue, dates)
 * @param currentDateStr - Optional ISO date string for deterministic testing
 * @returns Object containing evaluated DecisionInsights and missing prompt cues
 */
export function evaluateDecisionRules(
  plan: Pick<
    EventPlan,
    | 'eventType'
    | 'totalBudget'
    | 'budgetItems'
    | 'contingencyRate'
    | 'eventDate'
    | 'guestCount'
    | 'venuePreference'
    | 'foodPreference'
    | 'accessibilityNeeds'
    | 'priorities'
    | 'city'
    | 'tasks'
  > & {
    guests?: EventPlan['guests'];
    vendors?: EventPlan['vendors'];
  },
  currentDateStr?: string
): { insights: DecisionInsight[]; missingPrompts: string[] } {
  const insights: DecisionInsight[] = [];
  const missingPrompts: string[] = [];

  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  const summary = calculateBudgetSummary(plan.totalBudget, plan.budgetItems, plan.contingencyRate, plan.guestCount);

  if (!plan.totalBudget || plan.totalBudget <= 0) {
    missingPrompts.push('What is your approximate overall budget? We used a baseline estimate.');
  }
  if (!plan.guestCount || plan.guestCount <= 0) {
    missingPrompts.push('How many guests are you expecting? (Per-person costs depend on this)');
  }
  if (!plan.city || plan.city.trim() === '') {
    missingPrompts.push('Which city or region will this event take place in?');
  }
  if (!plan.eventDate) {
    missingPrompts.push('When is your target event date? This is required for timeline milestones.');
  }

  // Evaluate modular rules from the pure Rules Registry
  for (const rule of DECISION_RULES_REGISTRY) {
    const res = rule.evaluate(plan, summary, now, currentDateStr);
    if (!res) continue;
    if (Array.isArray(res)) {
      insights.push(...res);
    } else {
      insights.push(res);
    }
  }

  return { insights, missingPrompts };
}

export const TOTAL_DECISION_RULES_COUNT = RULES_CONFIG.TOTAL_RULES_COUNT;
export { DECISION_RULES_REGISTRY };

/**
 * Audits a collection of timeline tasks against the current date to identify
 * overdue items, completion velocity, and dependency-blocked milestones.
 *
 * @param tasks - Array of task milestones
 * @param currentDateStr - Optional ISO reference date
 * @returns Status breakdown with overdue flags and blocking prerequisite names
 */
export function auditTimelineTasks(
  tasks: TaskItem[],
  currentDateStr?: string
): {
  overdueCount: number;
  upcomingCount: number;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  blockedCount: number;
  tasksWithStatus: (TaskItem & { isOverdue: boolean; isBlocked?: boolean; blockedByNames?: string[] })[];
} {
  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  let overdueCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;
  let blockedCount = 0;

  const tasksWithStatus = tasks.map((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

    // Check if blocked by uncompleted prerequisite
    const blockedByNames: string[] = [];
    if (!task.completed && task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const dep = taskMap.get(depId);
        if (dep && !dep.completed) {
          const depDate = new Date(dep.dueDate);
          depDate.setHours(0, 0, 0, 0);
          if (depDate.getTime() < now.getTime() || depDate.getTime() >= taskDate.getTime()) {
            blockedByNames.push(dep.title);
          }
        }
      }
    }

    const isBlocked = blockedByNames.length > 0;
    if (isBlocked) {
      blockedCount++;
    }

    if (task.completed) {
      completedCount++;
    } else if (isOverdue) {
      overdueCount++;
    } else {
      upcomingCount++;
    }

    return {
      ...task,
      isOverdue,
      isBlocked,
      blockedByNames: blockedByNames.length > 0 ? blockedByNames : undefined,
    };
  });

  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    overdueCount,
    upcomingCount,
    completedCount,
    totalCount,
    progressPercentage,
    blockedCount,
    tasksWithStatus,
  };
}
