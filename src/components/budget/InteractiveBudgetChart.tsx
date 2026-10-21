import React, { useState } from 'react';
import type { BudgetCategory, BudgetSummary } from '../../types/event';
import { formatCurrency, formatPercent } from '../../utils/formatters';

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

  const total = budgetSummary.totalEstimated || 1;

  // Calculate SVG arc paths
  const radius = 80;
  const strokeWidth = 28;
  const center = 110;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  const activeCategory = hoveredCategory || validCategories[0] || 'venue';
  const activeAmount = budgetSummary.categoryTotals[activeCategory] || 0;
  const activePct = total > 0 ? (activeAmount / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 0' }}>
      {/* SVG Donut Chart */}
      <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
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
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                }}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
                aria-label={`${categoryLabels[cat]}: ${formatCurrency(amount)} (${Math.round(ratio * 100)}%)`}
              />
            );
          })}
        </svg>

        {/* Center Text HUD */}
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
            padding: '10px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            {categoryLabels[activeCategory] || 'Allocated'}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {formatCurrency(activeAmount)}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '999px',
              backgroundColor: categoryColors[activeCategory] ? `${categoryColors[activeCategory]}20` : 'var(--bg-card-subtle)',
              color: categoryColors[activeCategory] || 'var(--text-main)',
              marginTop: '2px',
            }}
          >
            {formatPercent(activePct)} of spend
          </span>
        </div>
      </div>

      {/* Legend & Interactive Highlighting Grid */}
      <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Category Allocations
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isHovered ? 'var(--bg-card-subtle)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
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
                <span style={{ fontSize: '0.85rem', fontWeight: isHovered ? 700 : 500, color: 'var(--text-main)' }}>
                  {categoryLabels[cat]}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatCurrency(amount)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '40px', textAlign: 'right' }}>
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
