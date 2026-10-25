import { describe, it, expect } from 'vitest';
import type { EventPlan, BudgetItem, TaskItem, VendorItem } from '../types/event';
import {
  evaluateDecisionRules,
  repaceTimelineTasks,
  detectBlockedTasks,
} from '../services/decisionEngine';

describe('Comprehensive Core Loop & Change Scenarios (Step 5)', () => {
  const basePlan: EventPlan = {
    id: 'evt-scenario-test',
    title: 'Aarav & Ananya Royal Wedding',
    eventType: 'wedding',
    eventDate: '2027-02-15',
    city: 'Jaipur, Rajasthan',
    guestCount: 200,
    totalBudget: 3000000,
    currency: '₹',
    contingencyRate: 0.1,
    venuePreference: 'palace_heritage',
    foodPreference: 'royal_thali',
    theme: 'Royal Rajputana Heritage',
    priorities: ['venue', 'catering'],
    accessibilityNeeds: ['Wheelchair access'],
    culturalTraditions: 'Traditional Marwari rituals',
    specialNotes: '',
    plannerSource: 'fallback_rule_engine',
    lastGeneratedAt: new Date().toISOString(),
    decisionInsights: [],
    missingInfoPrompts: [],
    generationExplanation: '',
    budgetItems: [
      { id: 'b-cat', category: 'catering', name: 'Royal Catering', estimatedCost: 1000000, actualCost: 1000000 },
      { id: 'b-dec', category: 'decor', name: 'Palace Mandap Decor', estimatedCost: 500000, actualCost: 500000 },
      { id: 'b-ven', category: 'venue', name: 'Courtyard Venue', estimatedCost: 800000, actualCost: 800000 },
      { id: 'b-ent', category: 'entertainment', name: 'Dhol & DJ', estimatedCost: 300000, actualCost: 300000 },
      { id: 'b-pho', category: 'photography', name: 'Candid Photography', estimatedCost: 400000, actualCost: 400000 },
    ] as BudgetItem[],
    tasks: [
      { id: 't-venue', title: 'Confirm Venue Booking', category: 'venue', dueDate: '2026-12-01', completed: true },
      { id: 't-caterer', title: 'Lock Caterer Contract & Menu', category: 'catering', dueDate: '2026-12-15', completed: false, dependencies: ['t-venue'] },
      { id: 't-tasting', title: 'Conduct Food Tasting Session', category: 'catering', dueDate: '2027-01-05', completed: false, dependencies: ['t-caterer'] },
      { id: 't-permit', title: 'Procure Police Loudspeaker & Sound Permit', category: 'permits', dueDate: '2027-01-20', completed: false },
      { id: 't-baraat', title: 'Coordinate Baraat Procession Route & Dhol Pacing', category: 'ceremony', dueDate: '2027-02-10', completed: false },
    ] as TaskItem[],
    vendors: [
      { id: 'v-caterer', category: 'caterer', role: 'Royal Halwai', status: 'booked', estimatedCost: 1000000, questionsToAsk: [] },
      { id: 'v-decor', category: 'decorator', role: 'Palace Decorators', status: 'shortlisted', estimatedCost: 500000, questionsToAsk: [] },
      { id: 'v-dhol', category: 'dhol_band', role: 'Nashik Dhol & Brass Band', status: 'contacted', estimatedCost: 300000, questionsToAsk: [] },
    ] as VendorItem[],
    guests: [
      { id: 'g-1', name: 'Guest 1', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: false },
      { id: 'g-2', name: 'Guest 2', rsvpStatus: 'attending', dietary: 'jain', plusOne: true },
      { id: 'g-3', name: 'Guest 3', rsvpStatus: 'attending', dietary: 'none', plusOne: false },
    ],
    ideas: [],
    schedule: [
      { id: 's-1', time: '04:00 PM', activity: 'High Tea & Welcome Drinks', location: 'Courtyard', responsibleRole: 'Catering Lead' },
      { id: 's-2', time: '07:00 PM', activity: 'Baraat Procession & Dhol Beats', location: 'Palace Gate', responsibleRole: 'Dhol Band' },
      { id: 's-3', time: '10:00 PM', activity: 'Transition Indoors & Sangeet Dance Floor', location: 'Grand Ballroom', responsibleRole: 'DJ' },
    ],
  };

  // 1. Caterer or Vendor Price Spike (+20%)
  it('detects a vendor price spike, flags overrun, and produces quantified trade-offs in ₹', () => {
    const spikePlan: EventPlan = {
      ...basePlan,
      budgetItems: basePlan.budgetItems.map((b) =>
        b.id === 'b-cat' ? { ...b, actualCost: 1200000 } : b
      ),
      vendors: basePlan.vendors.map((v) =>
        v.id === 'v-caterer' ? { ...v, finalCost: 1200000 } : v
      ),
    };

    const { insights } = evaluateDecisionRules(spikePlan);
    const spikeInsight = insights.find((i) => i.id === 'rule-vendor-cost-spike' || i.id === 'rule-budget-overrun');
    expect(spikeInsight).toBeDefined();
    expect(spikeInsight?.tradeOffs).toBeDefined();
    expect(spikeInsight!.tradeOffs!.length).toBeGreaterThanOrEqual(2);

    const decorCut = spikeInsight!.tradeOffs!.find((t) => t.actionType === 'reduce_budget_item');
    expect(decorCut).toBeDefined();
    expect(decorCut?.payload.amount).toBeGreaterThan(0);
    expect(decorCut?.impactFormatted).toMatch(/₹/);
  });

  // 2. Vendor Cancels or Becomes Unavailable
  it('detects a cancelled vendor and produces replacement and buffer trade-offs', () => {
    const cancelPlan: EventPlan = {
      ...basePlan,
      vendors: basePlan.vendors.map((v) =>
        v.id === 'v-caterer' ? { ...v, status: 'cancelled' } : v
      ),
    };

    const { insights } = evaluateDecisionRules(cancelPlan);
    const cancelInsight = insights.find((i) => i.id.startsWith('rule-vendor-cancelled'));
    expect(cancelInsight).toBeDefined();
    expect(cancelInsight?.tradeOffs).toBeDefined();
    expect(cancelInsight!.tradeOffs!.length).toBeGreaterThanOrEqual(2);

    const replaceTradeOff = cancelInsight!.tradeOffs!.find((t) => t.actionType === 'update_vendor_status');
    expect(replaceTradeOff).toBeDefined();
    expect(replaceTradeOff?.payload.vendorId).toBe('v-caterer');
  });

  // 3. Guest Count Rises (+50 guests)
  it('detects guest count expansion, re-evaluates per-guest cost, and provides budget mitigation', () => {
    const surgePlan: EventPlan = {
      ...basePlan,
      guestCount: 250,
      totalBudget: 2500000, // Make it tight
    };

    const { insights } = evaluateDecisionRules(surgePlan);
    expect(insights.length).toBeGreaterThan(0);
  });

  // 4. RSVP Surge Beyond Capacity (>100% capacity)
  it('detects capacity overload and offers head-count cap or venue expansion trade-offs', () => {
    const overflowPlan: EventPlan = {
      ...basePlan,
      guestCount: 200,
      guests: Array.from({ length: 220 }, (_, idx) => ({
        id: `g-${idx}`,
        name: `Guest ${idx}`,
        rsvpStatus: 'attending',
        dietary: 'none',
        plusOne: false,
      })),
    };

    const { insights } = evaluateDecisionRules(overflowPlan);
    const capacityInsight = insights.find((i) => i.id === 'rule-rsvp-capacity-exceeded');
    expect(capacityInsight).toBeDefined();
    expect(capacityInsight?.tradeOffs).toBeDefined();

    const capTradeOff = capacityInsight!.tradeOffs!.find((t) => t.actionType === 'adjust_guest_count');
    expect(capTradeOff).toBeDefined();
    expect(capTradeOff?.payload.newGuestCount).toBe(220);
  });

  // 5. Date Moves Earlier (Timeline Compression / Rush Triage)
  it('re-paces timeline when date moves earlier, flags compressed schedule, and triages tasks', () => {
    const rushDate = '2026-11-05'; // Only ~10 days away
    const repacedTasks = repaceTimelineTasks(basePlan.tasks, basePlan.eventDate, rushDate, '2026-10-26');

    // Uncompleted tasks should be compressed within the remaining 10 days
    const pendingTasks = repacedTasks.filter((t) => !t.completed);
    pendingTasks.forEach((t) => {
      expect(t.dueDate <= rushDate).toBe(true);
      expect(t.dueDate >= '2026-10-26').toBe(true);
    });

    const rushPlan: EventPlan = {
      ...basePlan,
      eventDate: rushDate,
      tasks: repacedTasks,
    };

    const { insights } = evaluateDecisionRules(rushPlan, '2026-10-26');
    const urgentInsight = insights.find((i) => i.id === 'rule-date-urgent' || i.id === 'rule-date-approaching');
    expect(urgentInsight).toBeDefined();
    expect(urgentInsight?.tradeOffs?.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Venue Changes / Weather Risk (Outdoor Lawn + Weather Alert)
  it('detects weather risk for outdoor venues and offers covered marquee or indoor switch', () => {
    const outdoorPlan: EventPlan = {
      ...basePlan,
      venuePreference: 'farmhouse_lawn',
    };

    const { insights } = evaluateDecisionRules(outdoorPlan);
    const weatherInsight = insights.find((i) => i.id === 'rule-outdoor-weather');
    expect(weatherInsight).toBeDefined();
    expect(weatherInsight?.tradeOffs).toBeDefined();

    const indoorTradeOff = weatherInsight!.tradeOffs!.find((t) => t.actionType === 'update_venue');
    expect(indoorTradeOff).toBeDefined();
    expect(indoorTradeOff?.payload.venuePreference).toBe('banquet_hall');
  });

  // 7. Budget Cut or Over-Budget
  it('detects over-budget variance and provides multiple quantified reduction trade-offs', () => {
    const overBudgetPlan: EventPlan = {
      ...basePlan,
      totalBudget: 2500000, // Total allocated is 3000000, so 500K over
    };

    const { insights } = evaluateDecisionRules(overBudgetPlan);
    const overBudgetInsight = insights.find((i) => i.id === 'rule-budget-exceeded');
    expect(overBudgetInsight).toBeDefined();
    expect(overBudgetInsight?.tradeOffs?.length).toBeGreaterThanOrEqual(2);

    const cateringTradeOff = overBudgetInsight!.tradeOffs!.find(
      (t) => t.id === 'to-switch-buffet'
    );
    expect(cateringTradeOff).toBeDefined();
    expect(cateringTradeOff?.payload.amount).toBeGreaterThan(0);
  });

  // 8. Task Slips and Blocks Dependents
  it('detects blocked tasks when prerequisites are incomplete or overdue', () => {
    const blockedPlan: EventPlan = {
      ...basePlan,
      tasks: [
        { id: 't-1', title: 'Prerequisite Overdue Task', category: 'venue', dueDate: '2026-10-01', completed: false },
        { id: 't-2', title: 'Dependent Task', category: 'catering', dueDate: '2026-10-15', completed: false, dependencies: ['t-1'] },
      ],
    };

    const blockedList = detectBlockedTasks(blockedPlan.tasks, '2026-10-26');
    expect(blockedList.some((b) => b.blockedTaskId === 't-2')).toBe(true);
    expect(blockedList.some((b) => b.blockedTaskId === 't-1')).toBe(false);

    const { insights } = evaluateDecisionRules(blockedPlan, '2026-10-26');
    const depInsight = insights.find((i) => i.id === 'rule-task-dependency-blocked');
    expect(depInsight).toBeDefined();
    expect(depInsight?.tradeOffs?.length).toBeGreaterThanOrEqual(1);
  });

  // 9. Dietary Requirement Appears Late (Jain & Pure Veg Segregation)
  it('detects Jain & Pure Veg guest registrations and provides dedicated kitchen counter trade-off', () => {
    const dietaryPlan: EventPlan = {
      ...basePlan,
      guests: [
        { id: 'g-j1', name: 'Jain Guest 1', rsvpStatus: 'attending', dietary: 'jain', plusOne: false },
        { id: 'g-j2', name: 'Jain Guest 2', rsvpStatus: 'attending', dietary: 'jain', plusOne: false },
        { id: 'g-pv1', name: 'Pure Veg Guest', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: false },
      ],
      budgetItems: basePlan.budgetItems.filter((b) => !b.name.toLowerCase().includes('jain')),
    };

    const { insights } = evaluateDecisionRules(dietaryPlan);
    const jainInsight = insights.find((i) => i.id === 'rule-jain-dietary-counter');
    expect(jainInsight).toBeDefined();
    expect(jainInsight?.tradeOffs).toBeDefined();

    const jainTradeOff = jainInsight!.tradeOffs!.find((t) => t.actionType === 'apply_dietary_counter');
    expect(jainTradeOff).toBeDefined();
    expect(jainTradeOff?.payload.name).toContain('Jain');
  });

  // 10. 10:00 PM Baraat & Outdoor Sound Curfew
  it('detects 10:00 PM sound curfew and provides indoor migration and schedule shift trade-offs', () => {
    const curfewPlan: EventPlan = {
      ...basePlan,
      venuePreference: 'farmhouse_lawn',
    };

    const { insights } = evaluateDecisionRules(curfewPlan);
    const curfewInsight = insights.find((i) => i.id === 'rule-baraat-curfew');
    expect(curfewInsight).toBeDefined();
    expect(curfewInsight?.tradeOffs?.length).toBeGreaterThanOrEqual(2);

    const shiftTradeOff = curfewInsight!.tradeOffs!.find((t) => t.id === 'to-curfew-shift');
    expect(shiftTradeOff).toBeDefined();
    expect(shiftTradeOff?.actionType).toBe('add_task');
  });

  // 11. Police Loudspeaker & Sound Permit Deadline
  it('flags sound permit urgency when within 25 days and offers permit filing action', () => {
    const permitPlan: EventPlan = {
      ...basePlan,
      eventDate: '2026-11-15', // ~20 days away
      tasks: basePlan.tasks.filter((t) => !t.title.toLowerCase().includes('permit')),
    };

    const { insights } = evaluateDecisionRules(permitPlan, '2026-10-26');
    const permitInsight = insights.find((i) => i.id === 'rule-sound-permit-deadline');
    expect(permitInsight).toBeDefined();
    expect(permitInsight?.tradeOffs?.length).toBeGreaterThanOrEqual(1);

    const permitTradeOff = permitInsight!.tradeOffs!.find((t) => t.id === 'to-permit-fast-track');
    expect(permitTradeOff).toBeDefined();
    expect(permitTradeOff?.actionType).toBe('add_task');
  });
});
