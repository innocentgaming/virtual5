import React, { useState } from 'react';
import type { BudgetCategory, BudgetSummary } from '../../types/event';
import { formatCurrency, formatIndianShort, formatPercent } from '../../utils/formatters';
import { EmptyState } from '../common';
import { DollarSign } from 'lucide-react';

interface InteractiveBudgetChartProps {
  budgetSummary: BudgetSummary;
  categoryLabels: Record<BudgetCategory, string>;
  categoryColors: Record<BudgetCategory, string>;
}

export const InteractiveBudgetChart: React.FC<InteractiveBudgetChartProps> = ({
  budgetSummary,
  categoryLabels,
  categoryColors,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<BudgetCategory | null>(null);

  const categories = Object.keys(budgetSummary.categoryTotals) as BudgetCategory[];
  const validCategories = categories.filter((c) => budgetSummary.categoryTotals[c] > 0);

  const total = budgetSummary.totalEstimated || 0;

  if (total === 0 || validCategories.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign size={36} />}
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

  const activeCategory = hoveredCategory || validCategories[0] || 'venue';
  const activeAmount = budgetSummary.categoryTotals[activeCategory] || 0;
  const activePct = total > 0 ? (activeAmount / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', padding: '0.75rem 0' }}>
      {/* SVG Donut Chart with Smooth Transitions */}
      <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
          role="img"
          aria-label={`Donut chart showing ${validCategories.length} expense categories`}
        >
          {/* Background Ring Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--bg-card-subtle)"
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
            const color = categoryColors[cat] || '#64748b';

            return (
              <circle
                key={cat}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, filter 0.22s ease',
                  opacity: hoveredCategory && !isHovered ? 0.4 : 1,
                  filter: isHovered ? `drop-shadow(0 0 6px ${color}66)` : 'none',
                  outline: 'none',
                }}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
                onFocus={() => setHoveredCategory(cat)}
                onBlur={() => setHoveredCategory(null)}
                aria-label={`${categoryLabels[cat]}: ${formatCurrency(amount)} (${Math.round(ratio * 100)}%)`}
              />
            );
          })}
        </svg>

        {/* Center HUD Callout */}
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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {categoryLabels[activeCategory] || 'Allocated'}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            {formatCurrency(activeAmount)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {formatIndianShort(activeAmount)}
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: categoryColors[activeCategory] ? `${categoryColors[activeCategory]}22` : 'var(--bg-card-subtle)',
              color: categoryColors[activeCategory] || 'var(--text-main)',
              marginTop: '4px',
              border: `1px solid ${categoryColors[activeCategory] ? `${categoryColors[activeCategory]}44` : 'var(--border-light)'}`,
            }}
          >
            {formatPercent(activePct)} of spend
          </span>
        </div>
      </div>

      {/* Interactive Category Legend with Mini Progress Bars */}
      <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Category Allocations
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total: {formatCurrency(total)}
          </span>
        </div>

        {validCategories.map((cat) => {
          const amount = budgetSummary.categoryTotals[cat];
          const pct = (amount / total) * 100;
          const isHovered = hoveredCategory === cat;
          const color = categoryColors[cat] || '#64748b';

          return (
            <div
              key={cat}
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory(null)}
              tabIndex={0}
              onFocus={() => setHoveredCategory(cat)}
              onBlur={() => setHoveredCategory(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isHovered ? 'var(--bg-card-subtle)' : 'transparent',
                border: isHovered ? '1px solid var(--border-medium)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                outline: 'none',
              }}
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
                  <span style={{ fontSize: '0.85rem', fontWeight: isHovered ? 700 : 600, color: 'var(--text-main)' }}>
                    {categoryLabels[cat]}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {formatCurrency(amount)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>

              {/* Mini proportion bar */}
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
