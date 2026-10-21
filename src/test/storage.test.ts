import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidEventPlan,
  loadSavedEvents,
  saveEvents,
  loadActiveEventId,
  saveActiveEventId,
} from '../services/storageService';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import type { EventPlan } from '../types/event';

describe('Storage Persistence & Corrupted Data Recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates genuine EventPlan objects and rejects invalid structures', () => {
    const validPlan = INITIAL_EVENTS[0];
    expect(isValidEventPlan(validPlan)).toBe(true);

    expect(isValidEventPlan(null)).toBe(false);
    expect(isValidEventPlan(undefined)).toBe(false);
    expect(isValidEventPlan({ title: 'Missing required fields' })).toBe(false);
    expect(isValidEventPlan({ ...validPlan, eventType: 'invalid_type' })).toBe(false);
  });

  it('returns default sample events when localStorage is empty', () => {
    const events = loadSavedEvents();
    expect(events.length).toBe(INITIAL_EVENTS.length);
    expect(events[0].title).toBe(INITIAL_EVENTS[0].title);
  });

  it('recovers gracefully from corrupted JSON in localStorage', () => {
    localStorage.setItem('eventwise_ai_events_v1', 'THIS_IS_CORRUPTED_JSON_NOT_VALID{{{');

    const recovered = loadSavedEvents();
    expect(recovered).toBeDefined();
    expect(recovered.length).toBeGreaterThan(0);
    expect(recovered[0].eventType).toBe(INITIAL_EVENTS[0].eventType);
  });

  it('recovers gracefully when stored item is valid JSON but not an array of plans', () => {
    localStorage.setItem('eventwise_ai_events_v1', JSON.stringify({ malicious: 'object' }));

    const recovered = loadSavedEvents();
    expect(recovered).toBeDefined();
    expect(recovered.length).toBe(INITIAL_EVENTS.length);
  });

  it('successfully persists and reloads valid events', () => {
    const customPlan: EventPlan = {
      ...INITIAL_EVENTS[0],
      id: 'custom-event-test-999',
      title: 'Custom Anniversay Gala',
    };

    const saved = saveEvents([customPlan]);
    expect(saved).toBe(true);

    const reloaded = loadSavedEvents();
    expect(reloaded.length).toBe(1);
    expect(reloaded[0].id).toBe('custom-event-test-999');
  });

  it('persists and retrieves active event ID safely', () => {
    expect(loadActiveEventId()).toBeNull();

    saveActiveEventId('event-abc-123');
    expect(loadActiveEventId()).toBe('event-abc-123');
  });
});
