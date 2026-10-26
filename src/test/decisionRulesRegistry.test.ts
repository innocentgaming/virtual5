import { describe, it, expect } from 'vitest';
import {
  DECISION_RULES_REGISTRY,
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
  type DecisionEnginePlanInput,
} from '../services/rulesRegistry';
import { calculateBudgetSummary, repaceTimelineTasks } from '../services/decisionEngine';
import { RULES_CONFIG } from '../constants/rulesConfig';
import { importPlanFromJson } from '../services/storageService';
import { INITIAL_EVENTS } from '../data/sampleEvents';

describe('Decision Rules Registry — Comprehensive Rule Boundary Tests', () => {
  const basePlan: DecisionEnginePlanInput = {
    eventType: 'wedding',
    totalBudget: 1000000,
    budgetItems: [
      { id: 'b1', name: 'Royal Palace Banquet', category: 'venue', estimatedCost: 400000, priority: 'essential' },
      { id: 'b2', name: 'Shahi Catering', category: 'catering', estimatedCost: 350000, priority: 'essential' },
    ],
    contingencyRate: 0.10,
    eventDate: '2026-12-01',
    guestCount: 200,
    venuePreference: 'banquet_hall',
    foodPreference: 'buffet',
    accessibilityNeeds: [],
    priorities: ['venue', 'catering'],
    city: 'Jaipur, Rajasthan',
    tasks: [],
    guests: [],
    vendors: [
      { id: 'v1', category: 'venue', name: 'Palace', status: 'booked', estimatedCost: 400000, actualCost: 400000, isBooked: true, contractSigned: true, samagriChecklist: [], interviewQuestions: [] },
      { id: 'v2', category: 'catering', name: 'Caterer', status: 'booked', estimatedCost: 350000, actualCost: 350000, isBooked: true, contractSigned: true, samagriChecklist: [], interviewQuestions: [] },
    ],
  };

  it('contains exactly 12 modular rules matching the centralized config', () => {
    expect(DECISION_RULES_REGISTRY.length).toBe(RULES_CONFIG.TOTAL_RULES_COUNT);
    expect(DECISION_RULES_REGISTRY.length).toBe(12);
  });

  // Rule 1: ruleBudgetOverrun
  describe('Rule 1: ruleBudgetOverrun', () => {
    it('returns null when budget utilization is strictly within budget', () => {
      const summary = calculateBudgetSummary(basePlan.totalBudget, basePlan.budgetItems, basePlan.contingencyRate, basePlan.guestCount);
      const res = ruleBudgetOverrun.evaluate(basePlan, summary, new Date('2026-06-01'));
      expect(res).toBeNull();
    });

    it('triggers critical insight when total estimated exceeds 100% of budget', () => {
      const overPlan = {
        ...basePlan,
        totalBudget: 500000, // costs 750k + 50k contingency = 800k vs 500k
      };
      const summary = calculateBudgetSummary(overPlan.totalBudget, overPlan.budgetItems, overPlan.contingencyRate, overPlan.guestCount);
      const res = ruleBudgetOverrun.evaluate(overPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.category).toBe('budget');
        expect(res.whyExplanation).toContain('projected expenses exceeded');
      }
    });

    it('handles zero or negative budget safely without dividing by zero or crashing', () => {
      const zeroPlan = { ...basePlan, totalBudget: 0 };
      const summary = calculateBudgetSummary(zeroPlan.totalBudget, zeroPlan.budgetItems, zeroPlan.contingencyRate, zeroPlan.guestCount);
      const res = ruleBudgetOverrun.evaluate(zeroPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.type).toBe('warning');
      }
    });
  });

  // Rule 2: ruleVendorCostSpike
  describe('Rule 2: ruleVendorCostSpike', () => {
    it('triggers warning and proposes trade-offs when actualCost spikes >= 20%', () => {
      const spikedPlan: DecisionEnginePlanInput = {
        ...basePlan,
        budgetItems: [
          { id: 'b1', name: 'Palace', category: 'venue', estimatedCost: 100000, actualCost: 130000, priority: 'essential' }, // +30%
        ],
      };
      const summary = calculateBudgetSummary(spikedPlan.totalBudget, spikedPlan.budgetItems, spikedPlan.contingencyRate, spikedPlan.guestCount);
      const res = ruleVendorCostSpike.evaluate(spikedPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.type).toBe('warning');
        expect(res.ruleId).toBe('RULE_2_VENDOR_SPIKE');
        expect(res.tradeOffs).toBeDefined();
        expect(res.tradeOffs!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('returns null when actualCost increase is strictly below 20%', () => {
      const mildSpikePlan: DecisionEnginePlanInput = {
        ...basePlan,
        budgetItems: [
          { id: 'b1', name: 'Palace', category: 'venue', estimatedCost: 100000, actualCost: 100000, priority: 'essential' },
        ],
      };
      const summary = calculateBudgetSummary(mildSpikePlan.totalBudget, mildSpikePlan.budgetItems, mildSpikePlan.contingencyRate, mildSpikePlan.guestCount);
      const res = ruleVendorCostSpike.evaluate(mildSpikePlan, summary, new Date('2026-06-01'));
      expect(res).toBeNull();
    });
  });

  // Rule 3: ruleVendorCancellation
  describe('Rule 3: ruleVendorCancellation', () => {
    it('flags cancelled vendor with replacement trade-offs', () => {
      const cancelledPlan: DecisionEnginePlanInput = {
        ...basePlan,
        vendors: [
          { id: 'v1', category: 'catering', name: 'Shahi Halwai', role: 'Royal Caterer', status: 'cancelled', isBooked: false, samagriChecklist: [], interviewQuestions: [] },
        ],
      };
      const summary = calculateBudgetSummary(cancelledPlan.totalBudget, cancelledPlan.budgetItems, cancelledPlan.contingencyRate, cancelledPlan.guestCount);
      const res = ruleVendorCancellation.evaluate(cancelledPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      const insight = Array.isArray(res) ? res[0] : res;
      expect(insight?.ruleId).toBe('RULE_3_VENDOR_CANCELLED');
      expect(insight?.tradeOffs).toBeDefined();
    });
  });

  // Rule 4: ruleTimelineUrgency
  describe('Rule 4: ruleTimelineUrgency', () => {
    it('triggers urgency triage when daysRemaining <= 14', () => {
      const closePlan: DecisionEnginePlanInput = {
        ...basePlan,
        eventDate: '2026-06-10',
      };
      const summary = calculateBudgetSummary(closePlan.totalBudget, closePlan.budgetItems, closePlan.contingencyRate, closePlan.guestCount);
      const res = ruleTimelineUrgency.evaluate(closePlan, summary, new Date('2026-06-01')); // 9 days
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.type).toBe('action_required');
        expect(res.ruleId).toBe('RULE_4_DATE_TRIAGE');
      }
    });

    it('returns null when event is safely in the future (> 30 days) with no overdue tasks', () => {
      const farPlan: DecisionEnginePlanInput = {
        ...basePlan,
        eventDate: '2026-11-01',
        tasks: [],
      };
      const summary = calculateBudgetSummary(farPlan.totalBudget, farPlan.budgetItems, farPlan.contingencyRate, farPlan.guestCount);
      const res = ruleTimelineUrgency.evaluate(farPlan, summary, new Date('2026-06-01'));
      expect(res).toBeNull();
    });
  });

  // Rule 5: ruleOutdoorWeatherRisk
  describe('Rule 5: ruleOutdoorWeatherRisk', () => {
    it('warns for outdoor venue preference (garden_park, rooftop, etc.)', () => {
      const outdoorPlan: DecisionEnginePlanInput = {
        ...basePlan,
        venuePreference: 'garden_park',
        eventDate: '2026-07-15',
      };
      const summary = calculateBudgetSummary(outdoorPlan.totalBudget, outdoorPlan.budgetItems, outdoorPlan.contingencyRate, outdoorPlan.guestCount);
      const res = ruleOutdoorWeatherRisk.evaluate(outdoorPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.ruleId).toBe('RULE_5_OUTDOOR_WEATHER');
        expect(res.category).toBe('weather');
      }
    });

    it('returns null for indoor banquet hall', () => {
      const indoorPlan: DecisionEnginePlanInput = {
        ...basePlan,
        venuePreference: 'banquet_hall',
        eventDate: '2026-07-15',
      };
      const summary = calculateBudgetSummary(indoorPlan.totalBudget, indoorPlan.budgetItems, indoorPlan.contingencyRate, indoorPlan.guestCount);
      const res = ruleOutdoorWeatherRisk.evaluate(indoorPlan, summary, new Date('2026-06-01'));
      expect(res).toBeNull();
    });
  });

  // Rule 6: ruleLargeCapacityAndPerGuest
  describe('Rule 6: ruleLargeCapacityAndPerGuest', () => {
    it('triggers logistics warning when guestCount >= 250', () => {
      const largePlan: DecisionEnginePlanInput = {
        ...basePlan,
        guestCount: 300,
      };
      const summary = calculateBudgetSummary(largePlan.totalBudget, largePlan.budgetItems, largePlan.contingencyRate, largePlan.guestCount);
      const res = ruleLargeCapacityAndPerGuest.evaluate(largePlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      const insights = Array.isArray(res) ? res : [res!];
      expect(insights.some((i) => i.id === 'rule-large-capacity')).toBe(true);
    });

    it('safely handles 0 or negative guest count', () => {
      const zeroGuestPlan: DecisionEnginePlanInput = { ...basePlan, guestCount: 0 };
      const summary = calculateBudgetSummary(zeroGuestPlan.totalBudget, zeroGuestPlan.budgetItems, zeroGuestPlan.contingencyRate, zeroGuestPlan.guestCount);
      const res = ruleLargeCapacityAndPerGuest.evaluate(zeroGuestPlan, summary, new Date('2026-06-01'));
      expect(res).toBeNull();
    });
  });

  // Rule 7: ruleSoundCurfewAndPermit
  describe('Rule 7: ruleSoundCurfewAndPermit', () => {
    it('advises on 10 PM sound curfew for wedding celebrations', () => {
      const weddingPlan: DecisionEnginePlanInput = {
        ...basePlan,
        eventType: 'wedding',
      };
      const summary = calculateBudgetSummary(weddingPlan.totalBudget, weddingPlan.budgetItems, weddingPlan.contingencyRate, weddingPlan.guestCount);
      const res = ruleSoundCurfewAndPermit.evaluate(weddingPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      const insights = Array.isArray(res) ? res : [res!];
      expect(insights.some((i) => i.id === 'rule-baraat-curfew')).toBe(true);
    });
  });

  // Rule 8: ruleTaskDependencyBottlenecks
  describe('Rule 8: ruleTaskDependencyBottlenecks', () => {
    it('flags blocked tasks whose prerequisite task is overdue', () => {
      const blockedPlan: DecisionEnginePlanInput = {
        ...basePlan,
        tasks: [
          { id: 't1', title: 'Book Pandit Ji', category: 'rituals', dueDate: '2026-05-15', completed: false, priority: 'high' },
          { id: 't2', title: 'Procure Samagri Kit', category: 'rituals', dueDate: '2026-06-15', completed: false, priority: 'medium', dependencies: ['t1'] },
        ],
      };
      const summary = calculateBudgetSummary(blockedPlan.totalBudget, blockedPlan.budgetItems, blockedPlan.contingencyRate, blockedPlan.guestCount);
      const res = ruleTaskDependencyBottlenecks.evaluate(blockedPlan, summary, new Date('2026-06-01'), '2026-06-01');
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.ruleId).toBe('RULE_8_DEPENDENCY_BOTTLENECK');
        expect(res.message).toContain('Procure Samagri Kit');
      }
    });
  });

  // Rule 9: ruleAccessibilityNeeds
  describe('Rule 9: ruleAccessibilityNeeds', () => {
    it('surfaces accessibility checklist when wheelchair access or elder seating is requested', () => {
      const accessPlan: DecisionEnginePlanInput = {
        ...basePlan,
        accessibilityNeeds: ['Wheelchair Ramps & Golf Carts'],
      };
      const summary = calculateBudgetSummary(accessPlan.totalBudget, accessPlan.budgetItems, accessPlan.contingencyRate, accessPlan.guestCount);
      const res = ruleAccessibilityNeeds.evaluate(accessPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.ruleId).toBe('RULE_9_ACCESSIBILITY');
        expect(res.category).toBe('accessibility');
      }
    });
  });

  // Rule 10: ruleRsvpCapacityExceeded
  describe('Rule 10: ruleRsvpCapacityExceeded', () => {
    it('triggers alert when confirmed RSVPs exceed target guestCount', () => {
      const overflowPlan: DecisionEnginePlanInput = {
        ...basePlan,
        guestCount: 2,
        guests: [
          { id: 'g1', name: 'Rajesh', rsvpStatus: 'attending', plusOne: true, dietary: 'none' },
          { id: 'g2', name: 'Sunita', rsvpStatus: 'attending', plusOne: true, dietary: 'none' }, // 2 + 2 = 4 attending > 2 capacity
        ],
      };
      const summary = calculateBudgetSummary(overflowPlan.totalBudget, overflowPlan.budgetItems, overflowPlan.contingencyRate, overflowPlan.guestCount);
      const res = ruleRsvpCapacityExceeded.evaluate(overflowPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.type).toBe('warning');
        expect(res.ruleId).toBe('RULE_10_RSVP_CAPACITY');
      }
    });
  });

  // Rule 11: ruleDietaryAlert
  describe('Rule 11: ruleDietaryAlert', () => {
    it('surfaces catering notice when guests indicate special dietary requirements', () => {
      const dietaryPlan: DecisionEnginePlanInput = {
        ...basePlan,
        guests: [
          { id: 'g1', name: 'Aarav', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: false },
        ],
      };
      const summary = calculateBudgetSummary(dietaryPlan.totalBudget, dietaryPlan.budgetItems, dietaryPlan.contingencyRate, dietaryPlan.guestCount);
      const res = ruleDietaryAlert.evaluate(dietaryPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.ruleId).toBe('RULE_11_DIETARY_ALERT');
      }
    });
  });

  // Rule 12: ruleJainDietarySeparation
  describe('Rule 12: ruleJainDietarySeparation', () => {
    it('mandates isolated counter and distinct ladles when Jain guests are confirmed', () => {
      const jainPlan: DecisionEnginePlanInput = {
        ...basePlan,
        guests: [
          { id: 'g1', name: 'Vimal Shah', rsvpStatus: 'attending', plusOne: false, dietary: 'jain' },
        ],
      };
      const summary = calculateBudgetSummary(jainPlan.totalBudget, jainPlan.budgetItems, jainPlan.contingencyRate, jainPlan.guestCount);
      const res = ruleJainDietarySeparation.evaluate(jainPlan, summary, new Date('2026-06-01'));
      expect(res).not.toBeNull();
      if (res && !Array.isArray(res)) {
        expect(res.type).toBe('action_required');
        expect(res.ruleId).toBe('RULE_11B_JAIN_SEPARATION');
        expect(res.tradeOffs).toBeDefined();
        expect(res.tradeOffs?.length).toBe(2);
      }
    });
  });
});

