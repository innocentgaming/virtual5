/**
 * Zero-dependency robust data validators and sanitizers.
 * Enforces strict boundaries on untrusted data from Gemini AI, localStorage, and JSON imports.
 *
 * Security controls:
 * 1. String length caps and non-printable control-character stripping.
 * 2. Strict enum allowlists with safe fallbacks (unknown values mapped to safe defaults).
 * 3. Finite-number validation: rejects NaN, Infinity, and enforces reasonable economic upper bounds.
 * 4. Array size caps (≤ 60 budget items, ≤ 80 tasks, ≤ 30 vendors, ≤ 30 ideas, etc.).
 * 5. Regenerated unique IDs to neutralize ID collisions and injection payloads.
 * 6. String-only vendor questions and deep object sanitization.
 */

import type {
  EventPlan,
  EventType,
  VenuePreference,
  FoodPreference,
  PriorityArea,
  BudgetCategory,
  BudgetItem,
  TaskCategory,
  TaskPriority,
  TaskItem,
  VendorCategory,
  VendorStatus,
  VendorItem,
  PersonalizedIdea,
  GuestItem,
  ScheduleItem,
  DietaryRequirement,
  RsvpStatus,
  DecisionInsight,
} from '../types/event';

export const LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_CITY_LENGTH: 80,
  MAX_THEME_LENGTH: 100,
  MAX_TRADITIONS_LENGTH: 200,
  MAX_NOTES_LENGTH: 500,
  MAX_ITEM_NAME_LENGTH: 100,
  MAX_ROLE_LENGTH: 80,
  MAX_QUESTION_LENGTH: 200,
  MAX_EXPLANATION_LENGTH: 600,

  MAX_BUDGET_ITEMS: 60,
  MAX_TASKS: 80,
  MAX_VENDORS: 30,
  MAX_IDEAS: 30,
  MAX_GUEST_ITEMS: 500,
  MAX_SCHEDULE_ITEMS: 50,
  MAX_QUESTIONS_PER_VENDOR: 10,

  MIN_BUDGET: 1000,
  MAX_BUDGET: 1_000_000_000, // 100 Crore INR
  MIN_COST: 0,
  MAX_ITEM_COST: 100_000_000, // 10 Crore INR
  MIN_GUESTS: 1,
  MAX_GUEST_COUNT: 100_000,
  MIN_CONTINGENCY: 0,
  MAX_CONTINGENCY: 0.5, // 50%
} as const;

/**
 * Strips ASCII control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F).
 * Preserves tab (0x09) and newline (0x0A) for formatting.
 */
export function stripControlChars(input: string): string {
  if (!input) return '';
  // oxlint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Strips control characters, trims, and truncates to maxLength.
 */
export function sanitizeString(
  val: unknown,
  maxLength: number,
  fallback = ''
): string {
  if (typeof val !== 'string' && typeof val !== 'number') {
    return fallback;
  }
  const clean = stripControlChars(String(val)).trim();
  if (!clean) return fallback;
  return clean.slice(0, maxLength);
}

/**
 * Validates that a number is strictly finite and clamps within [min, max].
 * Rejects NaN, Infinity, -Infinity, and non-numeric values.
 */
export function sanitizeFiniteNumber(
  val: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return fallback;
  }
  return Math.min(Math.max(num, min), max);
}

/**
 * Validates ISO 8601 date format (YYYY-MM-DD) and checks for real calendar validity.
 */
