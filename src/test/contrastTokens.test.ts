import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../utils/color';

describe('WCAG AA Color Contrast Tokens Suite', () => {
  describe('Semantic alert tokens (text vs background)', () => {
    it('success text against success background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = contrastRatio('#064e3b', '#ecfdf5');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('warning text against warning background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = contrastRatio('#78350f', '#fffbeb');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('danger text against danger background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = contrastRatio('#7f1d1d', '#fef2f2');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('info text against info background meets WCAG AA (>= 4.5:1)', () => {
      const ratio = contrastRatio('#075985', '#f0f9ff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Brand colors on white background', () => {
    it('primary teal meets WCAG AA (>= 4.5:1)', () => {
      expect(contrastRatio('#0f766e', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });

    it('marigold accent meets WCAG AA (>= 4.5:1)', () => {
      expect(contrastRatio('#b45309', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });

    it('rani pink meets WCAG AA (>= 4.5:1)', () => {
      expect(contrastRatio('#be185d', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dietary requirement badge accents on white', () => {
    const dietColors = {
      jain: '#c2410c',
      pure_veg: '#15803d',
      gluten_free: '#b45309',
      halal: '#6d28d9',
      kosher: '#1d4ed8',
      nut_allergy: '#b91c1c',
    };

    Object.entries(dietColors).forEach(([diet, hex]) => {
      it(`${diet} (${hex}) meets WCAG AA (>= 4.5:1) on white`, () => {
        expect(contrastRatio(hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});
