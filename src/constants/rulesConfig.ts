/**
 * Centralized business constants and thresholds for EventWise AI Decision Engine.
 * All numeric thresholds used in cultural, municipal, and financial rules are configured here.
 */

export const RULES_CONFIG = {
  /** Sound curfew hour in 24-hour format (10:00 PM per Indian municipal/police guidelines) */
  CURFEW_HOUR_24H: 22,
  CURFEW_MINUTE: 0,

  /** Large guest count threshold triggering valet and flow logistics (250 attendees) */
  LARGE_GUEST_THRESHOLD: 250,

  /** Mega gathering threshold requiring fire NOC and municipal crowd safety plan (400 attendees) */
  MEGA_EVENT_GUEST_THRESHOLD: 400,

  /** Critical milestone countdown window in days (14 days) */
  CRITICAL_DAYS_WINDOW: 14,

  /** Immediate urgent milestone countdown in days (7 days) */
  URGENT_DAYS_WINDOW: 7,

  /** Surplus budget percentage threshold to signal financial cushion (25% unallocated) */
  SURPLUS_BUDGET_RATIO: 0.25,

  /** Minimum contingency rate threshold (8%) below which a warning is issued */
  MIN_SAFE_CONTINGENCY_RATE: 0.08,

  /** Standard Jain / Pure Veg separate counter isolation allocation (₹25,000) */
  JAIN_COUNTER_DEFAULT_COST: 25000,

  /** Ratio of guests per valet parking car (1 car per 4 guests) */
  VALET_GUESTS_PER_CAR: 4,

  /** Summer peak heat months (March to June: months 2, 3, 4, 5 in 0-indexed Date) */
  SUMMER_MONTHS: [2, 3, 4, 5] as const,

  /** Monsoon rain months (June to September: months 5, 6, 7, 8 in 0-indexed Date) */
  MONSOON_MONTHS: [5, 6, 7, 8] as const,

  /** Total rules evaluated in the core decision engine */
  TOTAL_RULES_COUNT: 12,
} as const;
