import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

describe('Formatting Utilities', () => {
  it('formats positive currency amounts with en-US digit separators', () => {
    expect(formatCurrency(12000)).toBe('$12,000');
    expect(formatCurrency(500)).toBe('$500');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1250000)).toBe('$1,250,000');
  });

  it('formats negative currency amounts cleanly as -$X instead of $-X', () => {
    expect(formatCurrency(-500)).toBe('-$500');
    expect(formatCurrency(-15000)).toBe('-$15,000');
  });

  it('handles invalid numbers, NaN, and infinity safely', () => {
    expect(formatCurrency(NaN)).toBe('$0');
    expect(formatCurrency(Infinity)).toBe('$0');
  });

  it('formats numbers with standard separators', () => {
    expect(formatNumber(1500)).toBe('1,500');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(12.5)).toBe('12.5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(NaN)).toBe('0%');
  });
});
