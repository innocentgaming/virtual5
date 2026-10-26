import React, { useState } from 'react';
import {
  Zap,
  CloudRain,
  UserPlus,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import type { EventPlan, BudgetSummary, TradeOffOption } from '../../types/event';
import type { ScenarioInput } from '../../hooks/useEventPlan';

interface ChaosBarProps {
  plan: EventPlan;
  budgetSummary?: BudgetSummary;
  onApplyScenario: (scenario: ScenarioInput) => void;
  onUndoLastChange: () => void;
  onApplyTradeOff?: (tradeOff: TradeOffOption, title?: string) => void;
  onTriggerPulse?: () => void;
  onOpenFullModal?: () => void;
  onFlashMetrics?: () => void;
  className?: string;
}

export const ChaosBar: React.FC<ChaosBarProps> = ({
  plan,
  onApplyScenario,
  onUndoLastChange,
  onApplyTradeOff,
  onTriggerPulse,
  className = '',
}) => {
  const [activeScenarioName, setActiveScenarioName] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hasChanges = Boolean(plan.changeLog && plan.changeLog.length > 0);

  const handleCatererSpike = () => {
    setActiveScenarioName('Caterer Quote Escalation (+20%)');
    onTriggerPulse?.();
    const caterer = plan.vendors.find((v) => v.category === 'caterer') || plan.vendors[0];
    onApplyScenario({
      vendorId: caterer?.id,
      vendorPriceSpikePercent: 20,
      scenarioName: 'Caterer Quote Escalation (+20%)',
    });
    setIsMenuOpen(false);
  };

  const handleRainScenario = () => {
    setActiveScenarioName('Unseasonal Rain on Outdoor Event');
    onTriggerPulse?.();
    onApplyScenario({
      newVenuePreference: 'farmhouse_lawn',
      scenarioName: 'Unseasonal Rain on Outdoor Event',
    });
    setIsMenuOpen(false);
  };

  const handleRsvpSurge = () => {
    setActiveScenarioName('Late RSVP Surge (+30 Guests)');
    onTriggerPulse?.();
    onApplyScenario({
      guestDelta: 30,
      scenarioName: 'Late RSVP Surge (+30 Guests)',
    });
    setIsMenuOpen(false);
  };

  const handleDateCompression = () => {
    setActiveScenarioName('Date Moved Earlier (-14 Days)');
    onTriggerPulse?.();
    onApplyScenario({
      dateShiftDays: -14,
      scenarioName: 'Date Moved Earlier (-14 Days)',
    });
    setIsMenuOpen(false);
  };

  const handleUndo = () => {
    onUndoLastChange();
    setActiveScenarioName(null);
    onTriggerPulse?.();
  };

  // Find the top trade-off from active insights to offer quick 1-click execution
  const topTradeOff = plan.decisionInsights?.find(
    (ins) => ins.tradeOffs && ins.tradeOffs.length > 0
  )?.tradeOffs?.[0];

  return (
    <div
      id="tour-chaos-bar"
      className={`chaos-bar ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(236, 72, 153, 0.06) 100%)',
        border: '1.5px solid var(--accent-secondary, #f59e0b)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Left Headline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'var(--color-warning, #f59e0b)',
              color: '#ffffff',
            }}
          >
            <Zap size={15} />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text, #1e293b)' }}>
                Volatility & Chaos Simulator
              </strong>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#b45309',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {activeScenarioName || 'Headline Feature'}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              Simulate disruptions, watch the budget recalculate in real time, and execute quantified trade-offs.
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Primary Chaos Button */}
          <button
            type="button"
            id="btn-simulate-caterer-spike"
            onClick={handleCatererSpike}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: '#b45309',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
              transition: 'transform 100ms ease, background 150ms ease',
            }}
            title="Simulate a 20% escalation on caterer quote"
          >
            <Zap size={14} />
            <span>Simulate: Caterer raises price 20%</span>
          </button>

          {/* Additional Scenarios Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="More simulation scenarios"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface-raised, #ffffff)',
                color: 'var(--text, #1e293b)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <span>More Scenarios</span>
              <ChevronDown size={14} />
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  background: 'var(--surface-raised, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={handleRainScenario}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text, #1e293b)',
                    cursor: 'pointer',
                  }}
                >
                  <CloudRain size={15} color="#0284c7" />
                  <span>Rain on outdoor day</span>
                </button>

                <button
                  type="button"
                  id="btn-simulate-rsvps"
                  onClick={handleRsvpSurge}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text, #1e293b)',
                    cursor: 'pointer',
                  }}
                >
                  <UserPlus size={15} color="#16a34a" />
                  <span>30 extra RSVPs</span>
                </button>

                <button
                  type="button"
                  id="btn-simulate-date-compression"
                  onClick={handleDateCompression}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text, #1e293b)',
                    cursor: 'pointer',
                  }}
                >
                  <Calendar size={15} color="#d97706" />
                  <span>Date moved 14 days earlier</span>
                </button>
              </div>
            )}
          </div>

          {/* Undo Button */}
          {hasChanges && (
            <button
              type="button"
              id="btn-undo-simulation"
              onClick={handleUndo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--surface-subtle, #f8fafc)',
                color: 'var(--text, #1e293b)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              title="Undo the last applied simulation"
            >
              <RotateCcw size={14} />
              <span>Undo ({plan.changeLog?.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic One-Click Suggestion Strip */}
      {topTradeOff && onApplyTradeOff && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text, #1e293b)' }}>
            <Sparkles size={14} color="var(--accent-primary, #b45309)" />
            <span>
              <strong>Trade-off suggestion:</strong> {topTradeOff.label} — {topTradeOff.description}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#16a34a',
                background: 'rgba(22, 163, 74, 0.1)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {topTradeOff.impactFormatted}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onApplyTradeOff(topTradeOff)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <span>Apply suggestion</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
