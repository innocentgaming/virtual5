import React, { useState } from 'react';
import {
  TrendingUp,
  RotateCcw,
  Sparkles,
  Calendar,
  Users,
  IndianRupee,
  ShieldAlert,
  History,
  CheckCircle2,
} from 'lucide-react';
import type { EventPlan, BudgetSummary, TradeOffOption } from '../../types/event';
import type { ScenarioInput } from '../../hooks/useEventPlan';
import { formatCurrency } from '../../utils/formatters';
import { Card, CardHeader, Button, Badge } from '../ui';

interface ScenarioChangePanelProps {
  plan: EventPlan;
  budgetSummary: BudgetSummary;
  onApplyScenario: (scenario: ScenarioInput) => void;
  onApplyTradeOff: (tradeOff: TradeOffOption, title?: string) => void;
  onUndoLastChange: () => void;
  onClose?: () => void;
}

export const ScenarioChangePanel: React.FC<ScenarioChangePanelProps> = ({
  plan,
  budgetSummary,
  onApplyScenario,
  onApplyTradeOff,
  onUndoLastChange,
  onClose,
}) => {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customPriceSpike, setCustomPriceSpike] = useState<number>(20);
  const [customGuestDelta, setCustomGuestDelta] = useState<number>(40);
  const [customDateDays, setCustomDateDays] = useState<number>(-20);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    plan.vendors[0]?.id || ''
  );

  // Collect all trade-offs from active insights
  const allTradeOffs: { insightTitle: string; tradeOff: TradeOffOption }[] = [];
  if (plan.decisionInsights) {
    for (const insight of plan.decisionInsights) {
      if (insight.tradeOffs) {
        for (const to of insight.tradeOffs) {
          allTradeOffs.push({
            insightTitle: insight.title,
            tradeOff: to,
          });
        }
      }
    }
  }

  const handlePreset = (type: string) => {
    setActivePreset(type);
    switch (type) {
      case 'caterer_spike': {
        const caterer = plan.vendors.find((v) => v.category === 'caterer') || plan.vendors[0];
        onApplyScenario({
          vendorId: caterer?.id,
          vendorPriceSpikePercent: 20,
          scenarioName: 'Caterer Quote Escalation (+20%)',
        });
        break;
      }
      case 'guest_surge': {
        onApplyScenario({
          guestDelta: 50,
          scenarioName: 'Late RSVP Surge (+50 Guests)',
        });
        break;
      }
      case 'date_rush': {
        onApplyScenario({
          dateShiftDays: -30,
          scenarioName: 'Event Advanced by 30 Days (Date Rush)',
        });
        break;
      }
      case 'outdoor_lawn': {
        onApplyScenario({
          newVenuePreference: 'farmhouse_lawn',
          scenarioName: 'Venue Shifted to Outdoor Farmhouse Lawn',
        });
        break;
      }
      case 'vendor_cancel': {
        const vendor = plan.vendors.find((v) => v.status !== 'cancelled') || plan.vendors[0];
        if (vendor) {
          onApplyScenario({
            cancelVendorId: vendor.id,
            scenarioName: `Emergency Cancellation: ${vendor.role}`,
          });
        }
        break;
      }
      case 'budget_cut': {
        onApplyScenario({
          budgetDeltaPercent: -15,
          scenarioName: 'Budget Cut (-15%)',
        });
        break;
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* 1. Header & Live Status */}
      <Card variant="default">
        <CardHeader
          title="What Changed? — Chaos & Scenario Simulator"
          subtitle="Simulate real-world Indian event volatility (quote spikes, guest surges, date shifts) and execute quantified trade-offs"
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {plan.changeLog && plan.changeLog.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onUndoLastChange}
                  leadingIcon={<RotateCcw size={14} />}
                >
                  Undo Last Change ({plan.changeLog.length})
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          }
        />

        {/* Live Metrics Impact Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-3)',
            background: 'var(--surface-subtle)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Budget Utilization
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text)',
              }}
            >
              {Math.round(budgetSummary.utilizationPercentage)}%
              {budgetSummary.isOverBudget && (
                <span style={{ fontSize: 'var(--text-xs)', marginLeft: '6px', color: 'var(--color-danger)' }}>
                  (Over by {formatCurrency(Math.abs(budgetSummary.remainingBalance))})
                </span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Per-Guest Cost
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
              {formatCurrency(budgetSummary.perGuestCost || 0)}
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
                / guest
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Target Headcount
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
              {plan.guestCount} guests
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Rules Triggered
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {plan.decisionInsights ? plan.decisionInsights.length : 0} alerts
            </div>
          </div>
        </div>
      </Card>

      {/* 2. One-Click Scenario Presets */}
      <Card>
        <CardHeader
          title="1-Click Scenario Presets"
          subtitle="Instant stress-testing presets simulating unexpected Indian celebration changes"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
          <Button
            variant={activePreset === 'caterer_spike' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('caterer_spike')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IndianRupee size={15} /> Caterer Price Spike (+20%)
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Simulates actual quote escalation by royal caterer
              </div>
            </div>
          </Button>

          <Button
            variant={activePreset === 'guest_surge' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('guest_surge')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} /> Guest Count Surge (+50)
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Simulates late extended family RSVPs exceeding capacity
              </div>
            </div>
          </Button>

          <Button
            variant={activePreset === 'date_rush' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('date_rush')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} /> 30-Day Date Rush
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Advances event date & triggers timeline re-pacing
              </div>
            </div>
          </Button>

          <Button
            variant={activePreset === 'outdoor_lawn' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('outdoor_lawn')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} /> Switch to Outdoor Lawn
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Triggers rain contingency & marquee pandal rules
              </div>
            </div>
          </Button>

          <Button
            variant={activePreset === 'vendor_cancel' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('vendor_cancel')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={15} /> Vendor Unavailable
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Simulates last-minute vendor dropout / cancellation
              </div>
            </div>
          </Button>

          <Button
            variant={activePreset === 'budget_cut' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handlePreset('budget_cut')}
            style={{ justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)', height: 'auto', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} /> Budget Reduction (-15%)
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Cuts allocated ceiling and prompts category trims
              </div>
            </div>
          </Button>
        </div>
      </Card>

      {/* 3. Custom Scenario Sliders */}
      <Card variant="subtle">
        <CardHeader
          title="Custom Stress-Test Parameters"
          subtitle="Manually adjust variance values and apply custom shifts"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Price Spike */}
          <div>
            <label className="form-label" htmlFor="spike-input">
              Vendor Quote Spike: <strong className="tabular-nums">+{customPriceSpike}%</strong>
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                id="spike-input"
                type="range"
                min="5"
                max="50"
                step="5"
                value={customPriceSpike}
                onChange={(e) => setCustomPriceSpike(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onApplyScenario({
                    vendorPriceSpikePercent: customPriceSpike,
                    scenarioName: `Vendor Spike (+${customPriceSpike}%)`,
                  })
                }
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Guest Count */}
          <div>
            <label className="form-label" htmlFor="guest-input">
              Guest Count Shift: <strong className="tabular-nums">{customGuestDelta > 0 ? `+${customGuestDelta}` : customGuestDelta}</strong>
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                id="guest-input"
                type="range"
                min="-100"
                max="150"
                step="10"
                value={customGuestDelta}
                onChange={(e) => setCustomGuestDelta(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onApplyScenario({
                    guestDelta: customGuestDelta,
                    scenarioName: `Guest Shift (${customGuestDelta > 0 ? '+' : ''}${customGuestDelta})`,
                  })
                }
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Date Shift */}
          <div>
            <label className="form-label" htmlFor="date-input">
              Date Move (Days): <strong className="tabular-nums">{customDateDays > 0 ? `+${customDateDays}` : customDateDays} d</strong>
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                id="date-input"
                type="range"
                min="-60"
                max="90"
                step="5"
                value={customDateDays}
                onChange={(e) => setCustomDateDays(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onApplyScenario({
                    dateShiftDays: customDateDays,
                    scenarioName: `Date Shift (${customDateDays > 0 ? '+' : ''}${customDateDays} days)`,
                  })
                }
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Cancel specific vendor */}
          <div>
            <label className="form-label" htmlFor="cancel-select">
              Simulate Vendor Cancellation
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <select
                id="cancel-select"
                className="form-control"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{ fontSize: 'var(--text-xs)', height: '36px' }}
              >
                {plan.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.role} ({formatCurrency(v.estimatedCost)})
                  </option>
                ))}
              </select>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const targetV = plan.vendors.find((v) => v.id === selectedVendorId);
                  if (targetV) {
                    onApplyScenario({
                      cancelVendorId: targetV.id,
                      scenarioName: `Cancelled: ${targetV.role}`,
                    });
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Active Decision Engine Trade-Offs (Concrete 1-Click Actions) */}
      <Card style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <CardHeader
          title="Active Dynamic Trade-Offs"
          subtitle={`${allTradeOffs.length} concrete corrective actions calculated by the deterministic decision engine with exact ₹ impacts`}
        />

        {allTradeOffs.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-5)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto var(--space-2)' }} />
            <div>All plan parameters are currently aligned with zero pending trade-offs.</div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>
              Simulate a vendor quote spike or guest surge above to test the engine's trade-off calculations.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {allTradeOffs.map(({ insightTitle, tradeOff }) => (
              <div
                key={tradeOff.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge variant="info">{tradeOff.impactFormatted}</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Triggered by: {insightTitle}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                    {tradeOff.label}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {tradeOff.description}
                  </div>
                </div>

                <div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApplyTradeOff(tradeOff, tradeOff.label)}
                  >
                    Apply Trade-off
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Change Log & Undo History */}
      {plan.changeLog && plan.changeLog.length > 0 && (
        <Card variant="subtle">
          <CardHeader
            title="Change History & Audit Trail"
            subtitle={`${plan.changeLog.length} recorded modifications with 1-click state rollback`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={onUndoLastChange}
                leadingIcon={<RotateCcw size={14} />}
              >
                Undo Last Change
              </Button>
            }
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {plan.changeLog.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-2) var(--space-3)',
                  background: idx === 0 ? 'var(--surface)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <History size={14} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{entry.changeTitle}</span>
                  <span style={{ color: 'var(--text-muted)' }}>— {entry.description}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
