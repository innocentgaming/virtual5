import { describe, it, expect } from 'vitest';
import {
  budgetItemSchema,
  taskItemSchema,
  vendorItemSchema,
  ideaItemSchema,
  scheduleItemSchema,
  guestItemSchema,
  geminiPlanResponseSchema,
  storedEventPlanSchema,
} from '../schemas/eventSchemas';

describe('Event Zod Schemas Validation Suite', () => {
  it('validates a valid budget item', () => {
    const valid = {
      id: 'b-1',
      name: 'Royal Palace Venue Advance',
      category: 'venue',
      estimatedCost: 500000,
      actualCost: 480000,
      isPaid: true,
      notes: 'Initial booking advance deposit',
    };

    const result = budgetItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects budget items with negative costs', () => {
    const invalid = {
      name: 'Negative cost item',
      category: 'venue',
      estimatedCost: -500,
    };

    const result = budgetItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects string fields exceeding maximum character caps', () => {
    const oversizedString = 'A'.repeat(501);
    const item = {
      name: oversizedString,
      category: 'catering',
      estimatedCost: 10000,
    };

    const result = budgetItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it('validates a valid task item with dependencies', () => {
    const validTask = {
      id: 'task-10',
      title: 'Finalize Sangeet Choreographer',
      category: 'entertainment',
      dueDate: '2026-11-01',
      priority: 'high',
      completed: false,
      dependencies: ['task-1', 'task-2'],
    };

    const result = taskItemSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('validates a valid vendor item with interview questions', () => {
    const validVendor = {
      id: 'v-1',
      name: 'Shree Krishna Caterers',
      category: 'catering',
      role: 'Catering Lead',
      status: 'confirmed',
      estimatedCost: 350000,
      questionsToAsk: [
        'Do you provide live counters for Jain food?',
        'Can you handle midnight snacks post-baraat?',
      ],
    };

    const result = vendorItemSchema.safeParse(validVendor);
    expect(result.success).toBe(true);
  });

  it('validates idea items', () => {
    const validIdea = {
      id: 'idea-1',
      title: 'Drone Haldi Flower Shower',
      description: 'Petal drop timed with dhol entrance',
      category: 'decor',
      reasoning: 'Contemporary Royal Marwari trend',
    };

    const result = ideaItemSchema.safeParse(validIdea);
    expect(result.success).toBe(true);
  });

  it('validates schedule items', () => {
    const validSchedule = {
      id: 'sched-1',
      time: '18:00',
      title: 'Baraat Arrival & Welcome',
      category: 'ritual',
      description: 'Dhol tasha procession at main palace gate',
    };

    const result = scheduleItemSchema.safeParse(validSchedule);
    expect(result.success).toBe(true);
  });

  it('validates guest items', () => {
    const validGuest = {
      id: 'g-1',
      name: 'Suresh Singhania',
      email: 'suresh@example.com',
      rsvpStatus: 'confirmed',
      dietary: 'Jain',
      plusOnes: 2,
    };

    const result = guestItemSchema.safeParse(validGuest);
    expect(result.success).toBe(true);
  });

  it('validates complete Gemini AI response schema', () => {
    const aiResponse = {
      generationExplanation: 'Curated 3-day royal celebration plan',
      budgetItems: [
        {
          id: 'b-1',
          name: 'Venue Hall',
          category: 'venue',
          estimatedCost: 800000,
        },
      ],
      tasks: [
        {
          id: 't-1',
          title: 'Book Priest & Puja Samagri',
          category: 'rituals',
          dueDate: '2026-11-10',
          completed: false,
        },
      ],
      vendors: [
        {
          id: 'v-1',
          name: 'Royal Heritage Decorators',
          category: 'decor',
          status: 'researching',
        },
      ],
      ideas: [
        {
          id: 'i-1',
          title: 'Custom Welcome Mocktail Bar',
          category: 'catering',
          description: 'Specialty mocktails for Baraat reception',
        },
      ],
    };

    const result = geminiPlanResponseSchema.safeParse(aiResponse);
    expect(result.success).toBe(true);
  });

  it('validates stored EventPlan document snapshot', () => {
    const fullPlan = {
      id: 'plan-xyz',
      title: 'Grand Jaipur Wedding',
      eventType: 'wedding',
      city: 'Jaipur',
      eventDate: '2026-12-15',
      totalBudget: 4500000,
      contingencyRate: 0.15,
      guestCount: 300,
      venuePreference: 'palace',
      budgetItems: [],
      tasks: [],
      vendors: [],
      ideas: [],
      guests: [],
      schedule: [],
    };

    const result = storedEventPlanSchema.safeParse(fullPlan);
    expect(result.success).toBe(true);
  });
});