export function sanitizeIsoDate(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return fallback;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  ) {
    return trimmed;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Enums Allowlists
// ---------------------------------------------------------------------------

const ALLOWED_EVENT_TYPES: readonly EventType[] = ['wedding', 'birthday', 'community'];
export function sanitizeEventType(val: unknown, fallback: EventType = 'wedding'): EventType {
  return typeof val === 'string' && (ALLOWED_EVENT_TYPES as readonly string[]).includes(val)
    ? (val as EventType)
    : fallback;
}

const ALLOWED_VENUE_PREFS: readonly VenuePreference[] = [
  'indoor',
  'outdoor',
  'banquet_hall',
  'garden_park',
  'community_center',
  'beach',
  'rooftop',
  'hotel',
  'heritage_haveli',
  'farmhouse_lawn',
  'resort_lawn',
];
export function sanitizeVenuePreference(val: unknown, fallback: VenuePreference = 'banquet_hall'): VenuePreference {
  return typeof val === 'string' && (ALLOWED_VENUE_PREFS as readonly string[]).includes(val)
    ? (val as VenuePreference)
    : fallback;
}

const ALLOWED_FOOD_PREFS: readonly FoodPreference[] = [
  'buffet',
  'plated',
  'cocktail',
  'food_trucks',
  'family_style',
  'potluck',
  'royal_thali',
  'live_chaat_counters',
];
export function sanitizeFoodPreference(val: unknown, fallback: FoodPreference = 'buffet'): FoodPreference {
  return typeof val === 'string' && (ALLOWED_FOOD_PREFS as readonly string[]).includes(val)
    ? (val as FoodPreference)
    : fallback;
}

const ALLOWED_PRIORITY_AREAS: readonly PriorityArea[] = [
  'venue',
  'catering',
  'photography',
  'entertainment',
  'decor',
  'budget_savings',
  'guest_experience',
];
export function sanitizePriorityAreas(val: unknown, fallback: PriorityArea[] = ['guest_experience']): PriorityArea[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .filter((item): item is PriorityArea => typeof item === 'string' && (ALLOWED_PRIORITY_AREAS as readonly string[]).includes(item));
  return cleaned.length > 0 ? cleaned : fallback;
}

const ALLOWED_BUDGET_CATEGORIES: readonly BudgetCategory[] = [
  'venue',
  'catering',
  'decor',
  'photography',
  'entertainment',
  'logistics',
  'invitations',
  'contingency',
  'other',
];
export function sanitizeBudgetCategory(val: unknown, fallback: BudgetCategory = 'other'): BudgetCategory {
  return typeof val === 'string' && (ALLOWED_BUDGET_CATEGORIES as readonly string[]).includes(val)
    ? (val as BudgetCategory)
    : fallback;
}

const ALLOWED_BUDGET_PRIORITIES = ['essential', 'recommended', 'optional'] as const;
export function sanitizeBudgetItemPriority(val: unknown, fallback: BudgetItem['priority'] = 'recommended'): BudgetItem['priority'] {
  return typeof val === 'string' && (ALLOWED_BUDGET_PRIORITIES as readonly string[]).includes(val)
    ? (val as BudgetItem['priority'])
    : fallback;
}

const ALLOWED_TASK_CATEGORIES: readonly TaskCategory[] = [
  'venue',
  'catering',
  'vendors',
  'guests',
  'decor',
  'logistics',
  'final',
];
export function sanitizeTaskCategory(val: unknown, fallback: TaskCategory = 'final'): TaskCategory {
  return typeof val === 'string' && (ALLOWED_TASK_CATEGORIES as readonly string[]).includes(val)
    ? (val as TaskCategory)
    : fallback;
}

const ALLOWED_TASK_PRIORITIES: readonly TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
export function sanitizeTaskPriority(val: unknown, fallback: TaskPriority = 'medium'): TaskPriority {
  return typeof val === 'string' && (ALLOWED_TASK_PRIORITIES as readonly string[]).includes(val)
    ? (val as TaskPriority)
    : fallback;
}

const ALLOWED_VENDOR_CATEGORIES: readonly VendorCategory[] = [
  'venue',
  'caterer',
  'photographer',
  'decorator',
  'entertainment',
  'officiant',
  'transport',
  'baker',
  'pandit_priest',
  'mehendi',
  'dhol_band',
  'safa_turban',
  'mithai_favors',
  'other',
];
export function sanitizeVendorCategory(val: unknown, fallback: VendorCategory = 'other'): VendorCategory {
  return typeof val === 'string' && (ALLOWED_VENDOR_CATEGORIES as readonly string[]).includes(val)
    ? (val as VendorCategory)
    : fallback;
}

const ALLOWED_VENDOR_STATUSES: readonly VendorStatus[] = [
  'not_started',
  'contacted',
  'shortlisted',
  'booked',
  'completed',
];
export function sanitizeVendorStatus(val: unknown, fallback: VendorStatus = 'not_started'): VendorStatus {
  return typeof val === 'string' && (ALLOWED_VENDOR_STATUSES as readonly string[]).includes(val)
    ? (val as VendorStatus)
    : fallback;
}

const ALLOWED_IDEA_CATEGORIES = ['theme', 'decor', 'activity', 'food', 'entertainment', 'invitation'] as const;
export function sanitizeIdeaCategory(val: unknown, fallback: PersonalizedIdea['category'] = 'activity'): PersonalizedIdea['category'] {
  return typeof val === 'string' && (ALLOWED_IDEA_CATEGORIES as readonly string[]).includes(val)
    ? (val as PersonalizedIdea['category'])
    : fallback;
}

const ALLOWED_IDEA_TIERS = ['budget', 'balanced', 'premium'] as const;
export function sanitizeIdeaTier(val: unknown, fallback: PersonalizedIdea['tier'] = 'balanced'): PersonalizedIdea['tier'] {
  return typeof val === 'string' && (ALLOWED_IDEA_TIERS as readonly string[]).includes(val)
    ? (val as PersonalizedIdea['tier'])
    : fallback;
}

const ALLOWED_DIETARY: readonly DietaryRequirement[] = [
  'none',
  'vegetarian',
  'jain',
  'pure_veg',
  'vegan',
  'gluten_free',
  'halal',
  'kosher',
  'nut_allergy',
];
export function sanitizeDietaryRequirement(val: unknown, fallback: DietaryRequirement = 'none'): DietaryRequirement {
  return typeof val === 'string' && (ALLOWED_DIETARY as readonly string[]).includes(val)
    ? (val as DietaryRequirement)
    : fallback;
}

const ALLOWED_RSVP: readonly RsvpStatus[] = ['attending', 'declined', 'pending'];
export function sanitizeRsvpStatus(val: unknown, fallback: RsvpStatus = 'pending'): RsvpStatus {
  return typeof val === 'string' && (ALLOWED_RSVP as readonly string[]).includes(val)
    ? (val as RsvpStatus)
    : fallback;
}

// ---------------------------------------------------------------------------
// ID Generation (Never trust external / AI IDs)
// ---------------------------------------------------------------------------
let idCounter = 0;
export function generateSafeId(prefix: string, index?: number): string {
  idCounter = (idCounter + 1) % 1_000_000;
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const idx = typeof index === 'number' ? `-${index}` : '';
  return `${prefix}${idx}-${Date.now().toString(36)}-${idCounter}-${randomSuffix}`;
}

// ---------------------------------------------------------------------------
// Item Sanitizers
// ---------------------------------------------------------------------------

export function sanitizeBudgetItem(raw: unknown, index: number): BudgetItem {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: generateSafeId('b', index),
    name: sanitizeString(obj.name, LIMITS.MAX_ITEM_NAME_LENGTH, 'Planned Expense'),
    category: sanitizeBudgetCategory(obj.category, 'other'),
    estimatedCost: sanitizeFiniteNumber(obj.estimatedCost, LIMITS.MIN_COST, LIMITS.MAX_ITEM_COST, 0),
    actualCost: obj.actualCost !== undefined
      ? sanitizeFiniteNumber(obj.actualCost, LIMITS.MIN_COST, LIMITS.MAX_ITEM_COST, 0)
      : undefined,
    isPaid: Boolean(obj.isPaid),
    isPerGuest: Boolean(obj.isPerGuest),
    notes: sanitizeString(obj.notes, LIMITS.MAX_NOTES_LENGTH, ''),
    priority: sanitizeBudgetItemPriority(obj.priority, 'recommended'),
  };
}

