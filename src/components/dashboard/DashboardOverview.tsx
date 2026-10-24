import React, { useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import type { EventPlan, BudgetSummary } from '../../types/event';
import type { NavigationTab } from '../../hooks/useEventPlan';
import { formatCurrency } from '../../utils/formatters';

interface DashboardOverviewProps {
  plan: EventPlan;
  budgetSummary: BudgetSummary;
  timelineAudit: {
    overdueCount: number;
    upcomingCount: number;
    completedCount: number;
    totalCount: number;
    progressPercentage: number;
  };
  onNavigateTab: (tab: NavigationTab) => void;
  onToggleTask: (id: string) => void;
  onRegenerateIdeas: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  plan,
  budgetSummary,
  timelineAudit,
  onNavigateTab,
  onToggleTask,
  onRegenerateIdeas,
}) => {
  // Days calculation
  const diffDays = useMemo(() => {
    const targetDate = new Date(plan.eventDate);
    const now = new Date();
    return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [plan.eventDate]);

  // Vendor summary
  const bookedVendors = useMemo(
    () => plan.vendors.filter((v) => v.status === 'booked' || v.status === 'completed').length,
    [plan.vendors]
  );
  const totalVendors = plan.vendors.length;

  // Upcoming top tasks
  const nextTasks = plan.tasks.filter((t) => !t.completed).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Event Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-subtle) 100%)',
          position: 'relative',
          overflow: 'hidden',
          borderColor: 'var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${plan.eventType}`}>
                {plan.eventType.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Theme: {plan.theme}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(34, 197, 94, 0.15))',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: 'var(--text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🇮🇳 Made for India First
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {plan.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={16} color="var(--accent-primary)" />
                {plan.eventDate} ({diffDays > 0 ? `${diffDays} days left` : diffDays === 0 ? 'Today!' : 'Passed'})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={16} color="var(--accent-primary)" />
                {plan.city} ({plan.venuePreference.replace('_', ' ')})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={16} color="var(--accent-primary)" />
                {plan.guestCount} Confirmed Guests
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => onNavigateTab('setup')}
              className="btn btn-secondary btn-sm"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={onRegenerateIdeas}
              className="btn btn-primary btn-sm"
              title="Refresh personalized ideas and recommendations"
            >
              <Sparkles size={14} />
              <span>Regenerate Ideas</span>
            </button>
          </div>
        </div>

        {/* Transparent generation note */}
        <div className="estimate-disclaimer" style={{ marginTop: '1rem' }}>
          {plan.plannerSource === 'ai' ? <Sparkles size={14} color="#6366f1" /> : <ShieldCheck size={14} color="#059669" />}
          <span>
            <strong>{plan.plannerSource === 'ai' ? 'AI Assisted Plan' : 'Deterministic Decision Engine Plan'}:</strong>{' '}
            {plan.generationExplanation} All vendor costs and dates are calculated estimates to guide your budgeting.
          </span>
        </div>
      </div>

      {/* Made for India First Cultural Guardrails Banner */}
      <div
        className="card"
        style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--bg-card-subtle)',
          borderColor: 'var(--border-medium)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
            <span>🇮🇳</span>
            <span>Made for India First — Cultural & Financial Guardrails</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tailored for Indian celebrations, large guest sizes & Vedic traditions</span>
        </div>
        <div className="grid-cols-4" style={{ gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>₹</span> Lakhs & Crores Scale
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Native en-IN grouping, contingency reserve, per-plate breakdown</div>
          </div>
          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🥗</span> Jain & Pure Veg Isolation
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Automated alerts for isolated counters and separate serving ladles</div>
          </div>
          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🥁</span> Baraat 10 PM Sound Curfew
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Municipal noise regulations pre-calibrating indoor Sangeet switch</div>
          </div>
          <div style={{ padding: '0.5rem 0.65rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#be185d', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🪔</span> Vedic Ritual Muhurats
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Day-of Haldi, Milni, Agni Kund Pheras & Pandit Ji samagri</div>
          </div>
        </div>
      </div>

      {/* Decision Insights / Active Rule Alerts */}
      {plan.missingInfoPrompts && plan.missingInfoPrompts.length > 0 && (
        <div className="alert-box alert-info" role="status">
          <HelpCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Helpful Details to Refine Your Plan</div>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
              {plan.missingInfoPrompts.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onNavigateTab('setup')}
              className="btn btn-sm btn-secondary"
              style={{ marginTop: '0.5rem' }}
            >
              Provide Missing Info
            </button>
          </div>
        </div>
      )}

      {plan.decisionInsights && plan.decisionInsights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {plan.decisionInsights.map((insight) => (
            <div
              key={insight.id}
              className={`alert-box alert-${insight.type === 'action_required' ? 'danger' : insight.type === 'warning' ? 'warning' : insight.type === 'positive' ? 'success' : 'info'}`}
              role="alert"
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{insight.title}</div>
                <div style={{ fontSize: '0.875rem' }}>{insight.message}</div>
              </div>
              {insight.actionLabel && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if (insight.actionType === 'NAVIGATE_BUDGET') onNavigateTab('budget');
                    else if (insight.actionType === 'NAVIGATE_TIMELINE_URGENT') onNavigateTab('timeline');
                  }}
                >
                  {insight.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid-cols-4">
        {/* Total Budget Card */}
        <div className="stat-card">
          <div className="stat-label">
            <DollarSign size={14} color="var(--accent-primary)" />
            Total Budget
          </div>
          <div className="stat-value">
            {formatCurrency(budgetSummary.totalBudget)}
          </div>
          <div className="stat-subtext">
            Per person: <strong>{formatCurrency(budgetSummary.perGuestCost)}</strong> / guest
          </div>
        </div>

        {/* Estimated Expenses & Utilization Card */}
        <div className="stat-card">
          <div className="stat-label">
            <TrendingUp size={14} color={budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--color-success)'} />
            Estimated Spend
          </div>
          <div className="stat-value" style={{ color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text-main)' }}>
            {formatCurrency(budgetSummary.totalEstimated)}
          </div>
          <div className="stat-subtext">
            {budgetSummary.isOverBudget ? (
              <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                Over by {formatCurrency(Math.abs(budgetSummary.remainingBalance))} ({budgetSummary.utilizationPercentage}%)
              </span>
            ) : (
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {formatCurrency(budgetSummary.remainingBalance)} remaining ({budgetSummary.utilizationPercentage}% used)
              </span>
            )}
          </div>
        </div>

        {/* Timeline Tasks Progress Card */}
        <div className="stat-card">
          <div className="stat-label">
            <CheckCircle2 size={14} color="var(--accent-primary)" />
            Task Completion
          </div>
          <div className="stat-value">
            {timelineAudit.progressPercentage}%
          </div>
          <div className="stat-subtext">
            {timelineAudit.completedCount} of {timelineAudit.totalCount} completed
            {timelineAudit.overdueCount > 0 && (
              <span style={{ color: 'var(--color-warning)', fontWeight: 700, marginLeft: '4px' }}>
                ({timelineAudit.overdueCount} overdue)
              </span>
            )}
          </div>
        </div>

        {/* Vendor Status Card */}
        <div className="stat-card">
          <div className="stat-label">
            <Users size={14} color="var(--accent-primary)" />
            Vendors Booked
          </div>
          <div className="stat-value">
            {bookedVendors} / {totalVendors}
          </div>
          <div className="stat-subtext">
            {totalVendors - bookedVendors} vendors still in inquiry
          </div>
        </div>
      </div>

      {/* Snapshot Previews: Budget & Next Tasks */}
      <div className="grid-cols-2">
        {/* Budget Snapshot */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <DollarSign size={18} color="var(--accent-primary)" />
              Budget Allocation Overview
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('budget')}
            >
              Full Budget <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem', fontWeight: 600 }}>
              <span>Budget Utilization</span>
              <span>{budgetSummary.utilizationPercentage}%</span>
            </div>
            <div className="progress-track" style={{ height: '10px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, budgetSummary.utilizationPercentage)}%`,
                  backgroundColor: budgetSummary.isOverBudget
                    ? 'var(--color-danger)'
                    : budgetSummary.utilizationPercentage > 85
                    ? 'var(--color-warning)'
                    : 'var(--accent-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {plan.budgetItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Category: {item.category}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{formatCurrency(item.estimatedCost)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent & Next Tasks Snapshot */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} color="var(--accent-primary)" />
              Priority Action Items
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('timeline')}
            >
              All Tasks <ArrowRight size={14} />
            </button>
          </div>

          {nextTasks.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: 600 }}>All planned tasks are complete!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card-subtle)',
                    borderLeft: task.priority === 'urgent' ? '4px solid var(--color-danger)' : '4px solid var(--accent-primary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    aria-label={`Mark ${task.title} complete`}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Due: {task.dueDate} · Priority: {task.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
