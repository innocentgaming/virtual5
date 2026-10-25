import type {
  EventPlan,
  BudgetSummary,
  DecisionInsight,
  BudgetCategory,
  TaskItem,
} from '../types/event';
import { formatCurrency } from '../utils/formatters';

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
  > & { guests?: EventPlan['guests'] },
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

  if (summary.isOverBudget) {
    const overage = Math.abs(summary.remainingBalance);
    insights.push({
      id: 'rule-budget-exceeded',
      type: 'warning',
      category: 'budget',
      title: 'Estimated Expenses Exceed Budget',
      message: `Projected costs exceed your allocated budget by ${formatCurrency(overage)} (${summary.utilizationPercentage}% utilized). Consider switching plated meals to a buffet, reducing custom floral installations, or choosing digital invitations to recover approximately ${formatCurrency(Math.round(overage * 0.7))}.`,
      actionLabel: 'Review Cost Reductions',
      actionType: 'NAVIGATE_BUDGET',
    });
  } else if (summary.remainingBalance > summary.totalBudget * 0.25 && summary.totalBudget > 0) {
    insights.push({
      id: 'rule-budget-surplus',
      type: 'positive',
      category: 'budget',
      title: 'Healthy Budget Buffer Available',
      message: `You have ${formatCurrency(summary.remainingBalance)} (unallocated funds). You can upgrade photography packages, enhance guest transport, or keep this as an extra cushion.`,
    });
  }

  // Vendor Cost Escalation & Chaos Trade-off Rule
  const costSpikeItems = plan.budgetItems.filter(
    (item) => item.actualCost !== undefined && item.actualCost > item.estimatedCost
  );
  if (costSpikeItems.length > 0) {
    const totalSpike = costSpikeItems.reduce(
      (sum, item) => sum + ((item.actualCost || 0) - item.estimatedCost),
      0
    );
    const itemNames = costSpikeItems.map((i) => i.name).join(', ');
    const decorItem = plan.budgetItems.find((b) => b.category === 'decor');
    const decorCut = decorItem ? Math.round(decorItem.estimatedCost * 0.35) : Math.round(totalSpike * 0.5);
    const guestCut = Math.max(5, Math.ceil(totalSpike / Math.max(500, summary.perGuestCost)));

    insights.push({
      id: 'rule-vendor-cost-spike',
      type: 'warning',
      category: 'budget',
      title: 'Vendor Cost Escalation & Trade-off Required',
      message: `Actual vendor quotes (${itemNames}) increased expenses by ${formatCurrency(totalSpike)}. Dynamic Decision Tradeoff: Trim decoration budget by ${formatCurrency(decorCut)} to offset the price spike, or reduce guest headcount by ~${guestCut} attendees to maintain per-guest cost.`,
      actionLabel: 'Resolve Budget Trade-off',
      actionType: 'NAVIGATE_BUDGET',
    });
  }

  if (plan.eventDate) {
    const targetDate = new Date(plan.eventDate);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      insights.push({
        id: 'rule-date-past',
        type: 'action_required',
        category: 'timeline',
        title: 'Event Date Has Passed',
        message: `The selected event date (${plan.eventDate}) is in the past. Update the date to generate an active upcoming preparation timeline.`,
      });
    } else if (diffDays <= 14) {
      insights.push({
        id: 'rule-date-urgent',
        type: 'action_required',
        category: 'timeline',
        title: 'Short-Notice / Urgent Triage (< 14 Days)',
        message: `Your event is in ${diffDays} days! Critical path lock-in: prioritize venue contract confirmation, finalize headcount with caterer immediately, and avoid custom fabrication or shipping delays.`,
        actionLabel: 'View Urgent Tasks',
        actionType: 'NAVIGATE_TIMELINE_URGENT',
      });
    } else if (diffDays <= 30) {
      insights.push({
        id: 'rule-date-approaching',
        type: 'warning',
        category: 'timeline',
        title: 'Event Approaching (< 1 Month)',
        message: `Only ${diffDays} days remaining. Focus on seating charts, final vendor confirmations, and collecting outstanding RSVPs.`,
      });
    }
  }

  const outdoorVenues = ['outdoor', 'garden_park', 'beach', 'rooftop'];
  if (outdoorVenues.includes(plan.venuePreference)) {
    insights.push({
      id: 'rule-outdoor-weather',
      type: 'suggestion',
      category: 'weather',
      title: 'Outdoor Venue Weather Contingency Needed',
      message:
        'Your selected venue is outdoors. We recommend reserving an indoor hall backup, renting a canopy/marquee tent with rain sidewalls, and securing portable patio heaters or misting fans depending on the season. (Note: Plan in advance; vendor tents sell out quickly during peak seasons).',
    });
  }

  if (plan.guestCount > 250) {
    insights.push({
      id: 'rule-large-capacity',
      type: 'warning',
      category: 'capacity',
      title: 'High Guest Count Logistics (> 250 Guests)',
      message: `With ${plan.guestCount} guests, ensure the venue has adequate parking capacity, multiple bar/buffet stations to prevent bottlenecks, and adequate restroom facilities or luxury restroom trailers.`,
    });
  } else if (plan.guestCount > 0 && plan.totalBudget > 0) {
    const perGuestBudget = plan.totalBudget / plan.guestCount;
    const tightThreshold = 500; // ₹500 per guest threshold in EventWise India
    if (perGuestBudget < tightThreshold) {
      insights.push({
        id: 'rule-per-guest-low',
        type: 'warning',
        category: 'budget',
        title: `Tight Per-Guest Budget (${formatCurrency(Math.round(perGuestBudget))}/person)`,
        message: `Your overall budget averages under ${formatCurrency(tightThreshold)} per guest. Buffet catering, community halls, and streamlined menu selections will be essential to stay on target.`,
      });
    }
  }

  // Baraat and outdoor music curfew rule for Indian events
  if (plan.eventType === 'wedding' || plan.priorities?.includes('entertainment')) {
    insights.push({
      id: 'rule-baraat-curfew',
      type: 'suggestion',
      category: 'timeline',
      title: 'Baraat & Outdoor Sound Curfew (10:00 PM)',
      message: 'Indian municipal guidelines enforce a strict 10:00 PM cutoff for outdoor amplified sound, dhol processions, and brass bands. Transition the dance floor indoors for late-night Sangeet or post-Pheras festivities.',
    });
  }

  if (plan.accessibilityNeeds && plan.accessibilityNeeds.length > 0) {
    insights.push({
      id: 'rule-accessibility-integration',
      type: 'action_required',
      category: 'accessibility',
      title: 'Accessibility Considerations Active',
      message: `Configured accessibility needs (${plan.accessibilityNeeds.join(
        ', '
      )}): Ensure step-free entrance, wheelchair-accessible restrooms, designated companion seating, and clear dietary signage at all food stations.`,
    });
  }

  // RSVP Capacity & Dietary checks - single pass over guests
  if (plan.guests && plan.guests.length > 0) {
    let confirmedCount = 0;
    let dietaryCount = 0;
    let jainOrPureVegCount = 0;

    for (const g of plan.guests) {
      if (g.rsvpStatus === 'attending') {
        confirmedCount += g.plusOne ? 2 : 1;
        if (g.dietary && g.dietary !== 'none') {
          dietaryCount++;
        }
        if (g.dietary === 'jain' || g.dietary === 'pure_veg') {
          jainOrPureVegCount++;
        }
      }
    }

    if (confirmedCount > plan.guestCount) {
      insights.push({
        id: 'rule-rsvp-capacity-exceeded',
        type: 'warning',
        category: 'capacity',
        title: 'RSVP Headcount Exceeds Planned Capacity',
        message: `${confirmedCount} confirmed attendees exceed your target headcount of ${plan.guestCount}. Recalculate catering portions, table rentals, and venue fire marshal capacity.`,
        actionLabel: 'Review Guest List',
        actionType: 'NAVIGATE_GUESTS',
      });
    }

    if (dietaryCount > 0) {
      insights.push({
        id: 'rule-dietary-alert',
        type: 'suggestion',
        category: 'accessibility',
        title: 'Special Dietary Requirements Noted',
        message: `${dietaryCount} confirmed guests have specific dietary needs. Confirm personalized meal plate tags with your caterer 14 days prior to the event.`,
      });
    }

    if (jainOrPureVegCount > 0) {
      insights.push({
        id: 'rule-jain-dietary-counter',
        type: 'action_required',
        category: 'accessibility',
        title: 'Dedicated Pure Veg / Jain Kitchen Counter Required',
        message: `${jainOrPureVegCount} guests require Jain (no onion/garlic/root veg) or Sattvic Pure Vegetarian preparation. Ensure your caterer sets up an isolated preparation counter, distinct serving ladles, and clear signage.`,
      });
    }
  }

  return { insights, missingPrompts };
}

export function auditTimelineTasks(
  tasks: TaskItem[],
  currentDateStr?: string
): {
  overdueCount: number;
  upcomingCount: number;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  tasksWithStatus: (TaskItem & { isOverdue: boolean })[];
} {
  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  let overdueCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;

  const tasksWithStatus = tasks.map((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

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
    tasksWithStatus,
  };
}
