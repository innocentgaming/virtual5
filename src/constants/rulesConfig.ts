/**
 * Centralized business constants and thresholds for EventWise AI Decision Engine.
 * All numeric thresholds used in cultural, municipal, and financial rules are configured here.
 */

import {
  SOUND_CURFEW_HOUR,
  SOUND_CURFEW_MINUTE,
  LARGE_GATHERING_GUEST_THRESHOLD,
  MEGA_EVENT_GUEST_THRESHOLD,
  SHORT_NOTICE_DAYS_CRITICAL,
  URGENT_DAYS_WINDOW,
  SURPLUS_BUDGET_RATIO,
  MIN_SAFE_CONTINGENCY_RATE,
  JAIN_COUNTER_DEFAULT_COST,
  VALET_GUESTS_PER_CAR,
  TOTAL_RULES_COUNT,
} from '../constants';

export const RULES_CONFIG = {
  /** Sound curfew hour in 24-hour format (10:00 PM per Indian municipal/police guidelines) */
  CURFEW_HOUR_24H: SOUND_CURFEW_HOUR,
  CURFEW_MINUTE: SOUND_CURFEW_MINUTE,

  /** Large guest count threshold triggering valet and flow logistics (250 attendees) */
  LARGE_GUEST_THRESHOLD: LARGE_GATHERING_GUEST_THRESHOLD,

  /** Mega gathering threshold requiring fire NOC and municipal crowd safety plan (400 attendees) */
  MEGA_EVENT_GUEST_THRESHOLD: MEGA_EVENT_GUEST_THRESHOLD,

  /** Critical milestone countdown window in days (14 days) */
  CRITICAL_DAYS_WINDOW: SHORT_NOTICE_DAYS_CRITICAL,

  /** Immediate urgent milestone countdown in days (7 days) */
  URGENT_DAYS_WINDOW: URGENT_DAYS_WINDOW,

  /** Surplus budget percentage threshold to signal financial cushion (25% unallocated) */
  SURPLUS_BUDGET_RATIO: SURPLUS_BUDGET_RATIO,

  /** Minimum contingency rate threshold (8%) below which a warning is issued */
  MIN_SAFE_CONTINGENCY_RATE: MIN_SAFE_CONTINGENCY_RATE,

  /** Standard Jain / Pure Veg separate counter isolation allocation (₹25,000) */
  JAIN_COUNTER_DEFAULT_COST: JAIN_COUNTER_DEFAULT_COST,

  /** Ratio of guests per valet parking car (1 car per 4 guests) */
  VALET_GUESTS_PER_CAR: VALET_GUESTS_PER_CAR,

  /** Summer peak heat months (March to June: months 2, 3, 4, 5 in 0-indexed Date) */
  SUMMER_MONTHS: [2, 3, 4, 5] as const,

  /** Monsoon rain months (June to September: months 5, 6, 7, 8 in 0-indexed Date) */
  MONSOON_MONTHS: [5, 6, 7, 8] as const,

  /** Total rules evaluated in the core decision engine */
  TOTAL_RULES_COUNT: TOTAL_RULES_COUNT,
} as const;
