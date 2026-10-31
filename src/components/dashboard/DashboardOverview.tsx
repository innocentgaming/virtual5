import React, { useMemo, useState, Suspense } from 'react';
import {
  Calendar,
  CalendarPlus,
  MapPin,
  Users,
  UserPlus,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PartyPopper,
  Heart,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  HelpCircle,
  Store,
  Wallet,
} from 'lucide-react';
import type {
  EventPlan,
  BudgetSummary,
  BudgetCategory,
  DecisionInsight,
  TradeOffOption,
  PlanChangeDiff,
} from '../../types/event';
import type { NavigationTab, ScenarioInput } from '../../hooks/useEventPlan';
import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency, formatIndianShort, formatPercent } from '../../utils/formatters';
import { Button, Badge, Skeleton, Toast, Modal, type BadgeVariant } from '../ui';
import { lazyWithPreload } from '../../utils/lazyWithPreload';
import { TOTAL_DECISION_RULES_COUNT } from '../../services/decisionEngine';
import { ChaosBar } from '../demo/ChaosBar';
import '../../dashboard.css';

const ScenarioChangePanel = lazyWithPreload(() =>
  import('../scenarios/ScenarioChangePanel').then((m) => ({ default: m.ScenarioChangePanel }))
);

interface TimelineAudit {
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  overdueCount: number;
  upcomingCount?: number;
  criticalUpcoming?: string[];
}

interface DashboardOverviewProps {
  plan: EventPlan;
  budgetSummary: BudgetSummary;
  timelineAudit: TimelineAudit;
  decisionInsights?: DecisionInsight[];
  onNavigateTab: (tab: NavigationTab) => void;
  onToggleTask: (taskId: string) => void;
  onRegenerateIdeas?: () => void;
  onApplyScenario?: (scenario: ScenarioInput) => void;
  onOpenCopilot?: () => void;
  onApplyTradeOff?: (tradeOff: TradeOffOption, ruleTitle?: string) => void;
  lastChangeDiff?: PlanChangeDiff | null;
  onUndoLastChange?: () => void;
  onClearDiff?: () => void;
  onExportCalendar?: () => void;
  isPulsing?: boolean;
  isGenerating?: boolean;
}

const MS_PER_DAY = 86_400_000;

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  decor: 'Decor',
  photography: 'Photography',
  entertainment: 'Entertainment',
  logistics: 'Logistics',
  invitations: 'Invitations',
  contingency: 'Contingency',
  other: 'Other',
};

