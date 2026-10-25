import type { EventPlan } from '../types/event';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import { validateAndSanitizeEventPlan } from '../utils/validators';

export const STORAGE_SCHEMA_VERSION = 2;
export const STORAGE_KEY_EVENTS = 'eventwise_ai_events_v2';
export const STORAGE_KEY_ACTIVE_ID = 'eventwise_ai_active_id_v2';
export const STORAGE_KEY_VERSION = 'eventwise_ai_schema_version';

const LEGACY_STORAGE_KEYS = [
  'eventwise_ai_events_v1',
  'eventwise_ai_events_india_v1',
];

export const MAX_STORAGE_BYTES = 2 * 1024 * 1024; // 2 MB cap

/**
 * Validates whether an object is a structurally valid EventPlan.
 * Performs deep structural and type checks.
 */
export function isValidEventPlan(data: unknown): data is EventPlan {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;

  const hasTopLevelFields =
    typeof p.id === 'string' &&
    p.id.trim().length > 0 &&
    typeof p.title === 'string' &&
    (p.eventType === 'wedding' || p.eventType === 'birthday' || p.eventType === 'community') &&
    typeof p.totalBudget === 'number' &&
    Number.isFinite(p.totalBudget) &&
    p.totalBudget > 0 &&
    Array.isArray(p.budgetItems) &&
    Array.isArray(p.tasks) &&
    Array.isArray(p.vendors) &&
    Array.isArray(p.ideas);

  if (!hasTopLevelFields) return false;

  const result = validateAndSanitizeEventPlan(data);
  return result.valid;
}

/**
 * Storage error listener and subscription mechanism.
 */
type StorageErrorListener = (errorMessage: string | null) => void;
const storageErrorListeners = new Set<StorageErrorListener>();
let currentStorageError: string | null = null;
let lastSavedPayload: string | null = null;

export function getStorageError(): string | null {
  return currentStorageError;
}

export function subscribeStorageError(listener: StorageErrorListener): () => void {
  storageErrorListeners.add(listener);
  return () => {
    storageErrorListeners.delete(listener);
  };
}

export function clearStorageError(): void {
  if (currentStorageError !== null) {
    currentStorageError = null;
    storageErrorListeners.forEach((listener) => listener(null));
  }
}

export function clearStorageCache(): void {
  lastSavedPayload = null;
}

function notifyStorageError(msg: string): void {
  currentStorageError = msg;
  storageErrorListeners.forEach((listener) => listener(msg));
}

/**
 * Strips any sensitive or credential fields and ephemeral derived data from an EventPlan before saving or exporting.
 */
function sanitizeEventForStorage(event: EventPlan): EventPlan {
  const result = validateAndSanitizeEventPlan(event);
  const clean = { ...result.plan } as Record<string, unknown>;

  // Ensure no API keys or secret fields can ever leak into storage or exports
  delete clean.apiKey;
  delete clean.customApiKey;
  delete clean.geminiApiKey;
  delete clean.secret;

  // Lean storage payload: strip ephemeral derived decision rules and prompts
  // which are deterministically recomputed by evaluateDecisionRules
  delete clean.decisionInsights;
  delete clean.missingInfoPrompts;

  return clean as unknown as EventPlan;
}

/**
 * Safely loads all events from localStorage.
 * Performs automatic schema migration from v1 to v2, deep-validates all records,
 * and recovers gracefully from corrupted or oversized storage payloads.
 */
export function loadSavedEvents(): EventPlan[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    let isMigration = false;

    // Check legacy v1 keys for migration if v2 is not yet present
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          raw = legacyData;
          isMigration = true;
          break;
        }
      }
    }

    if (!raw) {
      return INITIAL_EVENTS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_EVENTS;
    }

    const validated: EventPlan[] = [];
    for (const item of parsed) {
      const res = validateAndSanitizeEventPlan(item);
      if (res.valid) {
        validated.push(res.plan);
      }
    }

    if (validated.length === 0) {
      return INITIAL_EVENTS;
    }

    // If migrating from legacy schema, persist upgraded v2 dataset and set schema version
    if (isMigration) {
      try {
        saveEvents(validated);
        localStorage.setItem(STORAGE_KEY_VERSION, String(STORAGE_SCHEMA_VERSION));
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          localStorage.removeItem(legacyKey);
        }
      } catch {
        // Silently continue if saving migrated state fails
      }
    }

    return validated;
  } catch (err) {
    console.error('Failed to parse stored events from localStorage, resetting to defaults.', err);
    return INITIAL_EVENTS;
  }
}

/**
 * Safely persists events into localStorage with size capping (2 MB), redundancy skips, and quota error handling.
 */
export function saveEvents(events: EventPlan[]): boolean {
  try {
    const validEvents = events
      .filter((e) => isValidEventPlan(e))
      .map(sanitizeEventForStorage);

    const serialized = JSON.stringify(validEvents);

    // Skip redundant writes if localStorage or memory already holds this exact state
    if (lastSavedPayload === serialized && localStorage.getItem(STORAGE_KEY_EVENTS) === serialized) {
      return true;
    }

    if (serialized.length > MAX_STORAGE_BYTES) {
      console.warn(`Storage payload exceeded limit of ${MAX_STORAGE_BYTES} bytes. Operation aborted.`);
      return false;
    }

    localStorage.setItem(STORAGE_KEY_EVENTS, serialized);
    localStorage.setItem(STORAGE_KEY_VERSION, String(STORAGE_SCHEMA_VERSION));
    lastSavedPayload = serialized;
    clearStorageError();
    return true;
  } catch (err: unknown) {
    console.error('Failed to save events to localStorage (quota exceeded or storage blocked).', err);
    if (
      err instanceof Error &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.message?.toLowerCase().includes('quota'))
    ) {
      notifyStorageError('Browser storage quota exceeded. Please export or remove older plans to save new changes.');
    }
    return false;
  }
}

/**
 * Clears all persistent application data from browser storage and resets to initial defaults.
 */
export function clearAllStorageData(): void {
  try {
    lastSavedPayload = null;
    clearStorageError();
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    localStorage.removeItem(STORAGE_KEY_VERSION);
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.removeItem('eventwise_setup_draft_v2');
  } catch (err) {
    console.error('Failed to clear storage data:', err);
  }
}

/**
 * Gets the last active event ID safely.
 */
export function loadActiveEventId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || localStorage.getItem('eventwise_ai_active_id_india_v1');
  } catch {
    return null;
  }
}

/**
 * Saves the active event ID safely with redundancy skip.
 */
export function saveActiveEventId(id: string): void {
  try {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
    if (localStorage.getItem(STORAGE_KEY_ACTIVE_ID) === cleanId) {
      return;
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, cleanId);
  } catch (err) {
    console.error('Failed to save active event id', err);
  }
}

/**
 * Exports a single event plan as downloadable JSON with sanitized filenames and secret redaction.
 */
export function exportPlanAsJson(plan: EventPlan): void {
  const sanitizedPlan = sanitizeEventForStorage(plan);
  const jsonStr = JSON.stringify(sanitizedPlan, null, 2);

  // Strict filename sanitization: prevents directory traversal and illegal characters
  const safeEventType = sanitizedPlan.eventType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const safeId = sanitizedPlan.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const filename = `eventwise-plan-${safeEventType}-${safeId}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
