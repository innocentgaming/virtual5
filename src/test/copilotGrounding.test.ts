import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventPlan } from '../types/event';
import {
  buildPlanSnapshot,
  validateStructuredAction,
  extractCopilotActions,
  generateCopilotAnswer,
  generateCopilotAnswerAsync,
} from '../services/copilotService';

describe('Copilot Grounding, Privacy & Action Safety (Step 2)', () => {
  const samplePlan: EventPlan = {
    id: 'test-evt-grounding',
    title: 'Aarav & Ananya Grand Wedding',
    eventType: 'wedding',
    eventDate: '2026-11-20',
    city: 'Jaipur, Rajasthan',
    guestCount: 250,
    totalBudget: 3500000,
    currency: '₹',
    contingencyRate: 0.12,
    venuePreference: 'palace_heritage',
    foodPreference: 'royal_marwari',
    theme: 'Royal Rajputana Gold',
    priorities: ['venue', 'catering'],
    accessibilityNeeds: ['Wheelchair Ramp access'],
    culturalTraditions: 'Traditional Marwari Vedic ceremonies',
    budgetItems: [
      {
        id: 'bi-cat-1',
        category: 'catering',
        name: 'Royal Heritage Banquet & Catering',
        estimatedCost: 1200000,
        actualCost: 1200000,
        notes: 'Includes live counters',
      },
      {
        id: 'bi-dec-1',
        category: 'decor',
        name: 'Palace Mandap & Floral Staging',
        estimatedCost: 600000,
        actualCost: 650000,
        notes: 'Imported blooms',
      },
      {
        id: 'bi-ven-1',
        category: 'venue',
        name: 'Heritage Palace Courtyard',
        estimatedCost: 800000,
        actualCost: 800000,
        notes: 'Courtyard hire',
      },
    ],
    tasks: [
      {
        id: 'tsk-1',
        title: 'Book Royal Halwai & Taste Menu',
        dueDate: '2026-09-01',
        completed: false,
        category: 'catering',
      },
      {
        id: 'tsk-2',
        title: 'Procure Police Loudspeaker & 10 PM Sound Clearance',
        dueDate: '2026-10-15',
        completed: false,
        category: 'permits',
      },
      {
        id: 'tsk-3',
        title: 'Confirm Pandit Ji for Muhurat',
        dueDate: '2026-08-20',
        completed: true,
        category: 'ceremony',
      },
    ],
    vendors: [
      {
        id: 'vnd-1',
        category: 'caterer',
        role: 'Royal Halwai',
        status: 'booked',
        estimatedCost: 1200000,
        contactName: 'Master Chef Sanjeev',
        contactPhone: '+91-9876543210',
        contactEmail: 'sanjeev@halwai.com',
        questionsToAsk: ['Segregated Jain kitchen?'],
      },
      {
        id: 'vnd-2',
        category: 'decorator',
        role: 'Palace Decorators',
        status: 'shortlisted',
        estimatedCost: 600000,
        contactName: 'Vikram Singh',
        contactPhone: '+91-9876543211',
        contactEmail: 'vikram@decor.com',
        questionsToAsk: [],
      },
    ],
    guests: [
      {
        id: 'gst-1',
        name: 'Shah Rukh Khan',
        email: 'srk@redchillies.com',
        phone: '+91-9999999999',
        rsvpStatus: 'attending',
        dietary: 'pure_veg',
        plusOne: true,
        plusOneName: 'Gauri Khan',
        notes: 'VIP Z-plus security protocol',
      },
      {
        id: 'gst-2',
        name: 'Amitabh Bachchan',
        email: 'amitabh@abcorp.com',
        phone: '+91-8888888888',
        rsvpStatus: 'attending',
        dietary: 'jain',
        plusOne: false,
        notes: 'Requires wheelchair assistance',
      },
      {
        id: 'gst-3',
        name: 'Priyanka Chopra',
        email: 'pc@peecee.com',
        phone: '+91-7777777777',
        rsvpStatus: 'pending',
        dietary: 'none',
        plusOne: true,
        plusOneName: 'Nick Jonas',
      },
    ],
    ideas: [],
    schedule: [],
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // 1. Snapshot Content & Real Numbers
  it('builds a compact plan snapshot referencing real budget totals, tasks, and dietary counts', () => {
    const snapshot = buildPlanSnapshot(samplePlan);

    // Assert real budget numbers
    expect(snapshot).toContain('₹35,00,000'); // Total Budget
    expect(snapshot).toContain('Jaipur, Rajasthan');
    expect(snapshot).toContain('250'); // Guest target
    expect(snapshot).toContain('12%'); // Contingency buffer rate

    // Assert tasks summary
    expect(snapshot).toContain('3 total');
    expect(snapshot).toContain('1 done');
    expect(snapshot).toContain('2 open');

    // Assert dietary aggregation
    expect(snapshot).toContain('pure veg: 1');
    expect(snapshot).toContain('jain: 1');

    // Assert length cap
    expect(snapshot.length).toBeLessThanOrEqual(1800);
  });

  // 2. Strict Privacy & Zero PII Guarantee
  it('strictly excludes all guest names, emails, phone numbers, and notes from plan snapshot', () => {
    const snapshot = buildPlanSnapshot(samplePlan);

    // None of the attendee PII must ever be leaked
    expect(snapshot).not.toContain('Shah Rukh Khan');
    expect(snapshot).not.toContain('srk@redchillies.com');
    expect(snapshot).not.toContain('+91-9999999999');
    expect(snapshot).not.toContain('Gauri Khan');
    expect(snapshot).not.toContain('Amitabh Bachchan');
    expect(snapshot).not.toContain('amitabh@abcorp.com');
    expect(snapshot).not.toContain('+91-8888888888');
    expect(snapshot).not.toContain('Priyanka Chopra');
    expect(snapshot).not.toContain('Nick Jonas');
    expect(snapshot).not.toContain('VIP Z-plus security protocol');

    // None of the vendor private contacts
    expect(snapshot).not.toContain('+91-9876543210');
    expect(snapshot).not.toContain('sanjeev@halwai.com');
  });

  // 3. Structured Action Validation
  it('validates and accepts legitimate structured actions', () => {
    const rawAction = {
      label: 'Trim Catering by ₹1,00,000',
      actionType: 'reduce_budget_item',
      impactFormatted: '-₹1,00,000',
      description: 'Switch from plated dinner to chef-attended buffet stations',
      deltaAmount: 100000,
      targetCategory: 'catering',
    };

    const validated = validateStructuredAction(rawAction, samplePlan);
    expect(validated).not.toBeNull();
    expect(validated?.actionType).toBe('reduce_budget_item');
    expect(validated?.payload.amount).toBe(100000);
    expect(validated?.payload.category).toBe('catering');
    expect(validated?.id).toMatch(/^ai-action-/);
  });

  // 4. Rejection of Invalid or Malicious Actions
  it('rejects invalid, negative, out-of-bounds, or unknown action types', () => {
    // Negative delta
    expect(
      validateStructuredAction(
        {
          label: 'Negative Trim',
          actionType: 'reduce_budget_item',
          deltaAmount: -50000,
        },
        samplePlan
      )
    ).toBeNull();

    // Amount exceeding total budget
    expect(
      validateStructuredAction(
        {
          label: 'Extreme Cut',
          actionType: 'reduce_budget_item',
          deltaAmount: 999999999,
        },
        samplePlan
      )
    ).toBeNull();

    // Unknown/unauthorized action type
    expect(
      validateStructuredAction(
        {
          label: 'Delete Database',
          actionType: 'delete_database' as any,
          deltaAmount: 1000,
        },
        samplePlan
      )
    ).toBeNull();

    // Non-existent vendor category for update_vendor_status
    expect(
      validateStructuredAction(
        {
          label: 'Cancel Submarine Vendor',
          actionType: 'update_vendor_status',
          targetCategory: 'submarine_operator',
        },
        samplePlan
      )
    ).toBeNull();
  });

  // 5. Action Parsing & Clean Text Extraction
  it('extracts embedded [ACTION: {...}] tags cleanly from AI response text', () => {
    const rawAiResponse =
      `Based on your active plan, you can optimize catering costs.\n\n` +
      `[ACTION: {"label":"Trim Catering by ₹1,80,000","actionType":"reduce_budget_item","impactFormatted":"-₹1,80,000","description":"Switch to royal buffet setup","deltaAmount":180000,"targetCategory":"catering"}]\n\n` +
      `This will free up budget for your contingency reserve.`;

    const { cleanText, actions } = extractCopilotActions(rawAiResponse, samplePlan);

    expect(actions).toHaveLength(1);
    expect(actions[0].label).toBe('Trim Catering by ₹1,80,000');
    expect(actions[0].payload.amount).toBe(180000);
    expect(cleanText).not.toContain('[ACTION:');
    expect(cleanText).toContain('Based on your active plan, you can optimize catering costs.');
    expect(cleanText).toContain('This will free up budget for your contingency reserve.');
  });

  // 6. Mocked Outbound Gemini Request with Grounding Assertion
  it('sends real plan numbers in Gemini prompt and forbids PII leakage over the wire', async () => {
    let capturedBody = '';

    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = String(init?.body || '');
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text:
                          'Here is how you can trim costs:\n- Repurpose mandap floral staging\n\n' +
                          '[ACTION: {"label":"Trim Decor by ₹50,000","actionType":"reduce_budget_item","impactFormatted":"-₹50,000","description":"Repurpose daytime flowers for evening reception","deltaAmount":50000,"targetCategory":"decor"}]',
                      },
                    ],
                  },
                },
              ],
            })
          ),
      });
    });

    const response = await generateCopilotAnswerAsync(
      'How do I trim 15% from my budget without impacting guests?',
      samplePlan,
      'test-api-key-123'
    );

    // Verify outbound prompt contains real grounded stats
    expect(capturedBody).toContain('=== ACTIVE EVENT PLAN SNAPSHOT ===');
    expect(capturedBody).toContain('₹35,00,000');
    expect(capturedBody).toContain('Jaipur, Rajasthan');
    expect(capturedBody).toContain('STRICT GROUNDING & TRUST DIRECTIVES');

    // Verify outbound prompt has ZERO guest PII
    expect(capturedBody).not.toContain('Shah Rukh Khan');
    expect(capturedBody).not.toContain('srk@redchillies.com');
    expect(capturedBody).not.toContain('Gauri Khan');
    expect(capturedBody).not.toContain('VIP Z-plus security protocol');

    // Verify response contains action tag that can be extracted
    const { actions } = extractCopilotActions(response, samplePlan);
    expect(actions).toHaveLength(1);
    expect(actions[0].label).toBe('Trim Decor by ₹50,000');
    expect(actions[0].payload.amount).toBe(50000);
  });

  // 7. Offline Copilot Grounding & Boundary Enforcement
  it('answers from snapshot offline and explicitly declines ungrounded queries', () => {
    // Grounded offline answer
    const budgetAnswer = generateCopilotAnswer('How to cut ₹50K from catering budget?', samplePlan);
    expect(budgetAnswer).toContain('₹35,00,000');
    expect(budgetAnswer).toContain('Catering Optimization');
    expect(budgetAnswer).toContain('[ACTION:');

    // Curfew & local municipal rules guidance
    const curfewAnswer = generateCopilotAnswer('What are the 10 PM curfew rules and sound permits?', samplePlan);
    expect(curfewAnswer).toContain('10:00 PM Sound Curfew');
    expect(curfewAnswer).toContain('Check local ward guidelines');

    // Ungrounded external query refusal
    const ungroundedAnswer = generateCopilotAnswer('What is the current stock price of Reliance and weather tomorrow?', samplePlan);
    expect(ungroundedAnswer).toContain('grounded specifically in your active event plan');
    expect(ungroundedAnswer).toContain('do not have access to live external weather forecasts');
  });
});
