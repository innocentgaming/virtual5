import { z } from 'zod';

const cappedString = (max = 500) => z.string().max(max);

export const budgetCategorySchema = z.enum([
  'venue',
  'catering',
  'decor',
  'photography',
  'entertainment',
  'logistics',
  'invitations',
  'contingency',
  'other',
]);

export const budgetItemSchema = z
  .object({
    id: cappedString(100).optional(),
    name: cappedString(500),
    category: z.string(),
    estimatedCost: z.number().nonnegative(),
    actualCost: z.number().nonnegative().optional(),
    isPaid: z.boolean().optional(),
    isPerGuest: z.boolean().optional(),
    notes: cappedString(500).optional(),
    priority: cappedString(100).optional(),
    vendor: cappedString(500).optional(),
    dueDate: cappedString(50).optional(),
  })
  .passthrough();

export const taskItemSchema = z
  .object({
    id: cappedString(100).optional(),
    title: cappedString(500),
    category: cappedString(100).optional(),
    dueDate: cappedString(50).optional(),
    priority: cappedString(100).optional(),
    completed: z.boolean().optional(),
    notes: cappedString(500).optional(),
    dependencies: z.array(cappedString(100)).optional(),
  })
  .passthrough();

export const vendorItemSchema = z
  .object({
    id: cappedString(100).optional(),
    name: cappedString(500).optional(),
    category: cappedString(100).optional(),
    role: cappedString(500).optional(),
    status: cappedString(100).optional(),
    estimatedCost: z.number().nonnegative().optional(),
    notes: cappedString(500).optional(),
    questionsToAsk: z.array(cappedString(500)).optional(),
  })
  .passthrough();

export const ideaItemSchema = z
  .object({
    id: cappedString(100).optional(),
    title: cappedString(500),
    category: cappedString(100).optional(),
    description: cappedString(500).optional(),
    tier: cappedString(100).optional(),
    costImpact: cappedString(200).optional(),
    reasoning: cappedString(500).optional(),
  })
  .passthrough();

export const scheduleItemSchema = z
  .object({
    id: cappedString(100).optional(),
    time: cappedString(50).optional(),
    startTime: cappedString(50).optional(),
    endTime: cappedString(50).optional(),
    title: cappedString(500),
    category: cappedString(100).optional(),
    description: cappedString(500).optional(),
    location: cappedString(200).optional(),
  })
  .passthrough();

export const guestItemSchema = z
  .object({
    id: cappedString(100).optional(),
    name: cappedString(500),
    email: cappedString(200).optional(),
    phone: cappedString(50).optional(),
    rsvpStatus: cappedString(50).optional(),
    category: cappedString(100).optional(),
    dietary: cappedString(100).optional(),
    plusOnes: z.number().int().min(0).optional(),
    notes: cappedString(500).optional(),
  })
  .passthrough();

/**
 * Zod schema for validating the structured JSON returned by Gemini API.
 */
export const geminiPlanResponseSchema = z
  .object({
    title: cappedString(500).optional(),
    generationExplanation: cappedString(500).optional(),
    budgetItems: z.array(budgetItemSchema),
    tasks: z.array(taskItemSchema),
    vendors: z.array(vendorItemSchema),
    ideas: z.array(ideaItemSchema),
    schedule: z.array(scheduleItemSchema).optional(),
    guests: z.array(guestItemSchema).optional(),
  })
  .passthrough();

/**
 * Zod schema for validating EventPlan snapshots stored in localStorage.
 */
export const storedEventPlanSchema = z
  .object({
    id: cappedString(100),
    title: cappedString(500),
    eventType: z.enum(['wedding', 'birthday', 'community']),
    eventDate: cappedString(50),
    city: cappedString(200),
    guestCount: z.number().int().nonnegative(),
    totalBudget: z.number().nonnegative(),
    currency: cappedString(10).optional(),
    contingencyRate: z.number().min(0).max(0.5).optional(),
    venuePreference: cappedString(100).optional(),
    foodPreference: cappedString(100).optional(),
    theme: cappedString(200).optional(),
    culturalTraditions: cappedString(500).optional(),
    specialNotes: cappedString(500).optional(),
    budgetItems: z.array(budgetItemSchema),
    tasks: z.array(taskItemSchema),
    vendors: z.array(vendorItemSchema),
    ideas: z.array(ideaItemSchema),
    guests: z.array(guestItemSchema).optional(),
    schedule: z.array(scheduleItemSchema).optional(),
  })
  .passthrough();
