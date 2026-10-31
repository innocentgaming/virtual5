/**
 * Application-wide business constants and numeric thresholds for EventWise AI.
 * Centralizes magic numbers used across cultural rules, budgeting, and timeline schedules.
 */

/** Sound curfew hour in 24-hour format (10:00 PM per Indian municipal/police guidelines) */
export const SOUND_CURFEW_HOUR = 22;
export const SOUND_CURFEW_MINUTE = 0;

/** Large guest count threshold triggering valet and flow logistics (250 attendees) */
export const LARGE_GATHERING_GUEST_THRESHOLD = 250;

/** Mega gathering threshold requiring fire NOC and municipal crowd safety plan (400 attendees) */
export const MEGA_EVENT_GUEST_THRESHOLD = 400;

/** Short-notice day thresholds for timeline compression and logistics prioritization */
export const SHORT_NOTICE_DAYS_CRITICAL = 14;
export const SHORT_NOTICE_DAYS_WARNING = 21;
export const URGENT_DAYS_WINDOW = 7;

/** Contingency reserve percentage limits */
export const DEFAULT_CONTINGENCY_RATE = 0.10;
export const MIN_SAFE_CONTINGENCY_RATE = 0.08;
export const MAX_CONTINGENCY_RATE = 0.25;
export const SURPLUS_BUDGET_RATIO = 0.25;

/** Standard Jain / Pure Veg separate counter isolation allocation (₹25,000) */
export const JAIN_COUNTER_DEFAULT_COST = 25000;

/** Ratio of guests per valet parking car (1 car per 4 guests) */
export const VALET_GUESTS_PER_CAR = 4;

/** Total rules evaluated in the core decision engine */
export const TOTAL_RULES_COUNT = 12;

/** General application constants */
export const APP_NAME = 'EventWise AI';
export const APP_VERSION = '1.2.0';
export const DEFAULT_CURRENCY = 'INR';
