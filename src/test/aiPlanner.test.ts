import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAIEventPlan } from '../services/aiPlanner';

describe('AI Planner & Safe Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to rule engine immediately when no API key is provided', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    const plan = await generateAIEventPlan({
      eventType: 'wedding',
      eventDate: '2026-11-20',
      city: 'Boston, MA',
      guestCount: 80,
      totalBudget: 15000,
    });

    expect(plan.plannerSource).toBe('fallback_rule_engine');
    expect(plan.city).toBe('Boston, MA');
    expect(plan.budgetItems.length).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });

  it('handles network failure or API errors gracefully by recovering to fallback engine', async () => {
    // Mock global fetch returning 500 error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const plan = await generateAIEventPlan({
      eventType: 'birthday',
      eventDate: '2026-11-20',
      city: 'Dallas, TX',
      guestCount: 40,
      totalBudget: 4000,
      customApiKey: 'fake-api-key',
    });

    expect(plan.plannerSource).toBe('fallback_rule_engine');
    expect(plan.budgetItems.length).toBeGreaterThan(0);
  });

  it('recovers to fallback engine when AI returns malformed non-JSON output', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'This is not JSON!' }] } }],
      }),
    });

    const plan = await generateAIEventPlan({
      eventType: 'community',
      eventDate: '2026-11-20',
      city: 'Atlanta, GA',
      guestCount: 150,
      totalBudget: 10000,
      customApiKey: 'fake-api-key',
    });

    expect(plan.plannerSource).toBe('fallback_rule_engine');
    expect(plan.tasks.length).toBeGreaterThan(0);
  });
});
