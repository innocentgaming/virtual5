import { describe, it, expect } from 'vitest';
import { calculateBudgetSummary } from '../services/decisionEngine';
import type { BudgetItem } from '../types/event';

describe('Budget Calculations & Boundary Tests', () => {
  it('calculates total estimated cost and remaining balance correctly with contingency', () => {
    const items: BudgetItem[] = [
      { id: '1', name: 'Venue Rental', category: 'venue', estimatedCost: 5000, priority: 'essential' },
      { id: '2', name: 'Catering Buffet', category: 'catering', estimatedCost: 3000, priority: 'essential' },
      { id: '3', name: 'Photography', category: 'photography', estimatedCost: 1500, priority: 'recommended' },
    ];

    // Total budget = 10,000; Contingency rate = 10% (1,000)
    // Non-contingency = 9,500; Total estimated = 9,500 + 1,000 = 10,500
    const summary = calculateBudgetSummary(10000, items, 0.10);

    expect(summary.totalBudget).toBe(10000);
    expect(summary.contingencyAmount).toBe(1000);
    expect(summary.totalEstimated).toBe(10500);
    expect(summary.remainingBalance).toBe(-500);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.utilizationPercentage).toBe(105);
    expect(summary.categoryTotals.venue).toBe(5000);
    expect(summary.categoryTotals.catering).toBe(3000);
    expect(summary.categoryTotals.photography).toBe(1500);
  });

  it('handles within-budget scenario with surplus balance', () => {
    const items: BudgetItem[] = [
      { id: '1', name: 'Hall Rental', category: 'venue', estimatedCost: 2000, priority: 'essential' },
      { id: '2', name: 'DJ Music', category: 'entertainment', estimatedCost: 800, priority: 'recommended' },
    ];

    // Budget = 5,000; Contingency 10% = 500. Total = 2,800 + 500 = 3,300
    const summary = calculateBudgetSummary(5000, items, 0.10);

    expect(summary.totalEstimated).toBe(3300);
    expect(summary.remainingBalance).toBe(1700);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.utilizationPercentage).toBe(66);
  });

  it('safely handles zero, negative, and invalid NaN values', () => {
    const itemsWithNegatives: BudgetItem[] = [
      { id: '1', name: 'Invalid Negative Item', category: 'venue', estimatedCost: -1500, priority: 'essential' },
      // @ts-expect-error testing runtime NaN edge case
      { id: '2', name: 'Corrupted NaN Item', category: 'catering', estimatedCost: NaN, priority: 'essential' },
      { id: '3', name: 'Valid Item', category: 'decor', estimatedCost: 400, priority: 'recommended' },
    ];

    // Should clamp negative to 0 and NaN to 0
    const summary = calculateBudgetSummary(-5000, itemsWithNegatives, -0.05);

    expect(summary.totalBudget).toBe(0); // clamped to 0
    expect(summary.contingencyAmount).toBe(0);
    expect(summary.categoryTotals.decor).toBe(400);
    expect(summary.categoryTotals.venue).toBe(0);
    expect(summary.categoryTotals.catering).toBe(0);
    expect(summary.totalEstimated).toBe(400);
    expect(summary.remainingBalance).toBe(-400);
    expect(summary.isOverBudget).toBe(true);
  });

  it('clamps contingency rate between 0 and 50%', () => {
    const items: BudgetItem[] = [
      { id: '1', name: 'Venue', category: 'venue', estimatedCost: 1000, priority: 'essential' },
    ];

    const extremeHigh = calculateBudgetSummary(10000, items, 0.95);
    expect(extremeHigh.contingencyAmount).toBe(5000); // capped at 50%

    const extremeLow = calculateBudgetSummary(10000, items, -0.20);
    expect(extremeLow.contingencyAmount).toBe(0); // floor at 0%
  });
});
