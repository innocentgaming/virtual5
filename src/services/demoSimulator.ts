import type { BudgetSummary, DecisionInsight, EventPlan } from '../types/event';
import { calculateBudgetSummary, evaluateDecisionRules } from './decisionEngine';

/**
 * Pure what-if simulator used by the landing-page demo window.
 * It mirrors the scenario maths in useEventPlan (price spike, guest delta, date shift,
 * venue change) but never touches storage, so it is safe to run on shared sample plans.
 */

export type DemoScenarioId = 'caterer' | 'guests' | 'rain' | 'date';

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  caption: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'caterer',
    label: 'Caterer raises price 20%',
    caption: 'The caterer sends a revised quote. Budget, per-guest cost and warnings recalculate.',
  },
  {
    id: 'guests',
    label: '30 more guests say yes',
    caption: 'Per-guest items scale with the headcount, and capacity rules re-check the venue.',
  },
  {
    id: 'rain',
    label: 'Rain on the outdoor day',
    caption: 'The plan moves to a lawn venue and picks up the cost of a waterproof pandal.',
  },
  {
    id: 'date',
    label: 'Date pulled forward to 10 days away',
    caption: 'The timeline is re-paced and short-notice triage rules switch on.',
  },
];

const DAY_MS = 86_400_000;

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function applyDemoScenario(plan: EventPlan, id: DemoScenarioId, now: Date = new Date()): EventPlan {
  switch (id) {
    case 'caterer': {
      return {
        ...plan,
        budgetItems: plan.budgetItems.map((item) => {
          if (item.category !== 'catering') return item;
          const spike = Math.round(item.estimatedCost * 0.2);
          return { ...item, actualCost: (item.actualCost ?? item.estimatedCost) + spike };
        }),
      };
    }
    case 'guests': {
      const next = plan.guestCount + 30;
      const ratio = next / Math.max(1, plan.guestCount);
      return {
        ...plan,
        guestCount: next,
        budgetItems: plan.budgetItems.map((item) =>
          item.isPerGuest ? { ...item, estimatedCost: Math.round(item.estimatedCost * ratio) } : item,
        ),
      };
    }
    case 'rain': {
      const tent = {
        id: 'demo-pandal',
        name: 'Waterproof pandal and flooring',
        category: 'logistics' as const,
        estimatedCost: Math.round(plan.totalBudget * 0.04),
        priority: 'essential' as const,
      };
      return {
        ...plan,
        venuePreference: 'farmhouse_lawn',
        budgetItems: [...plan.budgetItems, tent],
      };
    }
    case 'date': {
      return { ...plan, eventDate: toIsoDate(new Date(now.getTime() + 10 * DAY_MS)) };
    }
  }
}

export interface DemoSnapshot {
  summary: BudgetSummary;
  /** Estimated spend plus any quote overruns (actual above estimate) */
  projectedTotal: number;
  overrun: number;
  insights: DecisionInsight[];
}

export function snapshotPlan(plan: EventPlan, now: Date = new Date()): DemoSnapshot {
  const summary = calculateBudgetSummary(plan.totalBudget, plan.budgetItems, plan.contingencyRate, plan.guestCount);
  const overrun = plan.budgetItems.reduce((sum, item) => {
    if (item.category === 'contingency' || item.actualCost === undefined) return sum;
    return sum + Math.max(0, item.actualCost - item.estimatedCost);
  }, 0);
  const { insights } = evaluateDecisionRules(plan, toIsoDate(now));
  return { summary, projectedTotal: summary.totalEstimated + overrun, overrun, insights };
}

export function applyAll(plan: EventPlan, ids: DemoScenarioId[], now: Date = new Date()): EventPlan {
  return ids.reduce((acc, id) => applyDemoScenario(acc, id, now), plan);
}