/** Parses a YYYY-MM-DD string as a local calendar date (avoids UTC off-by-one). */
function parseLocalDate(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today (local) to the given date. Negative when in the past. */
function daysFromToday(value: string): number | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  return Math.round((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);
}

function describeDue(diff: number | null, raw: string): string {
  if (diff === null) return `Due: ${raw}`;
  if (diff < -1) return `${Math.abs(diff)} days overdue`;
  if (diff === -1) return '1 day overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

interface PanelHeadProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
}

const PanelHead: React.FC<PanelHeadProps> = ({ title, subtitle, aside }) => (
  <div className="dash-panel__head">
    <div>
      <h3 className="dash-panel__title">{title}</h3>
      {subtitle && <p className="dash-panel__sub">{subtitle}</p>}
    </div>
    {aside && <div className="dash-panel__aside">{aside}</div>}
  </div>
);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  plan,
  budgetSummary,
  timelineAudit,
  decisionInsights = [],
  onNavigateTab,
  onToggleTask,
  onApplyScenario,
  onOpenCopilot,
  onApplyTradeOff,
  lastChangeDiff,
  onUndoLastChange,
  onClearDiff,
  onExportCalendar,
  isPulsing,
  isGenerating,
}) => {
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Countdown in whole local days (negative once the event has passed)
  const diffDays = useMemo(() => daysFromToday(plan.eventDate) ?? 0, [plan.eventDate]);

  // Vendor calculations
  const bookedVendors = useMemo(
    () => plan.vendors.filter((v) => v.status === 'booked' || v.status === 'completed').length,
    [plan.vendors]
  );
  const totalVendors = plan.vendors.length;

  // Guest calculations
  const confirmedGuests = useMemo(() => {
    const guests = plan.guests || [];
    return guests
      .filter((g) => g.rsvpStatus === 'attending')
      .reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
  }, [plan.guests]);

  // Per-guest budget calculation
  const perGuestCost = useMemo(() => {
    if (budgetSummary.perGuestCost && budgetSummary.perGuestCost > 0) {
      return budgetSummary.perGuestCost;
    }
    return plan.guestCount > 0 ? Math.round(budgetSummary.totalBudget / plan.guestCount) : 0;
  }, [budgetSummary.perGuestCost, budgetSummary.totalBudget, plan.guestCount]);

  // Animated Count-Up figures (skips under reduced motion or tests)
  const animatedDiffDays = useCountUp(Math.abs(diffDays));
  const animatedCompleted = useCountUp(timelineAudit.completedCount);
  const animatedBookedVendors = useCountUp(bookedVendors);
  const animatedConfirmedGuests = useCountUp(confirmedGuests);

  // Utilization calculation
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
    return 'var(--color-success)';
  }, [utilizationPercent]);

  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(utilizationPercent, 100) / 100);

  // Progress ratios for the KPI meters (0-100)
  const clampPct = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);
  const taskPct = clampPct(timelineAudit.progressPercentage);
  const vendorPct = clampPct(totalVendors > 0 ? (bookedVendors / totalVendors) * 100 : 0);
  const rsvpPct = clampPct((confirmedGuests / Math.max(plan.guestCount, 1)) * 100);

  // Budget split by category (largest first, zero-value categories hidden)
  const categoryBreakdown = useMemo(() => {
    const entries = (Object.entries(budgetSummary.categoryTotals || {}) as [BudgetCategory, number][])
      .filter(([, amount]) => typeof amount === 'number' && amount > 0)
      .sort((a, b) => b[1] - a[1]);
    const sum = entries.reduce((acc, [, amount]) => acc + amount, 0);
    return {
      sum,
      rows: entries.slice(0, 6).map(([category, amount]) => ({
        category,
        amount,
        share: sum > 0 ? (amount / sum) * 100 : 0,
      })),
    };
  }, [budgetSummary.categoryTotals]);

  // Decision engine insights sorted by severity
  const sortedInsights = useMemo(() => {
    const raw = (decisionInsights && decisionInsights.length > 0) ? decisionInsights : (plan.decisionInsights || []);
    const severityScore: Record<string, number> = {
      action_required: 3,
      warning: 2,
      suggestion: 1,
      positive: 0,
    };
    return [...raw].sort((a, b) => {
      const scoreDiff = (severityScore[b.type] ?? 0) - (severityScore[a.type] ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.tradeOffs?.length || 0) - (a.tradeOffs?.length || 0);
    });
  }, [decisionInsights, plan.decisionInsights]);

  const displayedInsights = showAllAlerts ? sortedInsights : sortedInsights.slice(0, 3);

  // Next up tasks (overdue first, then soonest due)
  const nextUpTasks = useMemo(() => {
    return plan.tasks
      .filter((t) => !t.completed)
      .map((task) => ({ task, diff: daysFromToday(task.dueDate) }))
      .sort((a, b) => {
        const overdueA = a.diff !== null && a.diff < 0;
        const overdueB = b.diff !== null && b.diff < 0;
        if (overdueA && !overdueB) return -1;
        if (!overdueA && overdueB) return 1;
        return a.task.dueDate.localeCompare(b.task.dueDate);
      })
      .slice(0, 4);
  }, [plan.tasks]);

  const handleTaskCheck = (taskId: string, title: string, isCurrentlyDone: boolean) => {
    onToggleTask(taskId);
    setToastMessage(!isCurrentlyDone ? `✓ Completed: ${title}` : `Marked incomplete: ${title}`);
  };

  const getInsightIcon = (type: DecisionInsight['type']) => {
    switch (type) {
      case 'action_required':
        return <AlertCircle size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'suggestion':
        return <TrendingUp size={18} />;
      default:
        return <CheckCircle2 size={18} />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'wedding':
        return <Heart size={14} />;
      case 'birthday':
        return <PartyPopper size={14} />;
      default:
        return <Users size={14} />;
    }
  };

  const getBadgeVariant = (type: string): BadgeVariant => {
    switch (type) {
      case 'wedding':
        return 'danger';
      case 'birthday':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (isGenerating) {
    return (
      <div className="dash" aria-busy="true" aria-label="Loading event dashboard">
        <div className="dash-skeleton-hero">
          <Skeleton shape="block" height={200} />
        </div>
        <div className="dash-skeleton-kpis">
          <Skeleton shape="block" height={120} />
          <Skeleton shape="block" height={120} />
          <Skeleton shape="block" height={120} />
          <Skeleton shape="block" height={120} />
        </div>
        <div className="dash__main">
          <Skeleton shape="block" height={280} />
        </div>
        <div className="dash__side">
          <Skeleton shape="block" height={280} />
        </div>
      </div>
    );
  }

  const countdownLabel =
    diffDays === 0
      ? 'Event Day 🎉'
      : diffDays < 0
      ? Math.abs(diffDays) === 1
        ? 'Day since event'
        : 'Days since event'
      : diffDays === 1
      ? 'Day to go'
      : 'Days to go';

  const eventDateLabel = parseLocalDate(plan.eventDate)?.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const remaining = budgetSummary.remainingBalance;
  const isOver = remaining < 0;

  return (
    <div className="dash">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* =========================================================================
          1. HERO — event identity, countdown, budget seal
          ========================================================================= */}
      <section
        id="tour-hero-kpis"
        className={`dash-hero ${isPulsing ? 'dashboard-pulse-highlight' : ''}`}
        aria-labelledby="dash-event-title"
      >
        <div>
          <div className="dash-hero__eyebrow">
            <Badge variant={getBadgeVariant(plan.eventType)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {getEventTypeIcon(plan.eventType)}
                <span>{plan.eventType.toUpperCase()}</span>
              </span>
            </Badge>
            <span className="dash-hero__theme">Theme: {plan.theme}</span>
            {plan.culturalTraditions && (
              <Badge variant="success" dot>
                Traditions Configured
              </Badge>
            )}
          </div>

          <h2 id="dash-event-title" className="dash-hero__title">
            {plan.title}
          </h2>

          <ul className="dash-meta">
            <li>
              <MapPin size={16} aria-hidden="true" />
              <span>{plan.venueName ? `${plan.venueName}, ${plan.city}` : plan.city}</span>
            </li>
            <li>
              <Calendar size={16} aria-hidden="true" />
              <span>{eventDateLabel || plan.eventDate}</span>
            </li>
            <li>
              <Users size={16} aria-hidden="true" />
              <span className="tabular-nums">{plan.guestCount} guests invited</span>
            </li>
          </ul>

          <div className="dash-progress">
            <div className="dash-progress__row">
              <span>Preparation progress</span>
              <strong className="tabular-nums">{formatPercent(taskPct)}</strong>
            </div>
            <div
              className="dash-track"
              role="progressbar"
              aria-label="Preparation progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(taskPct)}
            >
              <span className="dash-track__fill" style={{ '--pct': `${taskPct}%` } as React.CSSProperties} />
            </div>
          </div>
        </div>

        <div className="dash-hero__aside">
          <div className="dash-seal dash-seal--countdown">
            <span
              className={`dash-countdown__num tabular-nums ${diffDays >= 0 && diffDays <= 7 ? 'dash-countdown__num--soon' : ''}`}
            >
              {animatedDiffDays}
            </span>
            <span className="dash-eyebrow">{countdownLabel}</span>
          </div>

          <div className="dash-seal">
            <div className="dash-ring">
              <svg width="88" height="88" viewBox="0 0 84 84" aria-hidden="true">
                <circle cx="42" cy="42" r={ringRadius} fill="transparent" stroke="var(--border)" strokeWidth="6" />
                <circle
                  className="budget-ring-circle"
                  cx="42"
                  cy="42"
                  r={ringRadius}
                  fill="transparent"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 42 42)"
                />
              </svg>
              <div className="dash-ring__label">
                <span className="dash-ring__pct tabular-nums" style={{ color: ringColor }}>
                  {utilizationPercent}%
                </span>
                <span className="dash-ring__used">used</span>
              </div>
            </div>

            <div className="dash-seal__figures">
              <span className="dash-eyebrow">Budget Utilization</span>
              <span className="dash-seal__amount tabular-nums">
                {formatIndianShort(budgetSummary.totalEstimated)} <span>of</span>{' '}
                {formatIndianShort(budgetSummary.totalBudget)}
              </span>
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
      </section>

      {/* =========================================================================
          WHAT CHANGED? REAL-TIME PARAMETER & DECISION DIFF BANNER
          ========================================================================= */}
      {lastChangeDiff && (
        <aside
          role="status"
          aria-live="polite"
          id="what-changed-diff-banner"
          className="dash-banner what-changed-banner"
        >
          <div className="dash-banner__row">
            <div className="dash-banner__lead">
              <span className="dash-chip" aria-hidden="true">
                <Sparkles size={14} />
              </span>
              <strong>What changed?</strong>
              <span>
                ({lastChangeDiff.timestamp}) — {lastChangeDiff.summary}
              </span>
            </div>

            <div className="dash-panel__aside">
              {onUndoLastChange && plan.changeLog && plan.changeLog.length > 0 && (
                <button type="button" className="dash-link-btn" onClick={onUndoLastChange}>
                  Undo edit
                </button>
              )}
              {onClearDiff && (
                <button
                  type="button"
                  className="dash-icon-btn"
                  onClick={onClearDiff}
                  aria-label="Dismiss what changed diff"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {lastChangeDiff.details.length > 1 && (
            <div className="dash-tags">
              {lastChangeDiff.details.map((detail, idx) => (
                <span key={idx} className="dash-tag">
                  {detail}
                </span>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* =========================================================================
          2. CHAOS & SCENARIO HUB BAR (1-click simulations & instant trade-offs)
          ========================================================================= */}
      <div>
        <ChaosBar
          plan={plan}
          budgetSummary={budgetSummary}
          onApplyScenario={(s) => {
            if (onApplyScenario) onApplyScenario(s);
            setToastMessage(`Simulated scenario: ${s.scenarioName}`);
          }}
          onApplyTradeOff={(to, ruleTitle) => {
            if (onApplyTradeOff) {
              onApplyTradeOff(to, ruleTitle || '');
              setToastMessage(`✓ Applied: ${to.label}`);
            }
          }}
          onUndoLastChange={() => {
            if (onUndoLastChange) {
              onUndoLastChange();
              setToastMessage('✓ Rolled back last change');
            }
          }}
          onOpenFullModal={() => setIsScenarioModalOpen(true)}
        />
      </div>

      {/* =========================================================================
          3. KPI STRIP — four connected, clickable metrics
          ========================================================================= */}
      <div className="dash-kpis">
        <button type="button" className="dash-kpi" onClick={() => onNavigateTab('budget')}>
          <span className="dash-kpi__head">
            <IndianRupee size={14} aria-hidden="true" />
            <span>Per-Guest Cost</span>
          </span>
          <span className="dash-kpi__value tabular-nums">{formatCurrency(perGuestCost)}</span>
          <span className="dash-kpi__sub">
            <span>Total Budget: </span>
            <strong className="tabular-nums">{formatIndianShort(budgetSummary.totalBudget)}</strong>
          </span>
          <span className="dash-track" aria-hidden="true">
            <span
              className="dash-track__fill"
              style={{ '--pct': `${clampPct(utilizationPercent)}%` } as React.CSSProperties}
            />
          </span>
          <ArrowUpRight className="dash-kpi__go" size={16} aria-hidden="true" />
          <span className="sr-only">Go to budget</span>
        </button>

        <button type="button" className="dash-kpi" onClick={() => onNavigateTab('timeline')}>
          <span className="dash-kpi__head">
            <Clock size={14} aria-hidden="true" />
            <span>Tasks Done</span>
          </span>
          <span className="dash-kpi__value tabular-nums">
            {animatedCompleted} <small>/ {timelineAudit.totalCount}</small>
          </span>
          <span className="dash-kpi__sub">
            <span>Task Completion: </span>
            <strong className="tabular-nums">{formatPercent(timelineAudit.progressPercentage)}</strong>
          </span>
          <span className="dash-track" aria-hidden="true">
            <span className="dash-track__fill" style={{ '--pct': `${taskPct}%` } as React.CSSProperties} />
          </span>
          <ArrowUpRight className="dash-kpi__go" size={16} aria-hidden="true" />
          <span className="sr-only">Go to timeline</span>
        </button>

        <button type="button" className="dash-kpi" onClick={() => onNavigateTab('vendors')}>
          <span className="dash-kpi__head">
            <Store size={14} aria-hidden="true" />
            <span>Vendors Booked</span>
          </span>
          <span className="dash-kpi__value tabular-nums">
            {animatedBookedVendors} <small>/ {totalVendors}</small>
          </span>
          <span className="dash-kpi__sub">
            <span>Estimated Spend: </span>
            <strong className="tabular-nums">{formatIndianShort(budgetSummary.totalEstimated)}</strong>
          </span>
          <span className="dash-track" aria-hidden="true">
            <span className="dash-track__fill" style={{ '--pct': `${vendorPct}%` } as React.CSSProperties} />
          </span>
          <ArrowUpRight className="dash-kpi__go" size={16} aria-hidden="true" />
          <span className="sr-only">Go to vendors</span>
        </button>

        <button type="button" className="dash-kpi" onClick={() => onNavigateTab('guests')}>
          <span className="dash-kpi__head">
            <Users size={14} aria-hidden="true" />
            <span>RSVPs Confirmed</span>
          </span>
          <span className="dash-kpi__value tabular-nums">
            {animatedConfirmedGuests} <small>/ {plan.guestCount}</small>
          </span>
          <span className="dash-kpi__sub">
            <span>Attendance Rate: </span>
            <strong className="tabular-nums">
              {formatPercent((confirmedGuests / Math.max(plan.guestCount, 1)) * 100)}
            </strong>
          </span>
          <span className="dash-track" aria-hidden="true">
            <span className="dash-track__fill" style={{ '--pct': `${rsvpPct}%` } as React.CSSProperties} />
          </span>
          <ArrowUpRight className="dash-kpi__go" size={16} aria-hidden="true" />
          <span className="sr-only">Go to guests</span>
        </button>
      </div>

      {/* =========================================================================
          4. MAIN COLUMN: Next Up, Quick Actions
          ========================================================================= */}
      <div className="dash__main">
        <section className="dash-panel" aria-label="Next up">
          <PanelHead
            title="Next Up"
            subtitle="Prioritized upcoming milestones & overdue tasks"
            aside={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('timeline')}
                rightIcon={<ArrowRight size={14} />}
              >
                Open timeline
              </Button>
            }
          />

          {nextUpTasks.length === 0 ? (
            <div className="dash-empty" role="status">
              <strong>All tasks completed 🎉</strong>
              <p>You have completed every scheduled preparation task for this event.</p>
            </div>
          ) : (
            <ul className="dash-list">
              {nextUpTasks.map(({ task, diff }) => {
                const isOverdue = diff !== null && diff < 0;
                return (
                  <li key={task.id} className={`dash-task ${isOverdue ? 'dash-task--overdue' : ''}`}>
                    <input
                      type="checkbox"
                      className="dash-check"
                      checked={task.completed}
                      onChange={() => handleTaskCheck(task.id, task.title, task.completed)}
                      aria-label={`Mark "${task.title}" complete`}
                    />
                    <div className="dash-task__body">
                      <div className="dash-task__title">{task.title}</div>
                      <div className="dash-task__meta">
                        {describeDue(diff, task.dueDate)}
                        {parseLocalDate(task.dueDate) && (
                          <>
                            {' · '}
                            {parseLocalDate(task.dueDate)!.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </>
                        )}
                      </div>
                    </div>
                    {isOverdue ? (
                      <Badge variant="danger">Overdue</Badge>
                    ) : (
                      <Badge variant="neutral" className="dash-task__cat">
                        {String(task.category).replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-panel" aria-label="Quick planner actions">
          <PanelHead
            title="Quick Planner Actions"
            subtitle="Frequently accessed workflows & on-ground exports"
          />
          <div className="dash-actions">
            <button type="button" className="dash-action" onClick={() => onNavigateTab('budget')}>
              <span className="dash-chip" aria-hidden="true">
                <IndianRupee size={15} />
              </span>
              <span className="dash-action__label">
                Add Expense
                <span className="dash-action__hint">Log a cost or quote</span>
              </span>
            </button>
            <button type="button" className="dash-action" onClick={() => onNavigateTab('guests')}>
              <span className="dash-chip" aria-hidden="true">
                <UserPlus size={15} />
              </span>
              <span className="dash-action__label">
                Add Guest
                <span className="dash-action__hint">Grow the guest list</span>
              </span>
            </button>
            <button type="button" className="dash-action" onClick={() => onNavigateTab('guests')}>
              <span className="dash-chip" aria-hidden="true">
                <MessageCircle size={15} color="#25d366" />
              </span>
              <span className="dash-action__label">
                WhatsApp Invites
                <span className="dash-action__hint">Send invitations</span>
              </span>
            </button>
            {onExportCalendar && (
              <button type="button" className="dash-action" onClick={onExportCalendar}>
                <span className="dash-chip" aria-hidden="true">
                  <CalendarPlus size={15} />
                </span>
                <span className="dash-action__label">
                  Export iCal
                  <span className="dash-action__hint">Timeline reminders</span>
                </span>
              </button>
            )}
            {onOpenCopilot && (
              <button type="button" className="dash-action dash-action--primary" onClick={onOpenCopilot}>
                <span className="dash-chip" aria-hidden="true">
                  <Sparkles size={15} />
                </span>
                <span className="dash-action__label">
                  Ask Copilot
                  <span className="dash-action__hint">Plan with AI</span>
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* =========================================================================
          5. SIDE COLUMN: Needs Attention, Budget at a glance
          ========================================================================= */}
      <div className="dash__side">
        <section id="tour-decision-engine" className="dash-panel" aria-label="Needs attention">
          <PanelHead
            title="Needs Attention"
            subtitle={`${sortedInsights.length} active alerts • Rules fired: ${sortedInsights.length} / ${TOTAL_DECISION_RULES_COUNT}`}
            aside={
              <>
                <Badge
                  variant="neutral"
                  size="sm"
                  title={`${sortedInsights.length} out of ${TOTAL_DECISION_RULES_COUNT} deterministic rules triggered`}
                >
                  {sortedInsights.length}/{TOTAL_DECISION_RULES_COUNT} Fired
                </Badge>
                {sortedInsights.length > 3 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllAlerts((prev) => !prev)}>
                    {showAllAlerts ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Less <ChevronUp size={14} />
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        All ({sortedInsights.length}) <ChevronDown size={14} />
                      </span>
                    )}
                  </Button>
                )}
              </>
            }
          />

          {sortedInsights.length === 0 ? (
            <div className="dash-empty" role="status">
              <strong>All clear 🎉</strong>
              <p>Your event preparation is running on schedule with zero high-priority conflicts.</p>
            </div>
          ) : (
            <div className="dash-list">
              {displayedInsights.map((insight) => (
                <article key={insight.id} className={`dash-insight dash-insight--${insight.type}`}>
                  <span className="dash-insight__icon" aria-hidden="true">
                    {getInsightIcon(insight.type)}
                  </span>
                  <div>
                    <h4 className="dash-insight__title">{insight.title}</h4>
                    <p className="dash-insight__msg">{insight.message}</p>

                    {/* Explainability accordion: Why am I seeing this? */}
                    <button
                      type="button"
                      className="dash-why"
                      onClick={() => toggleWhy(insight.id)}
                      aria-expanded={Boolean(expandedWhy[insight.id])}
                      aria-label={`Explain reason for ${insight.title}`}
                    >
                      <HelpCircle size={13} aria-hidden="true" />
                      <span>Why am I seeing this?</span>
                      {expandedWhy[insight.id] ? (
                        <ChevronUp size={12} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={12} aria-hidden="true" />
                      )}
                    </button>

                    {expandedWhy[insight.id] && (
                      <div className="dash-why__box">
                        <div className="dash-why__rule">
                          Rule: {insight.ruleName || insight.ruleId || 'Deterministic Engine Rule'}
                        </div>
                        {insight.whyExplanation && <div>{insight.whyExplanation}</div>}
                        {insight.thresholdMet && (
                          <div className="dash-why__trigger">Trigger: {insight.thresholdMet}</div>
                        )}
                      </div>
                    )}

                    {/* 1-click actionable trade-offs */}
                    {insight.tradeOffs && insight.tradeOffs.length > 0 && (
                      <div className="dash-tradeoffs">
                        <div className="dash-tradeoffs__label">Trade-offs (1-Click Apply):</div>
                        {insight.tradeOffs.map((to) => (
                          <div key={to.id} className="dash-tradeoff">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="dash-tradeoff__name">{to.label}</div>
                              <div className="dash-tradeoff__impact">{to.impactFormatted}</div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
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
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (insight.category === 'budget') onNavigateTab('budget');
                            else if (insight.category === 'timeline') onNavigateTab('timeline');
                            else if (insight.category === 'vendors') onNavigateTab('vendors');
                            else onNavigateTab('guests');
                          }}
                        >
                          {insight.actionLabel}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dash-panel" aria-label="Budget at a glance">
          <PanelHead
            title="Budget at a Glance"
            subtitle="Where the money is planned to go"
            aside={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('budget')}
                rightIcon={<ArrowRight size={14} />}
              >
                Open budget
              </Button>
            }
          />

          {categoryBreakdown.rows.length === 0 ? (
            <div className="dash-empty" role="status">
              <Wallet size={28} aria-hidden="true" />
              <strong>No expenses planned yet</strong>
              <p>Add your first expense and the category split will appear here.</p>
            </div>
          ) : (
            <ul className="dash-cats">
              {categoryBreakdown.rows.map((row, idx) => (
                <li
                  key={row.category}
                  className="dash-cat"
                  style={{ '--c': `var(--dash-c${idx + 1})` } as React.CSSProperties}
                >
                  <div className="dash-cat__row">
                    <span className="dash-cat__name">
                      <span className="dash-cat__dot" aria-hidden="true" />
                      {CATEGORY_LABELS[row.category] || row.category}
                    </span>
                    <span className="dash-cat__amt tabular-nums">
                      <strong>{formatIndianShort(row.amount)}</strong> · {formatPercent(row.share)}
                    </span>
                  </div>
                  <div className="dash-track" aria-hidden="true">
                    <span
                      className="dash-track__fill"
                      style={{ '--pct': `${clampPct(row.share)}%` } as React.CSSProperties}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="dash-ledger">
            <div>
              <dt>{isOver ? 'Over budget by' : 'Remaining balance'}</dt>
              <dd className={`tabular-nums ${isOver ? 'is-over' : ''}`}>
                {formatIndianShort(Math.abs(remaining))}
              </dd>
            </div>
            <div>
              <dt>Contingency buffer</dt>
              <dd className="tabular-nums">{formatIndianShort(budgetSummary.contingencyAmount)}</dd>
            </div>
          </dl>
        </section>
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
              onApplyScenario={(s: ScenarioInput) => {
                if (onApplyScenario) {
                  onApplyScenario(s);
                  setToastMessage(`✓ Applied scenario: ${s.scenarioName || 'Parameters updated'}`);
                }
              }}
              onApplyTradeOff={(to: TradeOffOption, title?: string) => {
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
    </div>
  );
};
