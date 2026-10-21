import type { EventPlan } from '../types/event';
import { INITIAL_EVENTS } from '../data/sampleEvents';

const STORAGE_KEY_EVENTS = 'eventwise_ai_events_v1';
const STORAGE_KEY_ACTIVE_ID = 'eventwise_ai_active_id_v1';

/**
 * Validates whether an object is a structurally valid EventPlan.
 */
export function isValidEventPlan(data: unknown): data is EventPlan {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;

  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    (p.eventType === 'wedding' || p.eventType === 'birthday' || p.eventType === 'community') &&
    typeof p.totalBudget === 'number' &&
    Array.isArray(p.budgetItems) &&
    Array.isArray(p.tasks) &&
    Array.isArray(p.vendors) &&
    Array.isArray(p.ideas)
  );
}

/**
 * Safely loads all events from localStorage.
 * Automatically recovers from corrupted or invalid data by returning initial samples.
 */
export function loadSavedEvents(): EventPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) {
      return INITIAL_EVENTS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_EVENTS;
    }

    const validated = parsed.filter(isValidEventPlan);
    return validated.length > 0 ? validated : INITIAL_EVENTS;
  } catch (err) {
    console.error('Failed to parse stored events from localStorage, resetting to defaults.', err);
    return INITIAL_EVENTS;
  }
}

/**
 * Safely persists events into localStorage.
 */
export function saveEvents(events: EventPlan[]): boolean {
  try {
    const validEvents = events.filter(isValidEventPlan);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(validEvents));
    return true;
  } catch (err) {
    console.error('Failed to save events to localStorage (quota exceeded or blocked).', err);
    return false;
  }
}

/**
 * Gets the last active event ID.
 */
export function loadActiveEventId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch {
    return null;
  }
}

/**
 * Saves the active event ID.
 */
export function saveActiveEventId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (err) {
    console.error('Failed to save active event id', err);
  }
}

/**
 * Exports a single event plan as downloadable JSON.
 */
export function exportPlanAsJson(plan: EventPlan): void {
  const jsonStr = JSON.stringify(plan, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventwise-plan-${plan.eventType}-${plan.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
