/**
 * Currency, number, and percentage formatting utilities for EventWise AI India.
 * Uses Indian Rupee (₹) and Indian Numbering System (Lakhs & Crores) by default.
 */

const inrNumberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, currency: string = '₹'): string {
  if (isNaN(amount) || !isFinite(amount)) return `${currency}0`;
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const absFormatted = inrNumberFormatter.format(absVal);
  return isNegative ? `-${currency}${absFormatted}` : `${currency}${absFormatted}`;
}

/**
 * Formats large amounts into friendly Indian Lakhs / Crores shorthand.
 * e.g., 3500000 -> "₹35 Lakhs", 25000000 -> "₹2.5 Cr"
 */
export function formatIndianShort(amount: number, currency: string = '₹'): string {
  if (isNaN(amount) || !isFinite(amount)) return `${currency}0`;
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const prefix = isNegative ? `-${currency}` : currency;

  if (absVal >= 10000000) {
    const cr = Math.round((absVal / 10000000) * 10) / 10;
    return `${prefix}${cr} Cr`;
  }
  if (absVal >= 100000) {
    const lk = Math.round((absVal / 100000) * 10) / 10;
    return `${prefix}${lk} Lakhs`;
  }
  return `${prefix}${inrNumberFormatter.format(absVal)}`;
}

export function formatNumber(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  return inrNumberFormatter.format(Math.round(val));
}

export function formatPercent(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0%';
  return `${Math.round(val * 10) / 10}%`;
}

export type CurrencyCode = 'INR' | 'USD' | 'AED' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  ratePerInr: number;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', ratePerInr: 1 },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', ratePerInr: 1 / 86 },
  AED: { code: 'AED', symbol: 'AED ', label: 'AED (Dirham)', ratePerInr: 1 / 23.4 },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', ratePerInr: 1 / 112 },
};

export function convertFromInr(inrAmount: number, targetCurrency: CurrencyCode = 'INR'): number {
  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.INR;
  return inrAmount * config.ratePerInr;
}

export function formatWithCurrency(inrAmount: number, targetCurrency: CurrencyCode = 'INR'): string {
  if (targetCurrency === 'INR') {
    return formatCurrency(inrAmount, '₹');
  }
  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.INR;
  const converted = inrAmount * config.ratePerInr;
  const intlFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  });
  return `${config.symbol}${intlFormatter.format(Math.round(converted))}`;
}

