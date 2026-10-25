import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualList } from '../hooks/useVirtualList';
import { useEventPlan } from '../hooks/useEventPlan';
import { saveEvents, clearStorageCache } from '../services/storageService';
import {
  generateAIEventPlan,
  clearPlanCache,
  getPlanCacheSize,
} from '../services/aiPlanner';
import { requestGeminiContent } from '../services/geminiClient';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import type { EventPlan } from '../types/event';

describe('Performance Optimizations Regression Suite (Step 7)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearStorageCache();
    clearPlanCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. List Virtualization Behavior
  describe('List Virtualization (useVirtualList)', () => {
    it('bypasses windowing for small lists (<= 100 items) to preserve full semantic DOM and accessibility', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` }));
      const { result } = renderHook(() =>
        useVirtualList(items, {
          itemHeight: 48,
          overscan: 4,
          threshold: 100,
        })
      );

      expect(result.current.isVirtual).toBe(false);
      expect(result.current.visibleItems.length).toBe(50);
      expect(result.current.totalHeight).toBe(50 * 48);
      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(50);
    });

    it('activates virtual windowing for large lists (> 100 items) rendering only visible window + overscan', () => {
      const items = Array.from({ length: 500 }, (_, i) => ({ id: `guest-${i}`, name: `Guest ${i}` }));
      const { result } = renderHook(() =>
        useVirtualList(items, {
          itemHeight: 52,
          overscan: 5,
          threshold: 100,
        })
      );

      expect(result.current.isVirtual).toBe(true);
      expect(result.current.visibleItems.length).toBeLessThan(items.length);
      expect(result.current.totalHeight).toBe(500 * 52);
    });
  });

  // 2. Storage Redundancy & Debounced Saves
  describe('Storage Persistence & Redundancy Prevention', () => {
    it('skips redundant localStorage writes when state is identical', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const testPlan: EventPlan = { ...INITIAL_EVENTS[0] };

      // First save writes to storage
      const firstSave = saveEvents([testPlan]);
      expect(firstSave).toBe(true);
      const initialCalls = setItemSpy.mock.calls.length;
      expect(initialCalls).toBeGreaterThan(0);

      // Second identical save is skipped
      const secondSave = saveEvents([testPlan]);
      expect(secondSave).toBe(true);
      expect(setItemSpy.mock.calls.length).toBe(initialCalls);
    });

    it('debounces storage persistence in useEventPlan', async () => {
      vi.useFakeTimers();
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { result } = renderHook(() => useEventPlan());
      const initialWriteCount = setItemSpy.mock.calls.length;

      // Make multiple rapid edits within the 400ms debounce window
      act(() => {
        result.current.updateEventParameters({ theme: 'Royal Saffron Palace Theme' });
      });
      act(() => {
        result.current.updateEventParameters({ theme: 'Grand Royal Saffron Palace' });
      });

      // Before timer fires, no new writes
      expect(setItemSpy.mock.calls.length).toBe(initialWriteCount);

      // Advance timers by debounce duration (400ms)
      act(() => {
        vi.advanceTimersByTime(450);
      });

      // Writes coalesce into single debounced write
      expect(setItemSpy.mock.calls.length).toBeGreaterThan(initialWriteCount);
      vi.useRealTimers();
    });
  });

  // 3. AI Request Caching and In-flight De-duplication
  describe('AI Network Efficiency: Caching & Request Coalescing', () => {
    it('caches successful identical plan requests in-memory without duplicate network calls', async () => {
      const mockPlan = {
        title: 'Cached Royal Wedding',
        totalBudget: 2500000,
        budgetItems: [{ id: 'b1', name: 'Venue', category: 'venue', estimatedCost: 1000000, priority: 'critical' }],
        tasks: [{ id: 't1', title: 'Book Mandap', category: 'venue', priority: 'high', dueDate: '2026-11-20' }],
        vendors: [{ id: 'v1', name: 'Palace Hall', category: 'venue', status: 'confirmed', estimatedCost: 1000000, role: 'Venue' }],
        ideas: [{ id: 'i1', title: 'Marigold Arch', category: 'decor', tier: 'balanced' }],
        guests: [{ id: 'g1', name: 'Rohan Sharma', category: 'family', rsvpStatus: 'confirmed' }],
        schedule: [{ id: 's1', time: '10:00', title: 'Barat', category: 'ceremony' }],
      };

      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(mockPlan) }],
                  },
                },
              ],
            }),
        });
      });

      const input = {
        eventType: 'wedding' as const,
        eventDate: '2026-12-15',
        city: 'Jaipur',
        guestCount: 200,
        totalBudget: 2500000,
        customApiKey: 'test-ai-key-12345',
      };

      // First call reaches network
      const plan1 = await generateAIEventPlan(input);
      expect(fetchCallCount).toBe(1);
      expect(plan1.title).toBe('Cached Royal Wedding');

      // Second identical call hits memory cache
      const plan2 = await generateAIEventPlan(input);
      expect(fetchCallCount).toBe(1); // No new network call!
      expect(plan2.title).toBe('Cached Royal Wedding');

      expect(getPlanCacheSize()).toBe(1);
    });

    it('coalesces concurrent in-flight requests for the same parameters into a single promise', async () => {
      const mockPlan = {
        title: 'Coalesced Mela',
        totalBudget: 1500000,
        budgetItems: [],
        tasks: [],
        vendors: [],
        ideas: [],
        guests: [],
        schedule: [],
      };

      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        await new Promise((r) => setTimeout(r, 50));
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlan) }] } }],
            }),
        };
      });

      const input = {
        eventType: 'community' as const,
        eventDate: '2026-11-20',
        city: 'Delhi',
        guestCount: 150,
        totalBudget: 1500000,
        customApiKey: 'test-key-coalesce',
      };

      // Launch 3 simultaneous requests
      const [res1, res2, res3] = await Promise.all([
        generateAIEventPlan(input),
        generateAIEventPlan(input),
        generateAIEventPlan(input),
      ]);

      expect(fetchCount).toBe(1); // Deduped to exactly 1 network call!
      expect(res1.title).toBe('Coalesced Mela');
      expect(res2.title).toBe('Coalesced Mela');
      expect(res3.title).toBe('Coalesced Mela');
    });
  });

  // 4. Client Error (4xx) No-Retry Policy
  describe('Gemini Client: No-Retry on Client Errors (4xx)', () => {
    it('does NOT retry on HTTP 400, 401, 403, or 429 to avoid wasting network calls and quota', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('API_KEY_INVALID'),
        });
      });

      const res = await requestGeminiContent({
        prompt: 'test prompt',
        apiKey: 'test-bad-key',
        models: ['gemini-1.5-flash'],
      });

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(401);
      // Zero retries on 401: exactly 1 attempt
      expect(callCount).toBe(1);
    });

    it('stops immediately without retry on HTTP 429 quota exhaustion', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '60' }),
          text: () => Promise.resolve('RESOURCE_EXHAUSTED'),
        });
      });

      const res = await requestGeminiContent({
        prompt: 'test prompt',
        apiKey: 'test-key',
        models: ['gemini-1.5-flash'],
      });

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(429);
      expect(res.error).toMatch(/rate limit exceeded/i);
      // Immediately halts on 429: exactly 1 attempt
      expect(callCount).toBe(1);
    });
  });

  // 5. Lazy Fallback Computation
  describe('Lazy Fallback Plan Computation', () => {
    it('does not invoke generateFallbackPlan when AI returns a complete response', async () => {
      const completePlan = {
        title: 'Full Royal Reception',
        totalBudget: 3000000,
        budgetItems: [{ id: 'b1', name: 'Venue', category: 'venue', estimatedCost: 1000000, priority: 'critical' }],
        tasks: [{ id: 't1', title: 'Stage Setup', category: 'venue', priority: 'high', dueDate: '2026-11-20' }],
        vendors: [{ id: 'v1', name: 'Palace', category: 'venue', status: 'confirmed', estimatedCost: 1000000, role: 'Venue' }],
        ideas: [{ id: 'i1', title: 'Royal Lighting', category: 'decor', tier: 'balanced' }],
        guests: [{ id: 'g1', name: 'Aarav Patel', category: 'family', rsvpStatus: 'confirmed' }],
        schedule: [{ id: 's1', time: '11:00', title: 'Reception', category: 'ceremony' }],
      };

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              candidates: [{ content: { parts: [{ text: JSON.stringify(completePlan) }] } }],
            }),
        })
      );

      const plan = await generateAIEventPlan({
        eventType: 'wedding',
        eventDate: '2026-11-20',
        city: 'Udaipur',
        guestCount: 250,
        totalBudget: 3000000,
        customApiKey: 'test-lazy-key',
      });

      expect(plan.title).toBe('Full Royal Reception');
      expect(plan.budgetItems.length).toBe(1);
      expect(plan.budgetItems[0].name).toBe('Venue');
    });
  });
});
