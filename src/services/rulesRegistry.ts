import type {
  EventPlan,
  BudgetSummary,
  DecisionInsight,
  TradeOffOption,
} from '../types/event';
import { formatCurrency } from '../utils/formatters';
import { RULES_CONFIG } from '../constants/rulesConfig';
import { detectBlockedTasks } from './decisionEngine';

export type DecisionEnginePlanInput = Pick<
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
  id?: string;
  title?: string;
  guests?: EventPlan['guests'];
  vendors?: EventPlan['vendors'];
  schedule?: EventPlan['schedule'];
};

export interface DecisionRuleDefinition {
  id: string;
  ruleId: string;
  name: string;
  category: DecisionInsight['category'];
  severity: DecisionInsight['type'];
  evaluate: (
    plan: DecisionEnginePlanInput,
    summary: BudgetSummary,
    now: Date,
    currentDateStr?: string
  ) => DecisionInsight[] | DecisionInsight | null;
}

/**
 * RULE 1: Budget Overrun & Surplus
 */
export const ruleBudgetOverrun: DecisionRuleDefinition = {
  id: 'rule-budget-exceeded',
  ruleId: 'RULE_1_BUDGET_OVERRUN',
  name: 'Budget Overrun & Expense Ceiling',
  category: 'budget',
  severity: 'warning',
  evaluate: (plan, summary) => {
    if (summary.isOverBudget) {
      const overage = summary.totalEstimated - summary.totalBudget;
      const cateringItem = plan.budgetItems.find((b) => b.category === 'catering');
      const topDiscretionary = plan.budgetItems
        .filter((b) => b.priority !== 'essential')
        .sort((a, b) => b.estimatedCost - a.estimatedCost)[0];

      const cateringSavings = cateringItem
        ? Math.round(cateringItem.estimatedCost * 0.18)
        : Math.round(overage * 0.5);
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

      return {
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
      };
    }

    if (summary.remainingBalance > summary.totalBudget * RULES_CONFIG.SURPLUS_BUDGET_RATIO && summary.totalBudget > 0) {
      return {
        id: 'rule-budget-surplus',
        type: 'positive',
        category: 'budget',
        title: 'Healthy Budget Buffer Available',
        message: `You have ${formatCurrency(summary.remainingBalance)} (unallocated funds). You can upgrade photography packages, enhance guest transport, or keep this as an extra cushion.`,
        ruleId: 'RULE_1B_BUDGET_SURPLUS',
        ruleName: 'Budget Buffer & Unallocated Surplus',
        whyExplanation: 'Unallocated funds provide financial protection against last-minute vendor price increases and emergency spot contracting.',
        thresholdMet: `Remaining surplus (${formatCurrency(summary.remainingBalance)}) is > 25% of total budget (${formatCurrency(summary.totalBudget)}).`,
      };
    }

    return null;
  },
};

/**
 * RULE 2: Vendor Cost Escalation & Chaos Trade-offs
 */
export const ruleVendorCostSpike: DecisionRuleDefinition = {
  id: 'rule-vendor-cost-spike',
  ruleId: 'RULE_2_VENDOR_SPIKE',
  name: 'Vendor Quote Escalation & Price Spike',
  category: 'budget',
  severity: 'warning',
  evaluate: (plan, summary) => {
    const costSpikeItems = plan.budgetItems.filter(
      (item) => item.actualCost !== undefined && item.actualCost > item.estimatedCost
    );
    if (costSpikeItems.length === 0) return null;

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

    return {
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
    };
  },
};

/**
 * RULE 3: Vendor Cancellation & Dropout
 */
export const ruleVendorCancellation: DecisionRuleDefinition = {
  id: 'rule-vendor-cancelled',
  ruleId: 'RULE_3_VENDOR_CANCELLED',
  name: 'Emergency Vendor Drop-out & Reallocation',
  category: 'vendors',
  severity: 'action_required',
  evaluate: (plan) => {
    const cancelledVendors = plan.vendors?.filter((v) => v.status === 'cancelled') || [];
    if (cancelledVendors.length === 0) return null;

    return cancelledVendors.map((v) => {
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

      return {
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
      };
    });
  },
};

/**
 * RULE 4: Timeline Urgency, Short-Notice Triage & Date Shifting
 */
