import { describe, it, expect } from 'vitest';
import { generateCopilotAnswer } from '../services/copilotService';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import type { EventPlan } from '../types/event';

describe('EventWise AI Copilot Assistant Tests', () => {
  const weddingPlan: EventPlan = INITIAL_EVENTS[0];

  it('provides grounded actionable budget trimming advice', () => {
    const answer = generateCopilotAnswer(
      'How can I trim 10% from my budget without hurting the guest experience?',
      weddingPlan,
    );

    expect(answer).toBeDefined();
    expect(answer.length).toBeGreaterThan(100);
    expect(answer).toContain('targeted cost-saving strategy');
    expect(answer).toMatch(/catering|venue|floral|buffet/i);
  });

  it('provides dietary and catering protocol guidance for guest restrictions', () => {
    const answer = generateCopilotAnswer(
      'What catering questions must I ask the caterer regarding food allergies and diet?',
      weddingPlan,
    );

    expect(answer).toBeDefined();
    expect(answer).toContain('Essential questions for vetting your caterer');
    expect(answer).toMatch(/cross-contamination|headcount|vendor meal/i);
  });

  it('advises on timeline critical path and delay mitigation', () => {
    const answer = generateCopilotAnswer(
      'What is our critical path for the next 3 weeks and urgent milestones?',
      weddingPlan,
    );

    expect(answer).toBeDefined();
    expect(answer).toMatch(/Interview & Book Catering Partner|Book Pandit Ji|Send Formal Invitations|Send Invitations/i);
  });

  it('advises on Day-of Run of Show coordination', () => {
    const answer = generateCopilotAnswer(
      'Draft a sample day of ceremony and reception run of show itinerary.',
      weddingPlan,
    );

    expect(answer).toBeDefined();
    expect(answer).toContain('Day-of Run of Show structure');
    expect(answer).toMatch(/Vendor Load-in Buffer|Pacing Buffer/i);
  });

  it('provides comprehensive general advice when asking generic questions', () => {
    const answer = generateCopilotAnswer(
      'Give me an overview of best practices for planning this event.',
      weddingPlan,
    );

    expect(answer).toBeDefined();
    expect(answer).toContain(`Here is advice tailored for your wedding in ${weddingPlan.city}`);
    expect(answer).toContain('Headcount & Venue');
    expect(answer).toContain('Budget Allocation');
  });
});

