import { describe, it, expect, vi } from 'vitest';
import {
  generateWhatsAppInvite,
  generateBudgetCsv,
  downloadCsvFile,
} from '../services/shareExportService';
import { SAMPLE_WEDDING } from '../data/sampleEvents';
import type { BudgetSummary } from '../types/event';

describe('Share & Export Service Suite', () => {
  const mockBudgetSummary: BudgetSummary = {
    totalBudget: 3500000,
    totalEstimated: 3100000,
    totalActual: 3150000,
    variance: -50000,
    isOverBudget: false,
    utilizationPercentage: 88.5,
    contingencyAmount: 420000,
    perGuestCost: 8857,
  };

  describe('generateWhatsAppInvite', () => {
    it('generates a royal traditional WhatsApp invitation with Vedic greetings and Muhurats', () => {
      const invite = generateWhatsAppInvite(SAMPLE_WEDDING, 'royal');

      expect(invite).toContain('Shree Ganeshaya Namah');
      expect(invite).toContain(SAMPLE_WEDDING.title);
      expect(invite).toContain(SAMPLE_WEDDING.city);
      expect(invite).toContain('Sacred Muhurat & Ceremonies');
      expect(invite).toContain('RSVP');
      // Verify dietary mention for Jain/Pure Veg
      expect(invite).toContain('Dedicated Sattvic & Jain kitchen counters');
    });

    it('generates modern celebration invitation with emojis and upbeat tone', () => {
      const invite = generateWhatsAppInvite(SAMPLE_WEDDING, 'modern');

      expect(invite).toContain('Save the Date & Join the Celebration!');
      expect(invite).toContain(SAMPLE_WEDDING.title);
      expect(invite).toContain('Delicious royal banquet');
      expect(invite).toContain('Reply to this message to confirm your RSVP');
    });

    it('generates a gentle RSVP reminder with clear checkboxes', () => {
      const invite = generateWhatsAppInvite(SAMPLE_WEDDING, 'reminder');

      expect(invite).toContain('Gentle RSVP Reminder');
      expect(invite).toContain('Attending (Yes / No)');
      expect(invite).toContain('Special Dietary Requirements');
    });
  });

  describe('generateBudgetCsv', () => {
    it('generates RFC 4180 compliant CSV text with escaped headers and line items', () => {
      const csv = generateBudgetCsv(SAMPLE_WEDDING, mockBudgetSummary);

      expect(csv).toContain('"Category","Expense Item","Estimated (₹)","Actual (₹)"');
      expect(csv).toContain('"SUMMARY","Total Estimated Budget"');
      expect(csv).toContain('"CONTINGENCY"');
      expect(csv).toContain('"PER GUEST"');
      // Every line item in budget should be present
      (SAMPLE_WEDDING.budgetItems || []).forEach((item) => {
        expect(csv).toContain(`"${item.name}"`);
      });
    });

    it('handles special characters and quotes without breaking CSV columns', () => {
      const planWithQuotes = {
        ...SAMPLE_WEDDING,
        budgetItems: [
          {
            id: 'test-1',
            name: 'Special "Gold" Mandap, & Decor',
            category: 'decor' as const,
            estimatedCost: 50000,
            isPaid: false,
            notes: 'Includes 10% "discount", extra fabric',
          },
        ],
      };

      const csv = generateBudgetCsv(planWithQuotes, mockBudgetSummary);
      expect(csv).toContain('"Special ""Gold"" Mandap, & Decor"');
      expect(csv).toContain('"Includes 10% ""discount"", extra fabric"');
    });
  });

  describe('downloadCsvFile', () => {
    it('creates a download link and triggers click without throwing in browser/DOM environment', () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      // Mock URL.createObjectURL and revokeObjectURL
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob');
      URL.revokeObjectURL = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      downloadCsvFile('event-budget.csv', 'Category,Item,Cost\nDecor,Flowers,5000');

      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      // Restore
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });
  });
});