export const ruleTimelineUrgency: DecisionRuleDefinition = {
  id: 'rule-timeline-urgency',
  ruleId: 'RULE_4_DATE_TRIAGE',
  name: 'Short-Notice Fast Track Triage (< 14 Days)',
  category: 'timeline',
  severity: 'action_required',
  evaluate: (plan, _summary, now) => {
    if (!plan.eventDate) return null;
    const targetDate = new Date(plan.eventDate);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        id: 'rule-date-past',
        type: 'action_required',
        category: 'timeline',
        title: 'Event Date Has Passed',
        message: `The selected event date (${plan.eventDate}) is in the past. Update the date to generate an active upcoming preparation timeline.`,
        ruleId: 'RULE_4_DATE_PAST',
        ruleName: 'Past Date Anomaly',
        whyExplanation: 'Milestones cannot be scheduled chronologically for events whose target calendar date has already elapsed.',
        thresholdMet: `Target date (${plan.eventDate}) is ${Math.abs(diffDays)} days in the past.`,
      };
    }

    if (diffDays <= RULES_CONFIG.CRITICAL_DAYS_WINDOW) {
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

      return {
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
      };
    }

    if (diffDays <= 30) {
      return {
        id: 'rule-date-approaching',
        type: 'warning',
        category: 'timeline',
        title: 'Event Approaching (< 1 Month)',
        message: `Only ${diffDays} days remaining. Focus on seating charts, final vendor confirmations, and collecting outstanding RSVPs.`,
        ruleId: 'RULE_4B_DATE_APPROACHING',
        ruleName: 'Approaching Event Milestone (< 30 Days)',
        whyExplanation: 'The 30-day window triggers final RSVP collections, priest puja samagri checks, and vendor balance schedules.',
        thresholdMet: `${diffDays} days remaining (< 30 days window).`,
      };
    }

    return null;
  },
};

/**
 * RULE 5: Outdoor Weather Risk & Contingency
 */
export const ruleOutdoorWeatherRisk: DecisionRuleDefinition = {
  id: 'rule-outdoor-weather',
  ruleId: 'RULE_5_OUTDOOR_WEATHER',
  name: 'Outdoor Venue Weather Vulnerability & Monsoon Pandal',
  category: 'weather',
  severity: 'suggestion',
  evaluate: (plan) => {
    const outdoorVenues = ['outdoor', 'garden_park', 'beach', 'rooftop', 'farmhouse_lawn', 'resort_lawn'];
    if (!outdoorVenues.includes(plan.venuePreference)) return null;

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

    return {
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
    };
  },
};

/**
 * RULE 6: Large Gathering Logistics (> 250 Guests) & Per-Guest Spend Floor
 */