export function sanitizeTaskItem(raw: unknown, index: number, defaultDueDate: string): TaskItem {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawDeps = Array.isArray(obj.dependencies) ? obj.dependencies : [];
  return {
    id: generateSafeId('t', index),
    title: sanitizeString(obj.title, LIMITS.MAX_ITEM_NAME_LENGTH, 'Milestone Task'),
    category: sanitizeTaskCategory(obj.category, 'final'),
    dueDate: sanitizeIsoDate(obj.dueDate, defaultDueDate),
    completed: Boolean(obj.completed),
    priority: sanitizeTaskPriority(obj.priority, 'medium'),
    dependencies: rawDeps.map((d) => sanitizeString(d, 50)).filter(Boolean),
    notes: sanitizeString(obj.notes, LIMITS.MAX_NOTES_LENGTH, ''),
  };
}

export function sanitizeVendorItem(raw: unknown, index: number): VendorItem {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawQuestions = Array.isArray(obj.questionsToAsk) ? obj.questionsToAsk : [];
  const questionsToAsk = rawQuestions
    .slice(0, LIMITS.MAX_QUESTIONS_PER_VENDOR)
    .map((q) => sanitizeString(q, LIMITS.MAX_QUESTION_LENGTH))
    .filter(Boolean);

  return {
    id: generateSafeId('v', index),
    category: sanitizeVendorCategory(obj.category, 'other'),
    role: sanitizeString(obj.role, LIMITS.MAX_ROLE_LENGTH, 'Service Specialist'),
    status: sanitizeVendorStatus(obj.status, 'not_started'),
    estimatedCost: sanitizeFiniteNumber(obj.estimatedCost, LIMITS.MIN_COST, LIMITS.MAX_ITEM_COST, 0),
    contactName: sanitizeString(obj.contactName, 80, ''),
    contactPhone: sanitizeString(obj.contactPhone, 30, ''),
    contactEmail: sanitizeString(obj.contactEmail, 80, ''),
    notes: sanitizeString(obj.notes, LIMITS.MAX_NOTES_LENGTH, ''),
    questionsToAsk,
  };
}

