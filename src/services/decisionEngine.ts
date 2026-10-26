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

import type { TradeOffOption } from '../types/event';

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

  // -------------------------------------------------------------------------
  // RULE 1: Over-Budget Detection & Concrete Trade-offs
  // -------------------------------------------------------------------------
  if (summary.isOverBudget) {
    const overage = Math.abs(summary.remainingBalance);
    const cateringItem = plan.budgetItems.find((b) => b.category === 'catering' && b.estimatedCost > 0);
    const topDiscretionary = [...plan.budgetItems]
      .filter((b) => b.category !== 'venue' && b.category !== 'contingency' && b.estimatedCost > 0)
      .sort((a, b) => b.estimatedCost - a.estimatedCost)[0];

    const cateringSavings = cateringItem ? Math.round(cateringItem.estimatedCost * 0.18) : Math.round(overage * 0.5);
    const guestsToTrim = Math.max(3, Math.ceil(overage / Math.max(500, summary.perGuestCost)));

    const tradeOffs: TradeOffOption[] = [];

    if (topDiscretionary) {
      tradeOffs.push({
        id: 'to-trim-discretionary',
        label: `Trim ${topDiscretionary.name}`,
        description: `Reduce ${topDiscretionary.name} allocation by ${formatCurrency(Math.min(topDiscretionary.estimatedCost, overage))} to absorb overrun`,
        impactRupees: Math.min(topDiscretionary.estimatedCost, overage),
        impactFormatted: `Saves ${formatCurrency(Math.min(topDiscretionary.estimatedCost, overage))}`,
        actionType: 'reduce_budget_item',
        payload: { itemId: topDiscretionary.id, amount: Math.min(topDiscretionary.estimatedCost, overage) },
      });
    }

    if (cateringItem) {
      tradeOffs.push({
        id: 'to-switch-buffet',
        label: 'Switch to Live Buffet / Thali Spread',
        description: `Transition to self-service action stations, saving ~18% (${formatCurrency(cateringSavings)}) in banqueting labor`,
        impactRupees: cateringSavings,
        impactFormatted: `Saves ${formatCurrency(cateringSavings)}`,
        actionType: 'reduce_budget_item',
        payload: { itemId: cateringItem.id, amount: cateringSavings },
      });
    }

    tradeOffs.push({
      id: 'to-trim-headcount',
      label: `Reduce Headcount Target by ~${guestsToTrim} Guests`,
      description: `Adjust guest target to balance per-person allocation and save ~${formatCurrency(overage)}`,
      impactRupees: overage,
      impactFormatted: `Balances ${formatCurrency(overage)}`,
      actionType: 'adjust_guest_count',
      payload: { newGuestCount: Math.max(10, plan.guestCount - guestsToTrim) },
    });

    insights.push({
      id: 'rule-budget-exceeded',
      type: 'warning',
      category: 'budget',
      title: 'Estimated Expenses Exceed Budget',
      message: `Projected costs exceed your allocated budget by ${formatCurrency(overage)} (${summary.utilizationPercentage}% utilized). Consider switching plated meals to a buffet, reducing custom floral installations, or choosing digital invitations to recover approximately ${formatCurrency(Math.round(overage * 0.7))}.`,
      actionLabel: 'Review Cost Reductions',
      actionType: 'NAVIGATE_BUDGET',
      tradeOffs,
      ruleId: 'RULE_1_BUDGET_OVERRUN',
      ruleName: 'Budget Overrun & Expense Ceiling',
      whyExplanation: 'Total projected expenses exceeded your allocated event budget. Overages require rebalancing across non-essential categories or guest headcount.',
      thresholdMet: `Projected expenses (${formatCurrency(summary.totalEstimated)}) exceed budget (${formatCurrency(summary.totalBudget)}) by ${formatCurrency(overage)} (${summary.utilizationPercentage}% utilized).`,
    });
  } else if (summary.remainingBalance > summary.totalBudget * 0.25 && summary.totalBudget > 0) {
    insights.push({
      id: 'rule-budget-surplus',
      type: 'positive',
      category: 'budget',
      title: 'Healthy Budget Buffer Available',
      message: `You have ${formatCurrency(summary.remainingBalance)} (unallocated funds). You can upgrade photography packages, enhance guest transport, or keep this as an extra cushion.`,
      ruleId: 'RULE_1B_BUDGET_SURPLUS',
      ruleName: 'Budget Buffer & Unallocated Surplus',
      whyExplanation: 'Unallocated funds provide financial protection against last-minute vendor price increases and emergency spot contracting.',
      thresholdMet: `Remaining surplus (${formatCurrency(summary.remainingBalance)}) is > 25% of total budget (${formatCurrency(summary.totalBudget)}).`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 2: Vendor Cost Escalation & Chaos Trade-offs
  // -------------------------------------------------------------------------
  const costSpikeItems = plan.budgetItems.filter(
    (item) => item.actualCost !== undefined && item.actualCost > item.estimatedCost
  );
  if (costSpikeItems.length > 0) {
    const totalSpike = costSpikeItems.reduce(
      (sum, item) => sum + ((item.actualCost || 0) - item.estimatedCost),
      0
    );
    const itemNames = costSpikeItems.map((i) => i.name).join(', ');
    const decorItem = plan.budgetItems.find((b) => b.category === 'decor' && b.estimatedCost > 0);
    const decorCut = decorItem ? Math.min(decorItem.estimatedCost, Math.round(totalSpike)) : Math.round(totalSpike * 0.5);
    const guestCut = Math.max(3, Math.ceil(totalSpike / Math.max(500, summary.perGuestCost)));

    const spikeTradeOffs: TradeOffOption[] = [];

    if (decorItem) {
      spikeTradeOffs.push({
        id: 'to-spike-decor',
        label: `Trim Decor by ${formatCurrency(decorCut)}`,
        description: `Offset the ${formatCurrency(totalSpike)} vendor price hike by downsizing non-essential floral arches`,
        impactRupees: decorCut,
        impactFormatted: `Saves ${formatCurrency(decorCut)}`,
        actionType: 'reduce_budget_item',
        payload: { itemId: decorItem.id, amount: decorCut },
      });
    }

    spikeTradeOffs.push({
      id: 'to-spike-guests',
      label: `Reduce Guest Target by ~${guestCut} Attendees`,
      description: `Keep overall expenditure flat by scaling attendee count by ~${guestCut}`,
      impactRupees: guestCut * summary.perGuestCost,
      impactFormatted: `Saves ~${formatCurrency(guestCut * summary.perGuestCost)}`,
      actionType: 'adjust_guest_count',
      payload: { newGuestCount: Math.max(10, plan.guestCount - guestCut) },
    });

    spikeTradeOffs.push({
      id: 'to-spike-contingency',
      label: 'Absorb Spike via Contingency Buffer',
      description: `Keep all line items intact and authorize ${formatCurrency(totalSpike)} withdrawal from contingency reserve`,
      impactRupees: 0,
      impactFormatted: `Absorbs ${formatCurrency(totalSpike)}`,
      actionType: 'increase_budget',
      payload: { amount: 0, note: 'Spike absorbed by contingency' },
    });

    insights.push({
      id: 'rule-vendor-cost-spike',
      type: 'warning',
      category: 'budget',
      title: 'Vendor Cost Escalation & Trade-off Required',
      message: `Actual vendor quotes (${itemNames}) increased expenses by ${formatCurrency(totalSpike)}. Dynamic Decision Tradeoff: Trim decoration budget by ${formatCurrency(decorCut)} to offset the price spike, or reduce guest headcount by ~${guestCut} attendees to maintain per-guest cost.`,
      actionLabel: 'Resolve Budget Trade-off',
      actionType: 'NAVIGATE_BUDGET',
      tradeOffs: spikeTradeOffs,
      ruleId: 'RULE_2_VENDOR_SPIKE',
      ruleName: 'Vendor Quote Escalation & Price Spike',
      whyExplanation: 'Contracted vendor actuals exceeded initial budgetary estimates, threatening overall cost discipline unless counterbalanced.',
      thresholdMet: `Vendor quotes (${itemNames}) escalated by ${formatCurrency(totalSpike)} over original allocation.`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 3: Vendor Cancellation & Dropout
  // -------------------------------------------------------------------------
  const cancelledVendors = plan.vendors?.filter((v) => v.status === 'cancelled') || [];
  if (cancelledVendors.length > 0) {
    for (const v of cancelledVendors) {
      const cancelTradeOffs: TradeOffOption[] = [
        {
          id: `to-reopen-${v.id}`,
          label: `Re-open ${v.role} (Shortlisted)`,
          description: `Reset vendor status to Shortlisted and add 48-Hour Emergency Outreach milestone`,
          impactRupees: 0,
          impactFormatted: 'Expedited replacement',
          actionType: 'update_vendor_status',
          payload: { vendorId: v.id, status: 'shortlisted' },
        },
        {
          id: `to-reallocate-${v.id}`,
          label: `Reallocate ${formatCurrency(v.estimatedCost)} Allocation`,
          description: `Park ${formatCurrency(v.estimatedCost)} into contingency reserve for emergency spot booking`,
          impactRupees: v.estimatedCost,
          impactFormatted: `Protects ${formatCurrency(v.estimatedCost)}`,
          actionType: 'reduce_budget_item',
          payload: { category: v.category, amount: v.estimatedCost },
        },
      ];

        insights.push({
        id: `rule-vendor-cancelled-${v.id}`,
        type: 'action_required',
        category: 'vendors',
        title: `Vendor Cancelled: ${v.role}`,
        message: `${v.role} has been cancelled or marked unavailable. Immediately initiate backup interviews or reallocate funds for spot vendor contracting.`,
        actionLabel: 'Handle Replacement',
        actionType: 'NAVIGATE_VENDORS',
        tradeOffs: cancelTradeOffs,
        ruleId: 'RULE_3_VENDOR_CANCELLED',
        ruleName: 'Emergency Vendor Drop-out & Reallocation',
        whyExplanation: 'A contracted vendor became unavailable, creating an immediate service vacuum and risk of spot-rate surge.',
        thresholdMet: `Vendor status for ${v.role} marked as 'cancelled'.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 4: Timeline Urgency, Short-Notice Triage & Date Shifting
  // -------------------------------------------------------------------------
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
        ruleId: 'RULE_4_DATE_PAST',
        ruleName: 'Past Date Anomaly',
        whyExplanation: 'Milestones cannot be scheduled chronologically for events whose target calendar date has already elapsed.',
        thresholdMet: `Target date (${plan.eventDate}) is ${Math.abs(diffDays)} days in the past.`,
      });
    } else if (diffDays <= 14) {
      const urgentTradeOffs: TradeOffOption[] = [
        {
          id: 'to-repace-urgent',
          label: `Re-pace Milestones for ${diffDays}-Day Fast Track`,
          description: 'Compress remaining tasks into 24–72 hour sprint blocks with realistic deadlines',
          impactRupees: 0,
          impactFormatted: `Re-paces ${plan.tasks.length} tasks`,
          actionType: 'repace_timeline',
          payload: { newDate: plan.eventDate },
        },
        {
          id: 'to-critical-path-lock',
          label: 'Lock Essential Tasks Only (Waive Low-Priority)',
          description: 'Add coordinator milestone to waive custom fabrication and prioritize venue/catering lock-in',
          impactRupees: 0,
          impactFormatted: 'Focuses critical path',
          actionType: 'add_task',
          payload: {
            title: '48-Hour Critical Path Lock-in with Venue & Caterer Leads',
            category: 'final',
            priority: 'urgent',
            notes: 'Freeze guest count, confirm power backup, and verify sound setup.',
          },
        },
      ];

      insights.push({
        id: 'rule-date-urgent',
        type: 'action_required',
        category: 'timeline',
        title: 'Short-Notice / Urgent Triage (< 14 Days)',
        message: `Your event is in ${diffDays} days! Critical path lock-in: prioritize venue contract confirmation, finalize headcount with caterer immediately, and avoid custom fabrication or shipping delays.`,
        actionLabel: 'View Urgent Tasks',
        actionType: 'NAVIGATE_TIMELINE_URGENT',
        tradeOffs: urgentTradeOffs,
        ruleId: 'RULE_4_DATE_TRIAGE',
        ruleName: 'Short-Notice Fast Track Triage (< 14 Days)',
        whyExplanation: 'Standard fabrication and vendor booking lead times are exhausted under short notice. Only the critical path must be prioritized.',
        thresholdMet: `Only ${diffDays} days remaining to event (${plan.eventDate}), entering the < 14 days emergency window.`,
      });
    } else if (diffDays <= 30) {
      insights.push({
        id: 'rule-date-approaching',
        type: 'warning',
        category: 'timeline',
        title: 'Event Approaching (< 1 Month)',
        message: `Only ${diffDays} days remaining. Focus on seating charts, final vendor confirmations, and collecting outstanding RSVPs.`,
        ruleId: 'RULE_4B_DATE_APPROACHING',
        ruleName: 'Approaching Event Milestone (< 30 Days)',
        whyExplanation: 'The 30-day window triggers final RSVP collections, priest puja samagri checks, and vendor balance schedules.',
        thresholdMet: `${diffDays} days remaining (< 30 days window).`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 5: Outdoor Weather Risk & Contingency
  // -------------------------------------------------------------------------
  const outdoorVenues = ['outdoor', 'garden_park', 'beach', 'rooftop', 'farmhouse_lawn', 'resort_lawn'];
  if (outdoorVenues.includes(plan.venuePreference)) {
    const weatherCost = Math.max(25000, Math.round(plan.totalBudget * 0.03));
    const weatherTradeOffs: TradeOffOption[] = [
      {
        id: 'to-add-canopy',
        label: `Add Waterproof Pandal & Canopy (${formatCurrency(weatherCost)})`,
        description: 'Reserve waterproof monsoon pandal, rain sidewalls, and misting fans from contingency',
        impactRupees: -weatherCost,
        impactFormatted: `Adds ${formatCurrency(weatherCost)} item`,
        actionType: 'add_budget_item',
        payload: {
          name: 'Waterproof Pandal & Weather Canopy (Rain/Sun Guard)',
          category: 'decor',
          estimatedCost: weatherCost,
          priority: 'essential',
          notes: 'Guarantees outdoor ceremony continues uninterrupted under sudden rains or intense sun.',
        },
      },
      {
        id: 'to-switch-indoor',
        label: 'Switch Layout to Indoor Banquet Hall',
        description: 'Eliminate outdoor weather vulnerability entirely by transitioning venue to banquet hall',
        impactRupees: 0,
        impactFormatted: 'Zero weather risk',
        actionType: 'update_venue',
        payload: { venuePreference: 'banquet_hall' },
      },
    ];

    insights.push({
      id: 'rule-outdoor-weather',
      type: 'suggestion',
      category: 'weather',
      title: 'Outdoor Venue Weather Contingency Needed',
      message:
        'Your selected venue is outdoors. We recommend reserving an indoor hall backup, renting a canopy/marquee tent with rain sidewalls, and securing portable patio heaters or misting fans depending on the season. (Note: Plan in advance; vendor tents sell out quickly during peak seasons).',
      tradeOffs: weatherTradeOffs,
      ruleId: 'RULE_5_OUTDOOR_WEATHER',
      ruleName: 'Outdoor Venue Weather Vulnerability & Monsoon Pandal',
      whyExplanation: 'Open-air Indian celebrations are highly susceptible to sudden unseasonal showers, humidity, or extreme heat that can halt ceremonies.',
      thresholdMet: `Venue preference set to outdoor environment ("${plan.venuePreference}").`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 6: Large Gathering Logistics & Municipal Clearances
  // -------------------------------------------------------------------------
  if (plan.guestCount > 250) {
    const dgCost = 18000;
    const permitTradeOffs: TradeOffOption[] = [
      {
        id: 'to-add-sound-noc',
        label: 'Add Municipal Sound NOC & Police Permission Task',
        description: 'Schedule legal clearance filing with local municipal corporation (check city guidelines)',
        impactRupees: 0,
        impactFormatted: 'Legal clearance',
        actionType: 'add_task',
        payload: {
          title: 'Apply for Municipal Loudspeaker & Police Sound NOC (Check Local Rules)',
          category: 'logistics',
          priority: 'urgent',
          notes: 'Required for outdoor sound and large gatherings. Rules vary by municipal corporation.',
        },
      },
      {
        id: 'to-add-dg-backup',
        label: `Add Super-Silent DG Power Backup (${formatCurrency(dgCost)})`,
        description: 'Reserve 125 kVA diesel generator backup with auto-changeover for continuous AC/lighting',
        impactRupees: -dgCost,
        impactFormatted: `Adds ${formatCurrency(dgCost)} item`,
        actionType: 'add_budget_item',
        payload: {
          name: 'Super-Silent DG Power Generator Backup (125 kVA)',
          category: 'logistics',
          estimatedCost: dgCost,
          priority: 'essential',
          notes: 'Prevents blackout during peak ritual and catering hours.',
        },
      },
    ];

    insights.push({
      id: 'rule-large-capacity',
      type: 'warning',
      category: 'capacity',
      title: 'High Guest Count Logistics (> 250 Guests)',
      message: `With ${plan.guestCount} guests, ensure the venue has adequate parking capacity, multiple bar/buffet stations to prevent bottlenecks, and adequate restroom facilities or luxury restroom trailers. (Note: Municipal rules vary by city; verify local noise and gathering guidelines).`,
      tradeOffs: permitTradeOffs,
      ruleId: 'RULE_6_CAPACITY_LOGISTICS',
      ruleName: 'High Capacity Gathering Logistics (> 250 Attendees)',
      whyExplanation: 'Large crowds require formal municipal noise clearances, dedicated parking marshals, and auxiliary diesel generator power.',
      thresholdMet: `Target headcount of ${plan.guestCount} exceeds the 250-guest infrastructure threshold.`,
    });
  } else if (plan.guestCount > 0 && plan.totalBudget > 0) {
    const perGuestBudget = plan.totalBudget / plan.guestCount;
    const tightThreshold = 500; // ₹500 per guest threshold in EventWise India
    if (perGuestBudget < tightThreshold) {
      const budgetBoost = Math.round((tightThreshold - perGuestBudget) * plan.guestCount);
      const tightTradeOffs: TradeOffOption[] = [
        {
          id: 'to-tight-buffet',
          label: 'Streamline to Regional Community Buffet',
          description: 'Focus on high-volume, authentic local vegetarian specialties to maintain quality',
          impactRupees: 0,
          impactFormatted: 'Controls cost',
          actionType: 'add_task',
          payload: {
            title: 'Audit Caterer Menu for High-Yield Seasonal Dishes',
            category: 'catering',
            priority: 'high',
          },
        },
        {
          id: 'to-tight-boost-budget',
          label: `Boost Budget by ${formatCurrency(budgetBoost)} to ₹${tightThreshold}/person`,
          description: `Raise overall budget to achieve comfortable hospitality standards in ${plan.city}`,
          impactRupees: budgetBoost,
          impactFormatted: `+${formatCurrency(budgetBoost)} budget`,
          actionType: 'increase_budget',
          payload: { amount: budgetBoost },
        },
      ];

      insights.push({
        id: 'rule-per-guest-low',
        type: 'warning',
        category: 'budget',
        title: `Tight Per-Guest Budget (${formatCurrency(Math.round(perGuestBudget))}/person)`,
        message: `Your overall budget averages under ${formatCurrency(tightThreshold)} per guest. Buffet catering, community halls, and streamlined menu selections will be essential to stay on target.`,
        tradeOffs: tightTradeOffs,
        ruleId: 'RULE_6B_TIGHT_BUDGET',
        ruleName: 'Per-Guest Spend Floor (< ₹500/guest)',
        whyExplanation: 'Catering and basic logistics in Tier 1 & Tier 2 Indian cities require a minimum operational floor to ensure safety and quality.',
        thresholdMet: `Per-guest budget (${formatCurrency(Math.round(perGuestBudget))}) is below the ₹${tightThreshold} floor.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 7: Baraat & Outdoor 10:00 PM Sound Curfew
  // -------------------------------------------------------------------------
  if (plan.eventType === 'wedding' || plan.priorities?.includes('entertainment')) {
    const curfewTradeOffs: TradeOffOption[] = [
      {
        id: 'to-curfew-shift',
        label: 'Schedule 10:00 PM Indoor Sangeet Transition',
        description: 'Add formal execution task to transition dhol and DJ speakers into soundproof hall before 10 PM',
        impactRupees: 0,
        impactFormatted: 'Prevents police fines',
        actionType: 'add_task',
        payload: {
          title: 'Coordinate 10:00 PM Sharp Sound Migration to Indoor Hall (Check Local Curfew Rules)',
          category: 'logistics',
          priority: 'urgent',
          notes: 'Indian municipal guidelines enforce outdoor noise limits. Verify exact timing with local station.',
        },
      },
      {
        id: 'to-curfew-advance-baraat',
        label: 'Advance Baraat Procession by 45 Minutes',
        description: 'Start Baraat at 3:15 PM instead of 4:00 PM to ensure leisurely celebration before the sound cutoff',
        impactRupees: 0,
        impactFormatted: 'Optimal pacing',
        actionType: 'add_task',
        payload: {
          title: 'Notify Baraat Brass Band & Dhol Players of 45-Minute Earlier Call Time',
          category: 'vendors',
          priority: 'high',
        },
      },
    ];

    insights.push({
      id: 'rule-baraat-curfew',
      type: 'suggestion',
      category: 'timeline',
      title: 'Baraat & Outdoor Sound Curfew (10:00 PM — Guidance)',
      message: 'Indian municipal guidelines generally enforce a 10:00 PM cutoff for outdoor amplified sound, dhol processions, and brass bands. Transition the dance floor indoors for late-night Sangeet or post-Pheras festivities. (Estimates only; check local police/municipal corporation rules as enforcement varies by city).',
      tradeOffs: curfewTradeOffs,
      ruleId: 'RULE_7_SOUND_CURFEW',
      ruleName: 'Baraat & Outdoor 10:00 PM Sound Curfew Protocol',
      whyExplanation: 'Indian Supreme Court and state municipal noise guidelines mandate shutting down outdoor loudspeakers and brass bands at 10:00 PM sharp.',
      thresholdMet: `Event type is "${plan.eventType}" with outdoor entertainment and dhol brass band processions.`,
    });

    // Permit Deadline Check (< 25 Days)
    const hasPermitTask = plan.tasks.some(
      (t) =>
        t.title.toLowerCase().includes('noc') ||
        t.title.toLowerCase().includes('sound permit') ||
        t.title.toLowerCase().includes('loudspeaker')
    );
    const targetDate = new Date(plan.eventDate);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 25 && !hasPermitTask) {
      insights.push({
        id: 'rule-sound-permit-deadline',
        type: 'action_required',
        category: 'timeline',
        title: 'Police Sound NOC & Loudspeaker Permit Deadline (< 25 Days)',
        message:
          'Municipal corporations and local police stations require 7–14 business days to process loudspeaker/sound NOCs for outdoor music or late-night receptions. (Estimates only; check local police/municipal corporation rules as enforcement varies by city).',
        actionLabel: 'File Permit Task',
        actionType: 'NAVIGATE_TIMELINE',
        tradeOffs: [
          {
            id: 'to-permit-fast-track',
            label: 'Fast-Track Municipal Sound NOC Filing',
            description: 'Schedule urgent task to file loudspeaker permission with local police division',
            impactRupees: 0,
            impactFormatted: 'Legal clearance',
            actionType: 'add_task',
            payload: {
              title: 'Apply for Municipal Loudspeaker & Police Sound NOC (Check Local Rules)',
              category: 'logistics',
              priority: 'urgent',
              notes: 'Required for outdoor sound and large gatherings. Police/corporation permits take 7-14 days.',
            },
          },
        ],
        ruleId: 'RULE_7B_PERMIT_DEADLINE',
        ruleName: 'Police Sound NOC & Municipal Filing Lead Time',
        whyExplanation: 'Police sound permits typically take 7 to 14 business days to process. Missing the 25-day deadline risks last-minute shutdown.',
        thresholdMet: `${diffDays} days to event (< 25 days lead time) without an active sound permit task.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // RULE 8: Task Dependency Bottlenecks
  // -------------------------------------------------------------------------
  const blockedTasks = detectBlockedTasks(plan.tasks, currentDateStr);
  if (blockedTasks.length > 0) {
    const firstBlocked = blockedTasks[0];
    const depTradeOffs: TradeOffOption[] = [
      {
        id: 'to-dep-expedite-blocker',
        label: `Prioritize Blocker: "${firstBlocked.prerequisiteTitle}"`,
        description: 'Mark prerequisite task as top urgent priority and notify coordinator',
        impactRupees: 0,
        impactFormatted: 'Clears bottleneck',
        actionType: 'add_task',
        payload: {
          title: `Resolve Blocker: ${firstBlocked.prerequisiteTitle}`,
          category: 'final',
          priority: 'urgent',
        },
      },
      {
        id: 'to-dep-repace-blocked',
        label: `Re-space Blocked Tasks by +5 Days`,
        description: 'Advance dependent milestone due dates to prevent cascading project delays',
        impactRupees: 0,
        impactFormatted: 'Prevents cascade',
        actionType: 'repace_timeline',
        payload: { delayBlocked: true },
      },
    ];

    insights.push({
      id: 'rule-task-dependency-blocked',
      type: 'action_required',
      category: 'timeline',
      title: `Task Dependency Bottleneck (${blockedTasks.length} Blocked)`,
      message: `Overdue task "${firstBlocked.prerequisiteTitle}" is blocking dependent milestone "${firstBlocked.blockedTaskTitle}". Complete the prerequisite immediately or re-space downstream dates to avoid planning paralysis.`,
      actionLabel: 'Resolve Dependency',
      actionType: 'NAVIGATE_TIMELINE',
      tradeOffs: depTradeOffs,
      ruleId: 'RULE_8_DEPENDENCY_BOTTLENECK',
      ruleName: 'Critical Task Dependency Chain Blocker',
      whyExplanation: 'Downstream milestones cannot safely proceed until their prerequisite tasks are marked completed.',
      thresholdMet: `${blockedTasks.length} dependent tasks currently blocked by overdue prerequisites.`,
    });
  }

  // -------------------------------------------------------------------------
  // RULE 9: Accessibility Accommodations
  // -------------------------------------------------------------------------
  if (plan.accessibilityNeeds && plan.accessibilityNeeds.length > 0) {
    insights.push({
      id: 'rule-accessibility-integration',
      type: 'action_required',
      category: 'accessibility',
      title: 'Accessibility Considerations Active',
      message: `Configured accessibility needs (${plan.accessibilityNeeds.join(
        ', '
      )}): Ensure step-free entrance, wheelchair-accessible restrooms, designated companion seating, and clear dietary signage at all food stations.`,
      ruleId: 'RULE_9_ACCESSIBILITY',
      ruleName: 'Accessibility & Barrier-Free Hospitality',
      whyExplanation: 'Elderly grandparents and guests with mobility needs require step-free mandap access and dedicated transit shuttles.',
      thresholdMet: `Active accommodations: ${plan.accessibilityNeeds.join(', ')}.`,
    });
  }

  // -------------------------------------------------------------------------
  // RULES 10 & 11: RSVP Capacity & Jain/Pure Veg Dietary Separation
  // -------------------------------------------------------------------------
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
      const extraGuests = confirmedCount - plan.guestCount;
      const extraCost = extraGuests * summary.perGuestCost;

      const rsvpTradeOffs: TradeOffOption[] = [
        {
          id: 'to-expand-capacity',
          label: `Expand Headcount Target to ${confirmedCount} (+${extraGuests} Guests)`,
          description: `Update target to match confirmed attendees and auto-scale per-guest catering estimates`,
          impactRupees: -extraCost,
          impactFormatted: `+${formatCurrency(extraCost)} catering commitment`,
          actionType: 'adjust_guest_count',
          payload: { newGuestCount: confirmedCount },
        },
        {
          id: 'to-cap-invites',
          label: 'Lock Physical Seating & Offer Digital Stream Pass',
          description: 'Keep current venue capacity limit and offer a high-definition live stream broadcast for overflow guests',
          impactRupees: extraCost,
          impactFormatted: `Avoids ${formatCurrency(extraCost)} expansion`,
          actionType: 'add_task',
          payload: {
            title: 'Setup Private Live Stream Link for Additional Guests',
            category: 'logistics',
            priority: 'high',
          },
        },
      ];

      insights.push({
        id: 'rule-rsvp-capacity-exceeded',
        type: 'warning',
        category: 'capacity',
        title: 'RSVP Headcount Exceeds Planned Capacity',
        message: `${confirmedCount} confirmed attendees exceed your target headcount of ${plan.guestCount}. Recalculate catering portions, table rentals, and venue fire marshal capacity.`,
        actionLabel: 'Review Guest List',
        actionType: 'NAVIGATE_GUESTS',
        tradeOffs: rsvpTradeOffs,
        ruleId: 'RULE_10_RSVP_CAPACITY',
        ruleName: 'Confirmed RSVPs Exceeding Venue Target',
        whyExplanation: 'Confirmed RSVPs (with plus-ones) exceed the planned guest count, threatening food shortages and seating overflow.',
        thresholdMet: `${confirmedCount} confirmed attendees > ${plan.guestCount} planned target (+${extraGuests} delta).`,
      });
    }

    if (dietaryCount > 0) {
      const dietaryTradeOffs: TradeOffOption[] = [
        {
          id: 'to-dietary-tags',
          label: 'Add Caterer Dietary Plate Tags Milestone',
          description: 'Schedule finalization of personalized plate tags with kitchen lead 14 days prior',
          impactRupees: 0,
          impactFormatted: 'Prevents food errors',
          actionType: 'add_task',
          payload: {
            title: `Confirm ${dietaryCount} Personalized Dietary Plate Tags with Kitchen Lead`,
            category: 'catering',
            priority: 'high',
          },
        },
      ];

      insights.push({
        id: 'rule-dietary-alert',
        type: 'suggestion',
        category: 'accessibility',
        title: 'Special Dietary Requirements Noted',
        message: `${dietaryCount} confirmed guests have specific dietary needs. Confirm personalized meal plate tags with your caterer 14 days prior to the event.`,
        tradeOffs: dietaryTradeOffs,
        ruleId: 'RULE_11_DIETARY_ALERT',
        ruleName: 'Personalized Dietary Tags & Kitchen Audit',
        whyExplanation: 'Dietary preferences must be shared with the banquet captain well in advance to prevent allergen mix-ups.',
        thresholdMet: `${dietaryCount} guests have indicated custom dietary requirements.`,
      });
    }

    if (jainOrPureVegCount > 0) {
      const jainCounterCost = 25000;
      const jainTradeOffs: TradeOffOption[] = [
        {
          id: 'to-add-jain-counter',
          label: `Add Isolated Jain & Sattvic Counter (${formatCurrency(jainCounterCost)})`,
          description: 'Add dedicated prep table, copper serving chafers, and isolated ladles to catering budget',
          impactRupees: -jainCounterCost,
          impactFormatted: `Adds ${formatCurrency(jainCounterCost)} item`,
          actionType: 'apply_dietary_counter',
          payload: {
            name: 'Dedicated Pure Veg & Jain Kitchen Counter Isolation',
            category: 'catering',
            estimatedCost: jainCounterCost,
            priority: 'essential',
          },
        },
        {
          id: 'to-ladle-protocol-task',
          label: 'Add Kitchen Ladle & Utensil Separation Task',
          description: 'Assign catering supervisor to audit distinct serving ladles and clear dietary signage',
          impactRupees: 0,
          impactFormatted: 'Ensures ritual purity',
          actionType: 'add_task',
          payload: {
            title: 'Verify Distinct Serving Ladles & Jain Signage with Banquet Captain',
            category: 'catering',
            priority: 'urgent',
          },
        },
      ];

      insights.push({
        id: 'rule-jain-dietary-counter',
        type: 'action_required',
        category: 'accessibility',
        title: 'Dedicated Pure Veg / Jain Kitchen Counter Required',
        message: `${jainOrPureVegCount} guests require Jain (no onion/garlic/root veg) or Sattvic Pure Vegetarian preparation. Ensure your caterer sets up an isolated preparation counter, distinct serving ladles, and clear signage.`,
        tradeOffs: jainTradeOffs,
        ruleId: 'RULE_11B_JAIN_SEPARATION',
        ruleName: 'Dedicated Pure Veg & Jain Kitchen Isolation',
        whyExplanation: 'Jain dietary practice forbids root vegetables, onions, and garlic. Traditional families expect zero cross-contact with other buffet lines.',
        thresholdMet: `${jainOrPureVegCount} confirmed attendees require strict Jain or Sattvic pure vegetarian meal service.`,
      });
    }
  }

  return { insights, missingPrompts };
}

export const TOTAL_DECISION_RULES_COUNT = 12;

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
