import { describe, it, expect } from 'vitest';
import { evaluateDecisionRules } from '../services/decisionEngine';

describe('Decision Engine Business Rules', () => {
  const basePlan = {
    eventType: 'wedding' as const,
    totalBudget: 10000,
    budgetItems: [
      { id: '1', name: 'Venue Rental', category: 'venue' as const, estimatedCost: 4000, priority: 'essential' as const },
      { id: '2', name: 'Catering Buffet', category: 'catering' as const, estimatedCost: 3500, priority: 'essential' as const },
    ],
    contingencyRate: 0.10,
    eventDate: '2026-12-01',
    guestCount: 80,
    venuePreference: 'banquet_hall' as const,
    foodPreference: 'buffet' as const,
    accessibilityNeeds: [],
    priorities: ['venue' as const, 'catering' as const],
    city: 'Jaipur, Rajasthan',
    tasks: [],
  };

  it('detects missing critical information and generates targeted prompts', () => {
    const incompletePlan = {
      ...basePlan,
      totalBudget: 0,
      guestCount: 0,
      city: '',
      eventDate: '',
    };

    const { missingPrompts } = evaluateDecisionRules(incompletePlan);
    expect(missingPrompts.length).toBe(4);
    expect(missingPrompts.some((p) => p.includes('budget'))).toBe(true);
    expect(missingPrompts.some((p) => p.includes('guests'))).toBe(true);
    expect(missingPrompts.some((p) => p.includes('city'))).toBe(true);
    expect(missingPrompts.some((p) => p.includes('date'))).toBe(true);
  });

  it('triggers budget overage warning and recommendations when expenses exceed budget', () => {
    const overBudgetPlan = {
      ...basePlan,
      totalBudget: 5000,
      budgetItems: [
        { id: '1', name: 'Pricey Venue', category: 'venue' as const, estimatedCost: 4000, priority: 'essential' as const },
        { id: '2', name: 'Dinner', category: 'catering' as const, estimatedCost: 2500, priority: 'essential' as const },
      ], // total = 6500 + 500 (contingency) = 7000 vs 5000 budget
    };

    const { insights } = evaluateDecisionRules(overBudgetPlan);
    const budgetWarning = insights.find((i) => i.id === 'rule-budget-exceeded');
    expect(budgetWarning).toBeDefined();
    expect(budgetWarning?.type).toBe('warning');
    expect(budgetWarning?.message).toContain('buffet');
  });

  it('generates weather contingency suggestion for outdoor venues', () => {
    const outdoorPlan = {
      ...basePlan,
      venuePreference: 'garden_park' as const,
    };

    const { insights } = evaluateDecisionRules(outdoorPlan);
    const weatherInsight = insights.find((i) => i.id === 'rule-outdoor-weather');
    expect(weatherInsight).toBeDefined();
    expect(weatherInsight?.message).toContain('canopy/marquee tent');
    expect(weatherInsight?.message).not.toContain('temperature will be'); // No false weather claims
  });

  it('flags short-notice urgent triage when event is within 14 days', () => {
    const shortNoticePlan = {
      ...basePlan,
      eventDate: '2026-10-25',
    };

    // Simulated evaluation date: 2026-10-20 (5 days before)
    const { insights } = evaluateDecisionRules(shortNoticePlan, '2026-10-20');
    const urgentInsight = insights.find((i) => i.id === 'rule-date-urgent');
    expect(urgentInsight).toBeDefined();
    expect(urgentInsight?.title).toContain('Short-Notice');
  });

  it('flags warning when event date has already passed', () => {
    const pastPlan = {
      ...basePlan,
      eventDate: '2026-01-10',
    };

    const { insights } = evaluateDecisionRules(pastPlan, '2026-10-21');
    const pastInsight = insights.find((i) => i.id === 'rule-date-past');
    expect(pastInsight).toBeDefined();
    expect(pastInsight?.type).toBe('action_required');
  });

  it('injects accessibility requirements when accessibility needs are specified', () => {
    const accessiblePlan = {
      ...basePlan,
      accessibilityNeeds: ['Wheelchair accessibility', 'ASL interpreter'],
    };

    const { insights } = evaluateDecisionRules(accessiblePlan);
    const accessInsight = insights.find((i) => i.id === 'rule-accessibility-integration');
    expect(accessInsight).toBeDefined();
    expect(accessInsight?.message).toContain('step-free entrance');
  });

  it('warns for large guest count capacity logistics (> 250 guests)', () => {
    const largePlan = {
      ...basePlan,
      guestCount: 350,
    };

    const { insights } = evaluateDecisionRules(largePlan);
    const capacityInsight = insights.find((i) => i.id === 'rule-large-capacity');
    expect(capacityInsight).toBeDefined();
    expect(capacityInsight?.title).toContain('High Guest Count');
  });

  it('detects vendor price escalation and generates actionable budget trade-offs', () => {
    const priceEscalatedPlan = {
      ...basePlan,
      totalBudget: 800000,
      budgetItems: [
        {
          id: 'b-cat',
          name: 'Royal Feast Catering',
          category: 'catering' as const,
          estimatedCost: 300000,
          actualCost: 360000, // 20% price increase
          priority: 'essential' as const,
        },
        {
          id: 'b-decor',
          name: 'Mandap Floral Decor',
          category: 'decor' as const,
          estimatedCost: 150000,
          priority: 'recommended' as const,
        },
      ],
    };

    const { insights } = evaluateDecisionRules(priceEscalatedPlan);
    const spikeInsight = insights.find((i) => i.id === 'rule-vendor-cost-spike');
    expect(spikeInsight).toBeDefined();
    expect(spikeInsight?.title).toContain('Vendor Cost Escalation');
    expect(spikeInsight?.message).toContain('Dynamic Decision Tradeoff');
    expect(spikeInsight?.message).toContain('Trim decoration budget');
  });
});