export function sanitizeIdeaItem(raw: unknown, index: number): PersonalizedIdea {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: generateSafeId('idea', index),
    category: sanitizeIdeaCategory(obj.category, 'activity'),
    title: sanitizeString(obj.title, LIMITS.MAX_ITEM_NAME_LENGTH, 'Creative Concept'),
    description: sanitizeString(obj.description, LIMITS.MAX_NOTES_LENGTH, ''),
    tier: sanitizeIdeaTier(obj.tier, 'balanced'),
    costImpact: sanitizeString(obj.costImpact, 50, 'Moderate'),
    reasoning: sanitizeString(obj.reasoning, LIMITS.MAX_NOTES_LENGTH, 'Curated for event specs'),
  };
}

export function sanitizeGuestItem(raw: unknown, index: number): GuestItem {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: generateSafeId('g', index),
    name: sanitizeString(obj.name, 80, 'Guest'),
    email: sanitizeString(obj.email, 80, ''),
    rsvpStatus: sanitizeRsvpStatus(obj.rsvpStatus, 'pending'),
    dietary: sanitizeDietaryRequirement(obj.dietary, 'none'),
    plusOne: Boolean(obj.plusOne),
    plusOneName: sanitizeString(obj.plusOneName, 80, ''),
    tableNumber: sanitizeString(obj.tableNumber, 20, ''),
    notes: sanitizeString(obj.notes, LIMITS.MAX_NOTES_LENGTH, ''),
  };
}

export function sanitizeScheduleItem(raw: unknown, index: number): ScheduleItem {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: generateSafeId('sch', index),
    time: sanitizeString(obj.time, 20, '09:00 AM'),
    activity: sanitizeString(obj.activity, LIMITS.MAX_ITEM_NAME_LENGTH, 'Activity'),
    location: sanitizeString(obj.location, 80, 'Main Venue'),
    responsibleRole: sanitizeString(obj.responsibleRole, 80, 'Coordinator'),
    notes: sanitizeString(obj.notes, LIMITS.MAX_NOTES_LENGTH, ''),
  };
}

// ---------------------------------------------------------------------------
// Complete EventPlan Validator and Sanitizer
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  plan: EventPlan;
  errors: string[];
}

