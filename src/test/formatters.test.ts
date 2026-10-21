import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent, formatIndianShort } from '../utils/formatters';

describe('Formatting Utilities', () => {
  it('formats positive currency amounts with en-IN digit separators and Rupee symbol', () => {
    expect(formatCurrency(12000)).toBe('₹12,000');
    expect(formatCurrency(500)).toBe('₹500');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(1250000)).toBe('₹12,50,000');
  });

  it('formats negative currency amounts cleanly as -₹X instead of ₹-X', () => {
    expect(formatCurrency(-500)).toBe('-₹500');
    expect(formatCurrency(-1500000)).toBe('-₹15,00,000');
  });

  it('handles invalid numbers, NaN, and infinity safely', () => {
    expect(formatCurrency(NaN)).toBe('₹0');
    expect(formatCurrency(Infinity)).toBe('₹0');
  });

  it('formats numbers with en-IN separators', () => {
    expect(formatNumber(150000)).toBe('1,50,000');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });

  it('formats Indian shorthand in Lakhs and Crores', () => {
    expect(formatIndianShort(3500000)).toBe('₹35 Lakhs');
    expect(formatIndianShort(25000000)).toBe('₹2.5 Cr');
    expect(formatIndianShort(45000)).toBe('₹45,000');
    expect(formatIndianShort(-5000000)).toBe('-₹50 Lakhs');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(12.5)).toBe('12.5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(NaN)).toBe('0%');
  });
});
