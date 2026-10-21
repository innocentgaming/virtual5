/**
 * Currency, number, and percentage formatting utilities for EventWise AI.
 * Uses en-US standards to avoid system locale variance while properly handling negative numbers.
 */

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '$0';
  const isNegative = amount < 0;
  const absFormatted = Math.abs(Math.round(amount)).toLocaleString('en-US');
  return isNegative ? `-$${absFormatted}` : `$${absFormatted}`;
}

export function formatNumber(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  return Math.round(val).toLocaleString('en-US');
}

export function formatPercent(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0%';
  return `${Math.round(val * 10) / 10}%`;
}
