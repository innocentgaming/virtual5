import { describe, it, expect } from 'vitest';
import { generateFallbackPlan } from '../services/fallbackPlanner';

describe('Deterministic Fallback Planning Engine', () => {
  it('generates a full wedding plan with essential vendor categories and date-aware tasks', () => {
    const plan = generateFallbackPlan({
      title: 'Romantic Garden Wedding',
      eventType: 'wedding',
      eventDate: '2026-12-20',
      city: 'Portland, OR',
      guestCount: 120,
      totalBudget: 25000,
      venuePreference: 'garden_park',
      foodPreference: 'buffet',
      theme: 'Botanical Warm Glow',
      priorities: ['venue', 'catering', 'photography'],
      contingencyRate: 0.10,
    });

    expect(plan.eventType).toBe('wedding');
    expect(plan.city).toBe('Portland, OR');
    expect(plan.guestCount).toBe(120);
    expect(plan.plannerSource).toBe('fallback_rule_engine');
    expect(plan.totalBudget).toBe(25000);

    // Verify key categories exist in budget
    const categories = plan.budgetItems.map((b) => b.category);
    expect(categories).toContain('venue');
    expect(categories).toContain('catering');
    expect(categories).toContain('photography');

    // Verify vendor checklist includes interview questions
    expect(plan.vendors.length).toBeGreaterThan(2);
    plan.vendors.forEach((vendor) => {
      expect(vendor.questionsToAsk.length).toBeGreaterThan(0);
      expect(vendor.status).toBeDefined();
    });

    // Verify tiered ideas are generated
    expect(plan.ideas.some((i) => i.tier === 'budget')).toBe(true);
    expect(plan.ideas.some((i) => i.tier === 'balanced')).toBe(true);
    expect(plan.ideas.some((i) => i.tier === 'premium')).toBe(true);
  });

  it('generates distinct tailored content for birthday and community events', () => {
    const birthdayPlan = generateFallbackPlan({
      eventType: 'birthday',
      eventDate: '2026-11-15',
      city: 'Austin, TX',
      guestCount: 30,
      totalBudget: 3000,
      venuePreference: 'rooftop',
    });

    expect(birthdayPlan.eventType).toBe('birthday');
    expect(birthdayPlan.budgetItems.some((b) => b.name.toLowerCase().includes('cake'))).toBe(true);

    const communityPlan = generateFallbackPlan({
      eventType: 'community',
      eventDate: '2026-11-20',
      city: 'Chicago, IL',
      guestCount: 200,
      totalBudget: 8000,
      venuePreference: 'community_center',
    });

    expect(communityPlan.eventType).toBe('community');
    expect(communityPlan.budgetItems.some((b) => b.name.toLowerCase().includes('permit') || b.name.toLowerCase().includes('facility'))).toBe(true);
  });

  it('adjusts task lead times for short-notice events (< 21 days)', () => {
    // 10 days in the future
    const soonDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

    const shortPlan = generateFallbackPlan({
      eventType: 'birthday',
      eventDate: soonDate,
      city: 'Miami, FL',
      guestCount: 25,
      totalBudget: 2000,
    });

    // Verify urgent tasks are generated
    const hasUrgentTask = shortPlan.tasks.some((t) => t.priority === 'urgent');
    expect(hasUrgentTask).toBe(true);
  });
});