export const ruleLargeCapacityAndPerGuest: DecisionRuleDefinition = {
  id: 'rule-large-capacity',
  ruleId: 'RULE_6_CAPACITY_LOGISTICS',
  name: 'High Capacity Gathering Logistics (> 250 Attendees)',
  category: 'capacity',
  severity: 'warning',
  evaluate: (plan) => {
    const results: DecisionInsight[] = [];

    if (plan.guestCount > RULES_CONFIG.LARGE_GUEST_THRESHOLD) {
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

      results.push({
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
    }

    if (plan.guestCount > 0 && plan.totalBudget > 0) {
      const perGuestBudget = plan.totalBudget / plan.guestCount;
      const tightThreshold = 500;
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

        results.push({
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

    return results.length > 0 ? results : null;
  },
};

/**
 * RULE 7: Baraat & Outdoor 10:00 PM Sound Curfew
 */
export const ruleSoundCurfewAndPermit: DecisionRuleDefinition = {
  id: 'rule-baraat-curfew',
  ruleId: 'RULE_7_SOUND_CURFEW',
  name: 'Baraat & Outdoor 10:00 PM Sound Curfew Protocol',
  category: 'timeline',
  severity: 'suggestion',
  evaluate: (plan, _summary, now) => {
    if (plan.eventType !== 'wedding' && !plan.priorities?.includes('entertainment')) return null;

    const results: DecisionInsight[] = [];
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

    results.push({
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
      results.push({
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

    return results;
  },
};

/**
 * RULE 8: Task Dependency Bottlenecks
 */
export const ruleTaskDependencyBottlenecks: DecisionRuleDefinition = {
  id: 'rule-task-dependency-blocked',
  ruleId: 'RULE_8_DEPENDENCY_BOTTLENECK',
  name: 'Critical Task Dependency Chain Blocker',
  category: 'timeline',
  severity: 'action_required',
  evaluate: (plan, _summary, _now, currentDateStr) => {
    const blockedTasks = detectBlockedTasks(plan.tasks, currentDateStr);
    if (blockedTasks.length === 0) return null;

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

    return {
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
    };
  },
};

/**
 * RULE 9: Accessibility Accommodations
 */
export const ruleAccessibilityNeeds: DecisionRuleDefinition = {
  id: 'rule-accessibility-integration',
  ruleId: 'RULE_9_ACCESSIBILITY',
  name: 'Accessibility & Barrier-Free Hospitality',
  category: 'accessibility',
  severity: 'action_required',
  evaluate: (plan) => {
    if (!plan.accessibilityNeeds || plan.accessibilityNeeds.length === 0) return null;

    return {
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
    };
  },
};

/**
 * RULE 10: RSVP Headcount Exceeds Planned Capacity
 */
export const ruleRsvpCapacityExceeded: DecisionRuleDefinition = {
  id: 'rule-rsvp-capacity-exceeded',
  ruleId: 'RULE_10_RSVP_CAPACITY',
  name: 'Confirmed RSVPs Exceeding Venue Target',
  category: 'capacity',
  severity: 'warning',
  evaluate: (plan, summary) => {
    if (!plan.guests || plan.guests.length === 0) return null;

    let confirmedCount = 0;
    for (const g of plan.guests) {
      if (g.rsvpStatus === 'attending') {
        confirmedCount += g.plusOne ? 2 : 1;
      }
    }

    if (confirmedCount <= plan.guestCount) return null;

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

    return {
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
    };
  },
};

/**
 * RULE 11: Special Dietary Requirements Noted
 */
export const ruleDietaryAlert: DecisionRuleDefinition = {
  id: 'rule-dietary-alert',
  ruleId: 'RULE_11_DIETARY_ALERT',
  name: 'Personalized Dietary Tags & Kitchen Audit',
  category: 'accessibility',
  severity: 'suggestion',
  evaluate: (plan) => {
    if (!plan.guests || plan.guests.length === 0) return null;

    const dietaryCount = plan.guests.filter(
      (g) => g.rsvpStatus === 'attending' && g.dietary && g.dietary !== 'none'
    ).length;

    if (dietaryCount === 0) return null;

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

    return {
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
    };
  },
};

/**
 * RULE 12: Dedicated Pure Veg & Jain Kitchen Counter Isolation
 */
export const ruleJainDietarySeparation: DecisionRuleDefinition = {
  id: 'rule-jain-dietary-counter',
  ruleId: 'RULE_11B_JAIN_SEPARATION',
  name: 'Dedicated Pure Veg & Jain Kitchen Isolation',
  category: 'accessibility',
  severity: 'action_required',
  evaluate: (plan) => {
    if (!plan.guests || plan.guests.length === 0) return null;

    const jainOrPureVegCount = plan.guests.filter(
      (g) => g.rsvpStatus === 'attending' && (g.dietary === 'jain' || g.dietary === 'pure_veg')
    ).length;

    if (jainOrPureVegCount === 0) return null;

    const jainCounterCost = RULES_CONFIG.JAIN_COUNTER_DEFAULT_COST;
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

    return {
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
    };
  },
};

/**
 * Full Decision Rules Registry
 */
export const DECISION_RULES_REGISTRY: readonly DecisionRuleDefinition[] = [
  ruleBudgetOverrun,
  ruleVendorCostSpike,
  ruleVendorCancellation,
  ruleTimelineUrgency,
  ruleOutdoorWeatherRisk,
  ruleLargeCapacityAndPerGuest,
  ruleSoundCurfewAndPermit,
  ruleTaskDependencyBottlenecks,
  ruleAccessibilityNeeds,
  ruleRsvpCapacityExceeded,
  ruleDietaryAlert,
  ruleJainDietarySeparation,
] as const;