describe('JSON Backup & Corrupted Data Restore (importPlanFromJson)', () => {
  it('successfully imports and sanitizes a valid EventPlan JSON string', () => {
    const sample = INITIAL_EVENTS[0];
    const jsonStr = JSON.stringify(sample);
    const result = importPlanFromJson(jsonStr);

    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan?.title).toBe(sample.title);
    expect(result.plan?.totalBudget).toBe(sample.totalBudget);
    // IDs are re-generated on import to prevent collision
    expect(result.plan?.id).toContain('imported-');
  });

  it('rejects empty or non-string inputs with helpful error', () => {
    const res1 = importPlanFromJson('');
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Empty or invalid');

    // @ts-expect-error test invalid type
    const res2 = importPlanFromJson(null);
    expect(res2.success).toBe(false);
  });

  it('safely recovers from malformed non-JSON strings without crashing', () => {
    const malformed = 'INVALID_JSON_CORRUPTED_{{{';
    const result = importPlanFromJson(malformed);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON format');
  });

  it('rejects oversized JSON payloads exceeding 2 MB cap', () => {
    const hugeStr = 'a'.repeat(2 * 1024 * 1024 + 10);
    const result = importPlanFromJson(hugeStr);
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed size');
  });

  it('rejects structurally invalid non-plan payloads', () => {
    const invalidObj = JSON.stringify({
      randomField: 'Not an event plan',
      number: 12345,
    });
    const result = importPlanFromJson(invalidObj);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed');
  });
});

describe('Date Compression Scenario & Timeline Re-pacing', () => {
  it('correctly shifts task milestones when event date moves earlier', () => {
    const sampleTasks = [
      { id: 't1', title: 'Book Venue', category: 'venue' as const, dueDate: '2026-11-01', completed: false, priority: 'urgent' as const },
      { id: 't2', title: 'Order Sweets', category: 'catering' as const, dueDate: '2026-11-20', completed: false, priority: 'medium' as const },
    ];

    const repaced = repaceTimelineTasks(sampleTasks, '2026-12-01', '2026-11-15', '2026-06-01');
    expect(repaced.length).toBe(2);
    // Due dates should have shifted earlier
    expect(new Date(repaced[0].dueDate).getTime()).toBeLessThan(new Date('2026-11-01').getTime());
    expect(new Date(repaced[1].dueDate).getTime()).toBeLessThan(new Date('2026-11-20').getTime());
  });
});
