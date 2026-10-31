import { describe, it, expect } from 'vitest';
import { escapeIcsText, foldIcsLine, generateIcsCalendar } from '../services/calendarService';
import type { EventPlan } from '../types/event';

describe('RFC 5545 Calendar Service Hardening', () => {
  describe('escapeIcsText', () => {
    it('returns empty string for empty input', () => {
      expect(escapeIcsText('')).toBe('');
      // eslint-disable-next-line typescript/no-explicit-any
      expect(escapeIcsText(null as any)).toBe('');
    });

    it('escapes backslashes, semicolons, and commas correctly', () => {
      const input = 'Path\\to\\file;item1,item2';
      const expected = 'Path\\\\to\\\\file\\;item1\\,item2';
      expect(escapeIcsText(input)).toBe(expected);
    });

    it('converts carriage return newlines and standalone newlines into literal \\n', () => {
      const input = 'Line 1\r\nLine 2\nLine 3\rLine 4';
      const result = escapeIcsText(input);
      expect(result).not.toContain('\r');
      expect(result).toBe('Line 1\\nLine 2\\nLine 3Line 4');
    });

    it('strips non-printable ASCII control characters to prevent CRLF injection', () => {
      const input = 'Malicious\x00\x08\x0b\x0cPayload\r\nBEGIN:VEVENT';
      const result = escapeIcsText(input);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x08');
      expect(result).toBe('MaliciousPayload\\nBEGIN:VEVENT');
    });

    it('handles multiple consecutive special characters without double-escaping', () => {
      const input = ';;;,,,\\\\\\';
      const expected = '\\;\\;\\;\\,\\,\\,\\\\\\\\\\\\';
      expect(escapeIcsText(input)).toBe(expected);
    });
  });

  describe('foldIcsLine', () => {
    it('does not fold lines 75 octets or shorter', () => {
      const line = 'SUMMARY:Short event title';
      expect(foldIcsLine(line)).toBe(line);
    });

    it('folds lines exceeding 75 octets with CRLF and single space continuation', () => {
      const longLine = 'DESCRIPTION:' + 'A'.repeat(100);
      const folded = foldIcsLine(longLine);
      const parts = folded.split('\r\n');
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(75);
      expect(parts[1].startsWith(' ')).toBe(true);
      expect(parts[1].length).toBeLessThanOrEqual(75);
    });

    it('folds extremely long lines (>200 chars) into multiple continuation lines', () => {
      const veryLong = 'NOTES:' + 'X'.repeat(250);
      const folded = foldIcsLine(veryLong);
      const parts = folded.split('\r\n');
      expect(parts.length).toBeGreaterThanOrEqual(4);
      parts.slice(1).forEach((part) => {
        expect(part.startsWith(' ')).toBe(true);
      });
    });
  });

  describe('generateIcsCalendar', () => {
    const mockPlan: EventPlan = {
      id: 'plan-rfc-1',
      title: 'Royal Wedding; Jaipur, India',
      eventType: 'wedding',
      eventDate: '2026-12-15',
      city: 'Jaipur, Rajasthan',
      guestCount: 350,
      totalBudget: 4500000,
      currency: '₹',
      contingencyRate: 0.12,
      venuePreference: 'heritage_haveli',
      foodPreference: 'royal_thali',
      theme: 'Rajputana Splendor',
      priorities: ['venue', 'catering'],
      accessibilityNeeds: [],
      culturalTraditions: 'Baraat, Pheras',
      specialNotes: 'Line 1\r\nLine 2 with; semicolons, and \\ backslashes',
      plannerSource: 'rule_engine',
      lastGeneratedAt: '2026-10-31T10:00:00.000Z',
      budgetItems: [],
      tasks: [
        {
          id: 't-1',
          title: 'Confirm caterer; check Jain options, and plates',
          category: 'catering',
          dueDate: '2026-11-20',
          completed: false,
          priority: 'urgent',
          notes: 'Special request: no root vegetables\\onions',
        },
      ],
      vendors: [],
      ideas: [],
      decisionInsights: [],
      missingInfoPrompts: [],
      generationExplanation: 'RFC test plan',
    };

    it('generates fully valid iCalendar format with CRLF line breaks and escaped fields', () => {
      const ics = generateIcsCalendar(mockPlan);

      expect(ics).toContain('BEGIN:VCALENDAR\r\n');
      expect(ics).toContain('VERSION:2.0\r\n');
      expect(ics).toContain('END:VCALENDAR');
      // Check unfolded text properties
      const unfolded = ics.replace(/\r\n /g, '');
      expect(unfolded).toContain('Royal Wedding\\; Jaipur\\, India');
      expect(unfolded).toContain('Jaipur\\, Rajasthan');
      expect(unfolded).toContain('Confirm caterer\\; check Jain options\\, and plates');
      expect(unfolded).toContain('no root vegetables\\\\onions');

      // Verify every line ending is \r\n
      const lines = ics.split('\r\n');
      expect(lines.length).toBeGreaterThan(10);
      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(75);
      });
    });
  });
});
