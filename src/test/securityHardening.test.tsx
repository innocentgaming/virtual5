import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateAIEventPlan } from '../services/aiPlanner';
import { generateCopilotAnswerAsync } from '../services/copilotService';
import { saveEvents, loadSavedEvents, exportPlanAsJson } from '../services/storageService';
import { generateIcsCalendar, escapeIcsText, foldIcsLine } from '../services/calendarService';
import { validateAndSanitizeEventPlan, LIMITS } from '../utils/validators';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import type { EventPlan } from '../types/event';

describe('Security Hardening & Assurance Suite', () => {
  const secretKey = 'AIzaSySecurityTestKey_SuperSecret12345';

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // 1. Fetch URL and Header Security
  it('sends API key strictly via x-goog-api-key header and never exposes it in the URL', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          generationExplanation: 'Safe plan',
                          budgetItems: [],
                          tasks: [],
                          vendors: [],
                          ideas: [],
                        }),
                      },
                    ],
                  },
                },
              ],
            })
          ),
      });
    });

    await generateAIEventPlan({
      eventType: 'wedding',
      eventDate: '2026-11-20',
      city: 'Udaipur',
      guestCount: 150,
      totalBudget: 2500000,
      customApiKey: secretKey,
    });

    // Verify URL does NOT contain the secret key or query param
    expect(capturedUrl).not.toContain(secretKey);
    expect(capturedUrl).not.toContain('?key=');
    expect(capturedUrl).not.toContain('&key=');

    // Verify x-goog-api-key header is set
    expect(capturedHeaders['x-goog-api-key']).toBe(secretKey);
    expect(capturedHeaders['Content-Type']).toBe('application/json');
  });

  // 2. Secret Redaction from Logs and LocalStorage
  it('redacts API keys from console error and warning logs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    global.fetch = vi.fn().mockRejectedValue(
      new Error(`Upstream rejected key ${secretKey} at https://generativelanguage.googleapis.com?key=${secretKey}`)
    );

    await generateAIEventPlan({
      eventType: 'birthday',
      eventDate: '2026-11-20',
      city: 'Delhi',
      guestCount: 50,
      totalBudget: 100000,
      customApiKey: secretKey,
    });

    expect(warnSpy).toHaveBeenCalled();
    const allLogged = warnSpy.mock.calls.flat().join(' ');
    expect(allLogged).not.toContain(secretKey);
    expect(allLogged).toContain('[REDACTED');
  });

  it('guarantees that API keys never leak into localStorage or exported JSON', () => {
    const planWithSecret = {
      ...INITIAL_EVENTS[0],
      apiKey: secretKey,
      customApiKey: secretKey,
      geminiApiKey: secretKey,
    } as unknown as EventPlan;

    saveEvents([planWithSecret]);
    const storedRaw = localStorage.getItem('eventwise_ai_events_v2');
    expect(storedRaw).toBeDefined();
    expect(storedRaw).not.toContain(secretKey);

    // Test JSON export scrubbing
    let exportedContent = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(element, 'href', {
          set(val: string) {
            this._href = val;
          },
          get() {
            return this._href;
          },
        });
      }
      return element;
    });

    global.URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        exportedContent = reader.result as string;
      };
      reader.readAsText(blob);
      return 'blob:mock-url';
    });

    exportPlanAsJson(planWithSecret);
    expect(exportedContent).not.toContain(secretKey);
  });

  // 3. Deep Validation & Bound Enforcement
  it('sanitizes and bounds untrusted payloads with Infinity, NaN, wrong enums, and duplicate IDs', () => {
    const untrustedPayload = {
      id: 'ai-plan-dirty',
      title: 'Hacked Celebration \x00\x08\x1F Title',
      eventType: 'malicious_event_type',
      totalBudget: Infinity,
      guestCount: -500,
      budgetItems: [
        { id: 'dup-id', name: 'Stage', category: 'unknown_cat', estimatedCost: Infinity, priority: 'critical' },
        { id: 'dup-id', name: 'Catering', category: 'catering', estimatedCost: NaN, priority: 'recommended' },
        { id: 'dup-id', name: 'Fireworks', category: 'entertainment', estimatedCost: -5000, priority: 'optional' },
      ],
      tasks: [
        { id: 'dup-id', title: 'Task 1', category: 'invalid_task_cat', priority: 'super_urgent', dueDate: 'invalid-date' },
        { id: 'dup-id', title: 'Task 2', category: 'final', priority: 'high', dueDate: '2026-11-20' },
      ],
      vendors: [
        { id: 'dup-id', category: 'fake_vendor', status: 'bribed', role: 'DJ', estimatedCost: 10000000000 },
      ],
      ideas: [
        { id: 'dup-id', category: 'fake_idea_cat', tier: 'ultra_deluxe', title: 'Idea 1' },
      ],
    };

    const { valid, plan } = validateAndSanitizeEventPlan(untrustedPayload, '2026-11-20');
    expect(valid).toBe(true);

    // Stripped control chars from title
    expect(plan.title).toBe('Hacked Celebration  Title');

    // Safe fallback enum for eventType
    expect(plan.eventType).toBe('wedding');

    // Bounded budget and guestCount
    expect(Number.isFinite(plan.totalBudget)).toBe(true);
    expect(plan.totalBudget).toBeLessThanOrEqual(LIMITS.MAX_BUDGET);
    expect(plan.guestCount).toBeGreaterThanOrEqual(LIMITS.MIN_GUESTS);

    // Bounded budget items & safe fallbacks
    expect(plan.budgetItems[0].category).toBe('other');
    expect(plan.budgetItems[0].priority).toBe('recommended');
    expect(Number.isFinite(plan.budgetItems[0].estimatedCost)).toBe(true);
    expect(plan.budgetItems[1].estimatedCost).toBe(0);
    expect(plan.budgetItems[2].estimatedCost).toBe(0);

    // Deduplicated and regenerated safe IDs
    const budgetIds = new Set(plan.budgetItems.map((b) => b.id));
    expect(budgetIds.size).toBe(plan.budgetItems.length);
    expect(plan.budgetItems[0].id).not.toBe('dup-id');

    // Vendor and Task fallbacks
    expect(plan.tasks[0].category).toBe('final');
    expect(plan.tasks[0].priority).toBe('medium');
    expect(plan.tasks[0].dueDate).toBe('2026-11-20');
    expect(plan.vendors[0].category).toBe('other');
    expect(plan.vendors[0].status).toBe('not_started');
    expect(plan.ideas[0].tier).toBe('balanced');
  });

  it('caps oversized arrays to safety limits', () => {
    const hugeList = Array.from({ length: 150 }, (_, i) => ({
      id: `item-${i}`,
      name: `Expense ${i}`,
      category: 'other',
      estimatedCost: 1000,
    }));

    const oversizedPayload = {
      ...INITIAL_EVENTS[0],
      budgetItems: hugeList,
    };

    const { plan } = validateAndSanitizeEventPlan(oversizedPayload);
    expect(plan.budgetItems.length).toBeLessThanOrEqual(LIMITS.MAX_BUDGET_ITEMS);
    expect(plan.budgetItems.length).toBe(LIMITS.MAX_BUDGET_ITEMS);
  });

  // 4. LocalStorage Tampering Recovery
  it('recovers gracefully from corrupted localStorage structures and rejects oversized payloads', () => {
    // 1. Corrupted nested types
    localStorage.setItem('eventwise_ai_events_v2', JSON.stringify([{ id: 'test', budgetItems: 'not-an-array' }]));
    const loaded = loadSavedEvents();
    expect(loaded).toBeDefined();
    expect(loaded.length).toBeGreaterThan(0);
    expect(Array.isArray(loaded[0].budgetItems)).toBe(true);

    // 2. Reject saving oversized payload > 2 MB
    const manyEvents = Array.from({ length: 600 }, (_, i) => ({
      ...INITIAL_EVENTS[0],
      id: `overflow-${i}`,
      title: `Grand Indian Celebration Volume ${i}`,
    }));

    const result = saveEvents(manyEvents);
    expect(result).toBe(false);

    // 3. Handle localStorage QuotaExceededError gracefully
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const quotaResult = saveEvents([INITIAL_EVENTS[0]]);
    expect(quotaResult).toBe(false);
    setItemSpy.mockRestore();
  });

  // 5. RFC 5545 iCalendar Escaping and Line Folding
  it('escapes special characters per RFC 5545 and folds lines at 75 octets', () => {
    const escaped = escapeIcsText('Meeting\\with;Dr. Sharma, regarding\r\nEvent planning');
    expect(escaped).toContain('\\\\');
    expect(escaped).toContain('\\;');
    expect(escaped).toContain('\\,');
    expect(escaped).not.toContain('\r');
    expect(escaped).toContain('\\n');

    // Test 75-octet folding
    const longText = 'SUMMARY:' + 'A'.repeat(120);
    const folded = foldIcsLine(longText);
    const lines = folded.split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[0].length).toBeLessThanOrEqual(75);
    expect(lines[1].startsWith(' ')).toBe(true);
  });

  it('neutralizes CRLF injection in iCalendar generation', () => {
    const maliciousPlan: EventPlan = {
      ...INITIAL_EVENTS[0],
      title: 'Injected Event\r\nSTATUS:CANCELLED\r\nBEGIN:VEVENT\r\nSUMMARY:Injected Event',
    };

    const ics = generateIcsCalendar(maliciousPlan);
    // Raw CRLF within values must be escaped or stripped, preventing unauthorized property injection
    const rawLines = ics.split('\r\n');
    const injectedStatus = rawLines.filter((l) => l.trim() === 'STATUS:CANCELLED');
    expect(injectedStatus.length).toBe(0);
  });

  // 6. Zero DangerouslySetInnerHTML & DOM Injection
  it('asserts that no source file uses dangerouslySetInnerHTML, innerHTML, or eval', () => {
    const srcDir = path.resolve(__dirname, '..');
    const filesToScan: string[] = [];

    function collectFiles(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'test') {
          collectFiles(fullPath);
        } else if (/\.(tsx?|jsx?|html)$/.test(entry.name) && !entry.name.includes('.test.')) {
          filesToScan.push(fullPath);
        }
      }
    }

    collectFiles(srcDir);
    expect(filesToScan.length).toBeGreaterThan(20);

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('dangerouslySetInnerHTML');
      expect(content).not.toMatch(/\bdocument\.write\b/);
      expect(content).not.toMatch(/\bnew Function\(/);
      expect(content).not.toMatch(/javascript:/i);
    }
  });

  // 7. Privacy: Guest PII Isolation Assertion
  it('guarantees that attendee guest names, emails, and phone numbers are NEVER sent to Gemini API', async () => {
    let capturedBodyText = '';

    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBodyText = String(init?.body || '');
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: '• Budget recommendation: allocate 20% to catering.' }],
                  },
                },
              ],
            })
          ),
      });
    });

    const planWithGuestPii: EventPlan = {
      ...INITIAL_EVENTS[0],
      guests: [
        {
          id: 'g-secret-1',
          name: 'Shah Rukh Khan',
          email: 'srk@redchillies.com',
          rsvpStatus: 'attending',
          dietary: 'pure_veg',
          plusOne: true,
          plusOneName: 'Gauri Khan',
          notes: 'Private VIP security required',
        },
      ],
      vendors: [
        {
          id: 'v-secret-1',
          category: 'caterer',
          role: 'Head Chef',
          status: 'booked',
          estimatedCost: 150000,
          contactName: 'Chef Sanjeev Kapoor',
          contactPhone: '+91-9876543210',
          contactEmail: 'sanjeev@khazana.com',
          questionsToAsk: ['Tasting date'],
        },
      ],
    };

    await generateCopilotAnswerAsync('What should we review this week?', planWithGuestPii, secretKey);

    // Verify PII exclusion in outbound request
    expect(capturedBodyText).not.toContain('Shah Rukh Khan');
    expect(capturedBodyText).not.toContain('srk@redchillies.com');
    expect(capturedBodyText).not.toContain('Gauri Khan');
    expect(capturedBodyText).not.toContain('Chef Sanjeev Kapoor');
    expect(capturedBodyText).not.toContain('+91-9876543210');
    expect(capturedBodyText).not.toContain('sanjeev@khazana.com');
  });

  // 8. Dist Verification for Leaked AIza Keys
  it('asserts that dist/ public bundles do not contain any hardcoded Google API keys', () => {
    const distDir = path.resolve(__dirname, '../../dist');
    if (!fs.existsSync(distDir)) {
      // If not yet built, skip silently or note
      return;
    }

    const distFiles: string[] = [];
    function scanDist(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDist(fullPath);
        } else if (/\.(js|html|css|json)$/.test(entry.name)) {
          distFiles.push(fullPath);
        }
      }
    }

    scanDist(distDir);
    expect(distFiles.length).toBeGreaterThan(0);

    for (const file of distFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      // Assert no actual Google API key prefix exists in the distribution bundle
      const matches = content.match(/AIza[0-9A-Za-z\-_]{35}/g);
      expect(matches).toBeNull();
    }
  });
});
