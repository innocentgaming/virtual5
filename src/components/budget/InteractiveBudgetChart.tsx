import React, { useState } from 'react';
import type { BudgetCategory, BudgetSummary } from '../../types/event';
import { formatCurrency, formatIndianShort, formatPercent } from '../../utils/formatters';
import { EmptyState } from '../ui';
import { IndianRupee, Table as TableIcon, PieChart as PieChartIcon } from 'lucide-react';

interface InteractiveBudgetChartProps {
  budgetSummary: BudgetSummary;
  categoryLabels: Record<BudgetCategory, string>;
  categoryColors: Record<BudgetCategory, string>;
  selectedCategory?: 'all' | BudgetCategory;
  onSelectCategory?: (category: 'all' | BudgetCategory) => void;
}

const InteractiveBudgetChartComponent: React.FC<InteractiveBudgetChartProps> = ({
  budgetSummary,
  categoryLabels,
  categoryColors,
  selectedCategory = 'all',
  onSelectCategory,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<BudgetCategory | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);

  const categories = Object.keys(budgetSummary.categoryTotals) as BudgetCategory[];
  const validCategories = categories.filter((c) => (budgetSummary.categoryTotals[c] || 0) > 0);

  const total = budgetSummary.totalEstimated || 0;

  if (total === 0 || validCategories.length === 0) {
    return (
      <EmptyState
        icon={<IndianRupee size={36} />}
        title="No Expenses Allocated Yet"
        description="Add expenses or adjust budget allocations below to see the interactive distribution chart."
      />
    );
  }

  // Calculate SVG arc paths
  const radius = 80;
  const strokeWidth = 26;
  const center = 110;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  const activeCategory = hoveredCategory || (selectedCategory !== 'all' ? selectedCategory : null);
  const activeAmount = activeCategory ? budgetSummary.categoryTotals[activeCategory] || 0 : 0;
  const activePct = total > 0 && activeCategory ? (activeAmount / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Accessibility Chart / Data Table Toggle Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          type="button"
          id="btn-toggle-budget-table"
          onClick={() => setShowDataTable((prev) => !prev)}
          className="btn btn--outline btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          aria-expanded={showDataTable}
          aria-controls="budget-distribution-view"
        >
          {showDataTable ? (
            <>
              <PieChartIcon size={14} aria-hidden="true" />
              <span>View as Donut Chart</span>
            </>
          ) : (
            <>
              <TableIcon size={14} aria-hidden="true" />
              <span>View as Accessible Data Table</span>
            </>
          )}
        </button>
      </div>

      <div id="budget-distribution-view">
        {showDataTable ? (
          <div className="table-responsive card" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }} aria-label="Budget Category Distribution Data Table">
              <caption className="sr-only">Budget Category Allocation Breakdown in Indian Rupees</caption>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th scope="col" style={{ padding: '0.5rem' }}>Category</th>
                  <th scope="col" style={{ padding: '0.5rem', textAlign: 'right' }}>Amount (₹)</th>
                  <th scope="col" style={{ padding: '0.5rem', textAlign: 'right' }}>Share (%)</th>
                  <th scope="col" style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {validCategories.map((cat) => {
                  const amount = budgetSummary.categoryTotals[cat] || 0;
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  const isSelected = selectedCategory === cat;
                  return (
                    <tr
                      key={cat}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--surface-subtle)' : undefined,
                      }}
                    >
                      <th scope="row" style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: categoryColors[cat] || 'var(--text-muted)',
                              display: 'inline-block',
                            }}
                          />
                          {categoryLabels[cat]}
                        </span>
                      </th>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                        {formatCurrency(amount)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }} className="tabular-nums">
                        {Math.round(pct)}%
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                        {onSelectCategory && (
                          <button
                            type="button"
                            onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                            className="btn btn--ghost btn--xs"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          >
                            {isSelected ? 'Reset Filter' : 'Filter Items'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                  <th scope="row" style={{ padding: '0.75rem 0.5rem' }}>Total Allocated</th>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }} className="tabular-nums">
                    {formatCurrency(total)}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }} className="tabular-nums">
                    100%
                  </td>
                  <td aria-label="Empty cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div id="tour-budget-donut" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', padding: '0.75rem 0' }}>
      {/* SVG Donut Chart with Smooth Transitions */}
      <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
          role="img"
          aria-label={`Donut chart showing ${validCategories.length} expense categories with ${budgetSummary.utilizationPercentage}% budget utilized`}
        >
          {/* Background Ring Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--surface-subtle)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {validCategories.map((cat) => {
            const amount = budgetSummary.categoryTotals[cat];
            const ratio = amount / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += ratio * circumference;

            const isHovered = hoveredCategory === cat;
            const isSelected = selectedCategory === cat;
            const isDimmed = (hoveredCategory && !isHovered) || (selectedCategory !== 'all' && !isSelected && !hoveredCategory);
            const color = categoryColors[cat] || '#64748b';

            return (
              <circle
                key={cat}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered || isSelected ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                aria-hidden="true"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width var(--transition-normal), opacity var(--transition-normal), filter var(--transition-normal)',
                  opacity: isDimmed ? 0.35 : 1,
                  filter: isHovered || isSelected ? `drop-shadow(0 0 6px ${color}88)` : 'none',
                }}
                onClick={() => onSelectCategory?.(selectedCategory === cat ? 'all' : cat)}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            );
          })}
        </svg>

        {/* Center HUD Callout: shows active category or overall utilization */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '220px',
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '12px',
          }}
        >
          {activeCategory ? (
            <>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {categoryLabels[activeCategory]}
              </span>
              <span className="tabular-nums" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                {formatIndianShort(activeAmount)}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: categoryColors[activeCategory] ? `${categoryColors[activeCategory]}22` : 'var(--surface-subtle)',
                  color: categoryColors[activeCategory] || 'var(--text)',
                  marginTop: '4px',
                  border: `1px solid ${categoryColors[activeCategory] ? `${categoryColors[activeCategory]}44` : 'var(--border)'}`,
                }}
              >
                {formatPercent(activePct)} of spend
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Budget Utilized
              </span>
              <span className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800, color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text)', letterSpacing: '-0.025em' }}>
                {budgetSummary.utilizationPercentage}%
              </span>
              <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {formatIndianShort(budgetSummary.totalEstimated)} / {formatIndianShort(budgetSummary.totalBudget)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Accessible Text Alternative for Screen Readers */}
      <div className="sr-only">
        <h3>Expense category distribution details</h3>
        <ul>
          {validCategories.map((cat) => (
            <li key={cat}>
              {categoryLabels[cat]}: {formatCurrency(budgetSummary.categoryTotals[cat])} ({formatPercent((budgetSummary.categoryTotals[cat] / total) * 100)} of budget)
            </li>
          ))}
        </ul>
      </div>

      {/* Interactive Category Legend with Mini Progress Bars */}
      <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Category Allocations (Click to filter)
          </span>
          <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total: {formatCurrency(total)}
          </span>
        </div>

        {validCategories.map((cat) => {
          const amount = budgetSummary.categoryTotals[cat];
          const pct = (amount / total) * 100;
          const isHovered = hoveredCategory === cat;
          const isSelected = selectedCategory === cat;
          const color = categoryColors[cat] || '#64748b';

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory?.(selectedCategory === cat ? 'all' : cat)}
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory(null)}
              onFocus={() => setHoveredCategory(cat)}
              onBlur={() => setHoveredCategory(null)}
              aria-pressed={isSelected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected
                  ? 'var(--accent-subtle)'
                  : isHovered
                  ? 'var(--surface-subtle)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid var(--accent-primary)'
                  : isHovered
                  ? '1px solid var(--border)'
                  : '1px solid transparent',
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
              title={`Click to filter table by ${categoryLabels[cat]}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: isHovered || isSelected ? 700 : 600, color: 'var(--text)' }}>
                    {categoryLabels[cat]}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      (Filtered)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="tabular-nums" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                    {formatCurrency(amount)}
                  </span>
                  <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>

              {/* Mini proportion bar */}
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: '2px',
                    transition: 'width var(--transition-normal)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  )}
</div>
</div>
  );
};

export const InteractiveBudgetChart = React.memo(InteractiveBudgetChartComponent);
