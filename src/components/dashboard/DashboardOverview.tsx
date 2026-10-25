import React, { useMemo, useState, Suspense } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  PartyPopper,
  Heart,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type { EventPlan, BudgetSummary, DecisionInsight, TradeOffOption } from '../../types/event';
import type { NavigationTab, ScenarioInput } from '../../hooks/useEventPlan';
import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency, formatIndianShort, formatPercent } from '../../utils/formatters';
import { Card, CardHeader, Button, Badge, EmptyState, Skeleton, Toast, Modal } from '../ui';
import { lazyWithPreload } from '../../utils/lazyWithPreload';

const ScenarioChangePanel = lazyWithPreload(() =>
  import('../scenarios/ScenarioChangePanel').then((m) => ({ default: m.ScenarioChangePanel }))
);

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
  onOpenCopilot?: () => void;
  onExportCalendar?: () => void;
  onApplyTradeOff?: (tradeOff: TradeOffOption, title?: string) => void;
  onApplyScenario?: (scenario: ScenarioInput) => void;
  onUndoLastChange?: () => void;
  isGenerating?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  plan,
  budgetSummary,
  timelineAudit,
  onNavigateTab,
  onToggleTask,
  onOpenCopilot,
  onExportCalendar,
  onApplyTradeOff,
  onApplyScenario,
  onUndoLastChange,
  isGenerating = false,
}) => {
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Countdown in days
  const diffDays = useMemo(() => {
    const targetDate = new Date(plan.eventDate);
    const now = new Date();
    return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [plan.eventDate]);

  // Vendor calculations
  const bookedVendors = useMemo(
    () => plan.vendors.filter((v) => v.status === 'booked' || v.status === 'completed').length,
    [plan.vendors]
  );
  const totalVendors = plan.vendors.length;

  // Guest calculations (including plus-ones)
  const confirmedGuests = useMemo(() => {
    const guests = plan.guests || [];
    return guests
      .filter((g) => g.rsvpStatus === 'attending')
      .reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
  }, [plan.guests]);

  // Per-guest cost
  const perGuestCost = useMemo(() => {
    return budgetSummary.perGuestCost || Math.round(budgetSummary.totalBudget / Math.max(plan.guestCount, 1));
  }, [budgetSummary.perGuestCost, budgetSummary.totalBudget, plan.guestCount]);

  // Animated Count-Up figures (skips under reduced motion or tests)
  const animatedDiffDays = useCountUp(diffDays < 0 ? 0 : diffDays);
  const animatedCompleted = useCountUp(timelineAudit.completedCount);
  const animatedBookedVendors = useCountUp(bookedVendors);
  const animatedConfirmedGuests = useCountUp(confirmedGuests);

  // Budget utilization metrics for ring
  const utilizationPercent = useMemo(() => {
    if (typeof budgetSummary.utilizationPercentage === 'number') {
      return Math.round(budgetSummary.utilizationPercentage);
    }
    if (!budgetSummary.totalBudget || budgetSummary.totalBudget <= 0) return 0;
    return Math.round((budgetSummary.totalEstimated / budgetSummary.totalBudget) * 100);
  }, [budgetSummary.utilizationPercentage, budgetSummary.totalEstimated, budgetSummary.totalBudget]);

  const ringColor = useMemo(() => {
    if (utilizationPercent >= 100) return 'var(--color-danger)';
    if (utilizationPercent >= 80) return 'var(--color-warning)';
    return 'var(--accent-primary)';
  }, [utilizationPercent]);

  // Ring circumference (radius = 38)
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(utilizationPercent, 100) / 100);

  // Decision engine insights sorted by severity
  const sortedInsights = useMemo(() => {
    const severityScore: Record<string, number> = {
      action_required: 0,
      warning: 1,
      suggestion: 2,
      positive: 3,
    };
    const insights = plan.decisionInsights || [];
    return [...insights].sort((a, b) => {
      const scoreA = severityScore[a.type] ?? 4;
      const scoreB = severityScore[b.type] ?? 4;
      return scoreA - scoreB;
    });
  }, [plan.decisionInsights]);

  const displayedInsights = showAllAlerts ? sortedInsights : sortedInsights.slice(0, 3);

  // Next up tasks (next 3 upcoming or overdue)
  const nextUpTasks = useMemo(() => {
    const uncompleted = plan.tasks.filter((t) => !t.completed);
    const todayStr = new Date().toISOString().split('T')[0];
    return uncompleted
      .sort((a, b) => {
        const isOverdueA = a.dueDate < todayStr;
        const isOverdueB = b.dueDate < todayStr;
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        return a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 3);
  }, [plan.tasks]);

  const handleTaskCheck = (taskId: string, title: string, isCurrentlyDone: boolean) => {
    onToggleTask(taskId);
    if (!isCurrentlyDone) {
      setToastMessage(`✓ Task completed: ${title}`);
    }
  };

  const getInsightIcon = (type: DecisionInsight['type']) => {
    switch (type) {
      case 'action_required':
        return <AlertCircle size={18} color="var(--color-danger)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-warning)" />;
      case 'suggestion':
        return <TrendingUp size={18} color="var(--accent-primary)" />;
      default:
        return <CheckCircle2 size={18} color="var(--color-success)" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'wedding':
        return <Heart size={20} />;
      case 'birthday':
        return <PartyPopper size={20} />;
      default:
        return <Users size={20} />;
    }
  };

  const getBadgeVariant = (type: string): 'wedding' | 'birthday' | 'community' => {
    switch (type) {
      case 'wedding':
        return 'wedding';
      case 'birthday':
        return 'birthday';
      default:
        return 'community';
    }
  };

  if (isGenerating) {
    return (
      <div className="dashboard-grid-12" aria-busy="true" aria-label="Loading event dashboard">
        <div className="dashboard-hero-col">
          <Skeleton shape="block" height={180} />
        </div>
        <div className="dashboard-metric-col"><Skeleton shape="block" height={100} /></div>
        <div className="dashboard-metric-col"><Skeleton shape="block" height={100} /></div>
        <div className="dashboard-metric-col"><Skeleton shape="block" height={100} /></div>
        <div className="dashboard-metric-col"><Skeleton shape="block" height={100} /></div>
        <div className="dashboard-main-col">
          <Skeleton shape="block" height={260} />
        </div>
        <div className="dashboard-side-col">
          <Skeleton shape="block" height={260} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid-12">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* =========================================================================
          1. HERO EVENT BANNER CARD (Full 12 columns)
          ========================================================================= */}
      <div className="dashboard-hero-col">
        <Card
          className="hero-banner-card"
          style={{
            background: 'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface-subtle) 100%)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
            {/* Left: Event Identity & Date */}
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Badge variant={getBadgeVariant(plan.eventType)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {getEventTypeIcon(plan.eventType)}
                    <span>{plan.eventType.toUpperCase()}</span>
                  </span>
                </Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Theme: {plan.theme}
                </span>
                {plan.culturalTraditions && (
                  <Badge variant="success" dot>
                    Traditions Configured
                  </Badge>
                )}
              </div>

              <h2
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text)',
                  marginBottom: 'var(--space-2)',
                  lineHeight: 1.2,
                }}
              >
                {plan.title}
              </h2>

              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <MapPin size={16} />
                  <span>{plan.city}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Calendar size={16} />
                  <span>{new Date(plan.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Users size={16} />
                  <span className="tabular-nums">{plan.guestCount} guests invited</span>
                </span>
              </div>
            </div>

            {/* Middle: Big Countdown Badge */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-3) var(--space-5)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                minWidth: '130px',
              }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  color: diffDays <= 7 ? 'var(--color-danger)' : 'var(--text)',
                  lineHeight: 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {animatedDiffDays}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                {diffDays === 0 ? 'Event Day 🎉' : diffDays === 1 ? 'Day to go' : 'Days to go'}
              </span>
            </div>

            {/* Right: ₹ Budget Utilization Ring */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-5)',
                minWidth: '260px',
              }}
            >
              <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                <svg width="84" height="84" viewBox="0 0 84 84">
                  {/* Background Track */}
                  <circle
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="transparent"
                    stroke="var(--border)"
                    strokeWidth="7"
                  />
                  {/* Animated Progress Ring */}
                  <circle
                    className="budget-ring-circle"
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="transparent"
                    stroke={ringColor}
                    strokeWidth="7"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 42 42)"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <span className="tabular-nums" style={{ fontSize: '0.9rem', fontWeight: 800, color: ringColor, lineHeight: 1 }}>
                    {utilizationPercent}%
                  </span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    used
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Budget Utilization
                </div>
                <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                  {formatIndianShort(budgetSummary.totalEstimated)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}> of </span>
                  {formatIndianShort(budgetSummary.totalBudget)}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: '4px' }}>
                  {utilizationPercent >= 100 ? (
                    <Badge variant="danger">Budget Exceeded</Badge>
                  ) : utilizationPercent >= 80 ? (
                    <Badge variant="warning">Near Limit</Badge>
                  ) : (
                    <Badge variant="success">On Track</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          1B. CHANGE HANDLING & SCENARIO HUB CALLOUT BANNER
          ========================================================================= */}
      <div style={{ gridColumn: 'span 12' }}>
        <Card variant="subtle" style={{ border: '1px solid var(--accent-primary)', background: 'var(--surface-raised)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
                  Dynamic Change & Chaos Engine
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Stress-test catering price spikes, late guest surges, and date shifts with live ₹ trade-off resolution
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onApplyScenario) {
                    onApplyScenario({
                      vendorPriceSpikePercent: 20,
                      scenarioName: 'Caterer Price Hike (+20%)',
                    });
                    setToastMessage('✓ Caterer quote spike (+20%) simulated; see trade-offs below');
                  }
                }}
              >
                +20% Caterer Spike
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onApplyScenario) {
                    onApplyScenario({
                      guestDelta: 50,
                      scenarioName: 'RSVP Headcount Surge (+50)',
                    });
                    setToastMessage('✓ Guest surge (+50) simulated; capacity rules active');
                  }
                }}
              >
                +50 Guests Surge
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsScenarioModalOpen(true)}
                leadingIcon={<SlidersHorizontal size={14} />}
              >
                Simulate Scenario / What Changed?
              </Button>

              {plan.changeLog && plan.changeLog.length > 0 && onUndoLastChange && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onUndoLastChange();
                    setToastMessage('✓ Rolled back last change from history');
                  }}
                  leadingIcon={<RotateCcw size={14} />}
                >
                  Undo ({plan.changeLog.length})
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          2. FOUR CLICKABLE METRIC CARDS (3 columns each)
          ========================================================================= */}
      <div className="dashboard-metric-col">
        <Card
          interactive
          onClick={() => onNavigateTab('budget')}
          role="button"
          tabIndex={0}
          aria-label="Per-guest budget breakdown"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('budget'); } }}
        >
          <dl style={{ margin: 0, padding: 0 }}>
            <dt className="stat-label">
              <IndianRupee size={14} aria-hidden="true" />
              <span>Per-Guest Cost</span>
            </dt>
            <dd className="stat-value tabular-nums" style={{ margin: 0 }}>
              {formatCurrency(perGuestCost)}
            </dd>
            <dd className="stat-subtext" style={{ margin: 0 }}>
              <span>Total Budget: </span>
              <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatIndianShort(budgetSummary.totalBudget)}</span>
            </dd>
          </dl>
        </Card>
      </div>

      <div className="dashboard-metric-col">
        <Card
          interactive
          onClick={() => onNavigateTab('timeline')}
          role="button"
          tabIndex={0}
          aria-label="Completed tasks summary"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('timeline'); } }}
        >
          <dl style={{ margin: 0, padding: 0 }}>
            <dt className="stat-label">
              <Clock size={14} aria-hidden="true" />
              <span>Tasks Done</span>
            </dt>
            <dd className="stat-value tabular-nums" style={{ margin: 0 }}>
              {animatedCompleted} / {timelineAudit.totalCount}
            </dd>
            <dd className="stat-subtext" style={{ margin: 0 }}>
              <span>Task Completion: </span>
              <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatPercent(timelineAudit.progressPercentage)}</span>
            </dd>
          </dl>
        </Card>
      </div>

      <div className="dashboard-metric-col">
        <Card
          interactive
          onClick={() => onNavigateTab('vendors')}
          role="button"
          tabIndex={0}
          aria-label="Booked vendors summary"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('vendors'); } }}
        >
          <dl style={{ margin: 0, padding: 0 }}>
            <dt className="stat-label">
              <ShieldAlert size={14} aria-hidden="true" />
              <span>Vendors Booked</span>
            </dt>
            <dd className="stat-value tabular-nums" style={{ margin: 0 }}>
              {animatedBookedVendors} / {totalVendors}
            </dd>
            <dd className="stat-subtext" style={{ margin: 0 }}>
              <span>Estimated Spend: </span>
              <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatIndianShort(budgetSummary.totalEstimated)}</span>
            </dd>
          </dl>
        </Card>
      </div>

      <div className="dashboard-metric-col">
        <Card
          interactive
          onClick={() => onNavigateTab('guests')}
          role="button"
          tabIndex={0}
          aria-label="Confirmed guest count"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab('guests'); } }}
        >
          <dl style={{ margin: 0, padding: 0 }}>
            <dt className="stat-label">
              <Users size={14} aria-hidden="true" />
              <span>RSVPs Confirmed</span>
            </dt>
            <dd className="stat-value tabular-nums" style={{ margin: 0 }}>
              {animatedConfirmedGuests} / {plan.guestCount}
            </dd>
            <dd className="stat-subtext" style={{ margin: 0 }}>
              <span>Attendance Rate: </span>
              <span className="tabular-nums" style={{ fontWeight: 600 }}>
                {formatPercent((confirmedGuests / Math.max(plan.guestCount, 1)) * 100)}
              </span>
            </dd>
          </dl>
        </Card>
      </div>

      {/* =========================================================================
          3. MAIN COLUMN (8 cols): Next Up Tasks, Quick Actions, Cultural Insights
          ========================================================================= */}
      <div className="dashboard-main-col">
        {/* Next Up Tasks Panel */}
        <Card>
          <CardHeader
            title="Next Up"
            subtitle="Prioritized upcoming milestones & overdue tasks"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('timeline')}
                rightIcon={<ArrowRight size={14} />}
              >
                View all tasks ({plan.tasks.length})
              </Button>
            }
          />

          {nextUpTasks.length === 0 ? (
            <EmptyState
              title="All tasks completed 🎉"
              description="You have completed every scheduled preparation task for this event."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {nextUpTasks.map((task) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isOverdue = task.dueDate < todayStr && !task.completed;

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      background: isOverdue ? 'var(--color-danger-bg)' : 'var(--surface-subtle)',
                      border: `1px solid ${isOverdue ? 'var(--color-danger-border)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleTaskCheck(task.id, task.title, task.completed)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        aria-label={`Mark "${task.title}" complete`}
                      />
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: isOverdue ? 'var(--color-danger-text)' : 'var(--text-muted)' }}>
                          Due: {task.dueDate} {isOverdue && '• Overdue'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isOverdue ? (
                        <Badge variant="danger">Overdue</Badge>
                      ) : (
                        <Badge variant="neutral">{task.category}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Action Bar */}
        <Card>
          <CardHeader
            title="Quick Planner Actions"
            subtitle="Frequently accessed workflows & on-ground exports"
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigateTab('budget')}
              leadingIcon={<IndianRupee size={16} />}
            >
              Add Expense
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigateTab('guests')}
              leadingIcon={<Users size={16} />}
            >
              Add Guest
            </Button>
            {onExportCalendar && (
              <Button
                variant="outline"
                size="md"
                onClick={onExportCalendar}
                leadingIcon={<Calendar size={16} />}
              >
                Export iCal
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsScenarioModalOpen(true)}
              leadingIcon={<SlidersHorizontal size={16} />}
            >
              What Changed?
            </Button>
            {onOpenCopilot && (
              <Button
                variant="primary"
                size="md"
                onClick={onOpenCopilot}
                leadingIcon={<Sparkles size={16} />}
              >
                Ask Copilot
              </Button>
            )}
          </div>
        </Card>

        {/* Cultural Notes & Weather Guardrails */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
          <Card variant="subtle">
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span>🇮🇳</span>
              <span>Cultural Protocols</span>
            </h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Curated for {plan.eventType} in {plan.city}. Includes 10:00 PM sound curfew buffers and dedicated pure-veg / Jain food prep isolation.
            </p>
          </Card>

          <Card variant="subtle">
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span>⛅</span>
              <span>Weather & Seasonality</span>
            </h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Event date is set in seasonal window for {plan.city}. Outdoor and rooftop ceremonies have mandatory rain contingency buffer.
            </p>
          </Card>
        </div>
      </div>

      {/* =========================================================================
          4. SIDE COLUMN (4 cols): Needs Attention Panel
          ========================================================================= */}
      <div className="dashboard-side-col">
        <Card style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <CardHeader
            title="Needs Attention"
            subtitle={`${sortedInsights.length} active decision-engine alerts`}
            action={
              sortedInsights.length > 3 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAlerts((prev) => !prev)}
                >
                  {showAllAlerts ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Less <ChevronUp size={14} />
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      View all ({sortedInsights.length}) <ChevronDown size={14} />
                    </span>
                  )}
                </Button>
              ) : null
            }
          />

          {sortedInsights.length === 0 ? (
            <EmptyState
              title="All clear 🎉"
              description="Your event preparation is running on schedule with zero high-priority conflicts."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {displayedInsights.map((insight) => (
                <div
                  key={insight.id}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background:
                      insight.type === 'action_required'
                        ? 'var(--color-danger-bg)'
                        : insight.type === 'warning'
                        ? 'var(--color-warning-bg)'
                        : 'var(--surface-subtle)',
                    border: `1px solid ${
                      insight.type === 'action_required'
                        ? 'var(--color-danger-border)'
                        : insight.type === 'warning'
                        ? 'var(--color-warning-border)'
                        : 'var(--border)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px' }}>{getInsightIcon(insight.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>
                        {insight.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 6px 0', lineHeight: 1.4 }}>
                        {insight.message}
                      </div>

                      {/* 1-Click Actionable Trade-Offs */}
                      {insight.tradeOffs && insight.tradeOffs.length > 0 && (
                        <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Trade-offs (1-Click Apply):
                          </div>
                          {insight.tradeOffs.map((to) => (
                            <div
                              key={to.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '4px 8px',
                                gap: '6px',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>
                                  {to.label}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                  {to.impactFormatted}
                                </div>
                              </div>
                              <Button
                                variant="primary"
                                size="sm"
                                style={{ fontSize: '0.68rem', padding: '2px 8px', height: '26px' }}
                                onClick={() => {
                                  if (onApplyTradeOff) {
                                    onApplyTradeOff(to, insight.title);
                                    setToastMessage(`✓ Applied: ${to.label}`);
                                  }
                                }}
                              >
                                Apply
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {insight.actionLabel && (!insight.tradeOffs || insight.tradeOffs.length === 0) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          style={{ fontSize: '0.72rem', padding: '2px 8px', minHeight: '28px', marginTop: '4px' }}
                          onClick={() => {
                            if (insight.category === 'budget') onNavigateTab('budget');
                            else if (insight.category === 'timeline') onNavigateTab('timeline');
                            else if (insight.category === 'vendors') onNavigateTab('vendors');
                            else if (insight.category === 'capacity') onNavigateTab('guests');
                            else onNavigateTab('budget');
                          }}
                        >
                          {insight.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Scenario Simulation Modal */}
      {isScenarioModalOpen && (
        <Modal
          isOpen={isScenarioModalOpen}
          onClose={() => setIsScenarioModalOpen(false)}
          title="What Changed? — Stress-Test & Scenario Engine"
          size="lg"
        >
          <Suspense fallback={null}>
            <ScenarioChangePanel
              plan={plan}
              budgetSummary={budgetSummary}
              onApplyScenario={(s) => {
                if (onApplyScenario) {
                  onApplyScenario(s);
                  setToastMessage(`✓ Applied scenario: ${s.scenarioName || 'Parameters updated'}`);
                }
              }}
              onApplyTradeOff={(to, title) => {
                if (onApplyTradeOff) {
                  onApplyTradeOff(to, title);
                  setToastMessage(`✓ Applied trade-off: ${to.label}`);
                }
              }}
              onUndoLastChange={() => {
                if (onUndoLastChange) {
                  onUndoLastChange();
                  setToastMessage('✓ Rolled back last change');
                }
              }}
              onClose={() => setIsScenarioModalOpen(false)}
            />
          </Suspense>
        </Modal>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};
