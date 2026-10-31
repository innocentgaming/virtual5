import type {
  DecisionInsight,
} from '../types/event';
import { RULES_CONFIG } from '../constants/rulesConfig';
import { DECISION_RULES_REGISTRY, type DecisionEnginePlanInput } from './rulesRegistry';
import { calculateBudgetSummary } from './budgetCalculator';

export { calculateBudgetSummary } from './budgetCalculator';
export {
  detectBlockedTasks,
  repaceTimelineTasks,
  auditTimelineTasks,
  type BlockedTaskAudit,
} from './timelineResolver';

export const TOTAL_DECISION_RULES_COUNT = RULES_CONFIG.TOTAL_RULES_COUNT;
export { DECISION_RULES_REGISTRY };

/**
 * Deterministic, side-effect free decision engine evaluating 12 culturally tailored
 * rules across Indian wedding, birthday, and festival planning constraints.
 * Iterates over the modular Rules Registry and returns actionable insights and trade-offs.
 *
 * @param plan - Event plan parameters (budget, guests, vendors, venue, dates)
 * @param currentDateStr - Optional ISO reference date string (YYYY-MM-DD)
 * @returns Object with evaluated insights array and missing prompts
 */
export function evaluateDecisionRules(
  plan: DecisionEnginePlanInput,
  currentDateStr?: string
): {
  insights: DecisionInsight[];
  missingPrompts: string[];
} {
  const currentDate = currentDateStr || new Date().toISOString().split('T')[0];
  const summary = calculateBudgetSummary(
    plan.totalBudget,
    plan.budgetItems,
    plan.contingencyRate,
    plan.guestCount
  );
  const now = new Date(currentDate);
  const insights: DecisionInsight[] = [];
  const missingPrompts: string[] = [];

  // Evaluate modular rules from the pure Rules Registry
  for (const rule of DECISION_RULES_REGISTRY) {
    try {
      const res = rule.evaluate(plan, summary, now, currentDateStr);
      if (!res) continue;
      if (Array.isArray(res)) {
        insights.push(...res);
      } else {
        insights.push(res);
      }
    } catch {
      // Resilience: skip errored rule gracefully
    }
  }

  // Missing info prompts derivation
  if (!plan.totalBudget || plan.totalBudget <= 0) {
    missingPrompts.push('What is your approximate overall budget? We used a baseline estimate.');
  }

  if (!plan.guestCount || plan.guestCount <= 0) {
    missingPrompts.push('How many guests are you expecting? (Per-person costs depend on this)');
  }

  if (!plan.city || plan.city.trim() === '') {
    missingPrompts.push('Which city or region will this event take place in?');
  }

  if (!plan.eventDate || plan.eventDate.trim() === '') {
    missingPrompts.push('When is your target event date? This is required for timeline milestones.');
  }

  return { insights, missingPrompts };
}