export function validateAndSanitizeEventPlan(
  raw: unknown,
  fallbackDate = '2026-11-20'
): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: ['Invalid payload: expected an object'],
      plan: createEmptySafePlan(fallbackDate),
    };
  }

  const obj = raw as Record<string, unknown>;

  const defaultDate = sanitizeIsoDate(obj.eventDate, fallbackDate);

  const budgetItemsRaw = Array.isArray(obj.budgetItems) ? obj.budgetItems : [];
  const tasksRaw = Array.isArray(obj.tasks) ? obj.tasks : [];
  const vendorsRaw = Array.isArray(obj.vendors) ? obj.vendors : [];
  const ideasRaw = Array.isArray(obj.ideas) ? obj.ideas : [];
  const guestsRaw = Array.isArray(obj.guests) ? obj.guests : [];
  const scheduleRaw = Array.isArray(obj.schedule) ? obj.schedule : [];

  const budgetItems = budgetItemsRaw
    .slice(0, LIMITS.MAX_BUDGET_ITEMS)
    .map((item, idx) => sanitizeBudgetItem(item, idx));

  const tasks = tasksRaw
    .slice(0, LIMITS.MAX_TASKS)
    .map((task, idx) => sanitizeTaskItem(task, idx, defaultDate));

  const vendors = vendorsRaw
    .slice(0, LIMITS.MAX_VENDORS)
    .map((vendor, idx) => sanitizeVendorItem(vendor, idx));

  const ideas = ideasRaw
    .slice(0, LIMITS.MAX_IDEAS)
    .map((idea, idx) => sanitizeIdeaItem(idea, idx));

  const guests = guestsRaw
    .slice(0, LIMITS.MAX_GUEST_ITEMS)
    .map((guest, idx) => sanitizeGuestItem(guest, idx));

  const schedule = scheduleRaw
    .slice(0, LIMITS.MAX_SCHEDULE_ITEMS)
    .map((sch, idx) => sanitizeScheduleItem(sch, idx));

  const accessibilityNeeds = Array.isArray(obj.accessibilityNeeds)
    ? obj.accessibilityNeeds
        .slice(0, 20)
        .map((a) => sanitizeString(a, 60))
        .filter(Boolean)
    : [];

  const rawInsights = Array.isArray(obj.decisionInsights) ? obj.decisionInsights : [];
  const decisionInsights: DecisionInsight[] = rawInsights.slice(0, 30).map((ins, idx) => {
    const o = typeof ins === 'object' && ins !== null ? (ins as Record<string, unknown>) : {};
    return {
      id: generateSafeId('ins', idx),
      type: (['warning', 'suggestion', 'action_required', 'positive'].includes(String(o.type))
        ? String(o.type)
        : 'suggestion') as DecisionInsight['type'],
      category: (['budget', 'timeline', 'weather', 'capacity', 'accessibility', 'vendors'].includes(String(o.category))
        ? String(o.category)
        : 'budget') as DecisionInsight['category'],
      title: sanitizeString(o.title, 100, 'Insight'),
      message: sanitizeString(o.message, 300, ''),
      actionLabel: o.actionLabel ? sanitizeString(o.actionLabel, 50) : undefined,
      actionType: o.actionType ? sanitizeString(o.actionType, 50) : undefined,
    };
  });

  const missingInfoPrompts = Array.isArray(obj.missingInfoPrompts)
    ? obj.missingInfoPrompts.slice(0, 20).map((p) => sanitizeString(p, 150)).filter(Boolean)
    : [];

  const plan: EventPlan = {
    id: sanitizeString(obj.id, 50) || generateSafeId('evt'),
    title: sanitizeString(obj.title, LIMITS.MAX_TITLE_LENGTH, 'Celebration Plan'),
    eventType: sanitizeEventType(obj.eventType, 'wedding'),
    eventDate: defaultDate,
    city: sanitizeString(obj.city, LIMITS.MAX_CITY_LENGTH, 'Mumbai'),
    guestCount: sanitizeFiniteNumber(obj.guestCount, LIMITS.MIN_GUESTS, LIMITS.MAX_GUEST_COUNT, 100),
    totalBudget: sanitizeFiniteNumber(obj.totalBudget, LIMITS.MIN_BUDGET, LIMITS.MAX_BUDGET, 500000),
    currency: '₹',
    contingencyRate: sanitizeFiniteNumber(obj.contingencyRate, LIMITS.MIN_CONTINGENCY, LIMITS.MAX_CONTINGENCY, 0.10),
    venuePreference: sanitizeVenuePreference(obj.venuePreference, 'banquet_hall'),
    foodPreference: sanitizeFoodPreference(obj.foodPreference, 'buffet'),
    theme: sanitizeString(obj.theme, LIMITS.MAX_THEME_LENGTH, 'Royal Elegance'),
    priorities: sanitizePriorityAreas(obj.priorities, ['guest_experience']),
    accessibilityNeeds,
    culturalTraditions: sanitizeString(obj.culturalTraditions, LIMITS.MAX_TRADITIONS_LENGTH, ''),
    specialNotes: sanitizeString(obj.specialNotes, LIMITS.MAX_NOTES_LENGTH, ''),
    plannerSource: obj.plannerSource === 'ai' ? 'ai' : 'fallback_rule_engine',
    lastGeneratedAt: sanitizeString(obj.lastGeneratedAt, 50, new Date().toISOString()),
    budgetItems,
    tasks,
    vendors,
    ideas,
    guests,
    schedule,
    decisionInsights,
    missingInfoPrompts,
    generationExplanation: sanitizeString(
      obj.generationExplanation,
      LIMITS.MAX_EXPLANATION_LENGTH,
      'Grounded celebration plan verified against EventWise safety boundaries.'
    ),
  };

  return {
    valid: true,
    plan,
    errors,
  };
}

function createEmptySafePlan(fallbackDate: string): EventPlan {
  return {
    id: generateSafeId('evt-safe'),
    title: 'Standard Event Plan',
    eventType: 'wedding',
    eventDate: fallbackDate,
    city: 'Mumbai',
    guestCount: 100,
    totalBudget: 500000,
    currency: '₹',
    contingencyRate: 0.10,
    venuePreference: 'banquet_hall',
    foodPreference: 'buffet',
    theme: 'Traditional Celebration',
    priorities: ['guest_experience'],
    accessibilityNeeds: [],
    culturalTraditions: '',
    specialNotes: '',
    plannerSource: 'fallback_rule_engine',
    lastGeneratedAt: new Date().toISOString(),
    budgetItems: [],
    tasks: [],
    vendors: [],
    ideas: [],
    guests: [],
    schedule: [],
    decisionInsights: [],
    missingInfoPrompts: [],
    generationExplanation: 'Safe fallback baseline plan.',
  };
}
