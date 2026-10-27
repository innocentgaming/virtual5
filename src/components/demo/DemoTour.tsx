import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Zap,
  IndianRupee,
  ShieldAlert,
  Clock,
  Bot,
  ListChecks,
  Users,
  Store,
  Play,
  Pause,
  Undo2,
} from 'lucide-react';
import type { NavigationTab, ScenarioInput } from '../../hooks/useEventPlan';

export interface TourStep {
  id: string;
  tab: NavigationTab | 'copilot';
  targetSelector: string;
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Optional hands-on action the visitor can trigger from the card */
  action?: { label: string; doneLabel: string; scenario: ScenarioInput };
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'kpis',
    tab: 'dashboard',
    targetSelector: '#tour-hero-kpis',
    label: 'Executive Dashboard',
    title: 'Cultural Intelligence at a Glance',
    description:
      'Budgets formatted in Indian ₹ Lakhs & Crores, live RSVP counter with Jain dietary tracking, countdown, and real-time budget utilization ring.',
    icon: <IndianRupee size={18} color="var(--accent-primary)" />,
  },
  {
    id: 'budget_donut',
    tab: 'budget',
    targetSelector: '#tour-budget-donut',
    label: 'Interactive Budget',
    title: 'Interactive Donut & Category Filter',
    description:
      'Expenses categorized across venue, catering, decor and photography. Hover slices for percentage readouts and click to filter the line-item ledger below.',
    icon: <IndianRupee size={18} color="#06b6d4" />,
  },
  {
    id: 'chaos',
    tab: 'dashboard',
    targetSelector: '#tour-chaos-bar',
    label: 'The Chaos Button',
    title: 'Simulate Real-World Event Volatility',
    description:
      'Indian celebrations face unexpected quote spikes and weather disruptions. Try it: the caterer raises their price 20% and the whole plan recalculates, with quantified trade-offs and one-click undo.',
    icon: <Zap size={18} color="#f59e0b" />,
    action: {
      label: 'Run it for me',
      doneLabel: 'Applied. Watch the numbers move.',
      scenario: { vendorPriceSpikePercent: 20, scenarioName: 'Caterer Quote Escalation (+20%)' },
    },
  },
  {
    id: 'rules',
    tab: 'dashboard',
    targetSelector: '#tour-decision-engine',
    label: 'Decision Engine',
    title: 'Deterministic Rules & "Why Am I Seeing This?"',
    description:
      '12+ culturally grounded rules monitor your plan: isolated Jain kitchen counters, municipal sound NOC permits, and short-notice triage. Click "Why am I seeing this?" to view the exact data thresholds.',
    icon: <ShieldAlert size={18} color="#ec4899" />,
  },
  {
    id: 'timeline',
    tab: 'timeline',
    targetSelector: '#tour-timeline',
    label: 'Timeline & Tasks',
    title: 'A Preparation Plan That Re-Paces Itself',
    description:
      'Tasks are ordered by dependency and tied to your event date. Move the date and every deadline shifts; blocked tasks and overdue items are flagged before they become a crisis.',
    icon: <ListChecks size={18} color="#16a34a" />,
  },
  {
    id: 'guests',
    tab: 'guests',
    targetSelector: '#tour-guests',
    label: 'Guests & Diets',
    title: 'RSVPs, Jain & Pure Veg Tracking, Seating',
    description:
      'Track attendance, plus-ones and dietary needs, arrange tables visually, and send invitations over WhatsApp. Jain and Sattvic guests automatically trigger a separate-counter alert.',
    icon: <Users size={18} color="#0d9488" />,
  },
  {
    id: 'vendors',
    tab: 'vendors',
    targetSelector: '#tour-vendors',
    label: 'Vendors',
    title: 'Pandit, Mehendi, Dhol & Caterer Checklists',
    description:
      'Each vendor category comes with the interview questions to ask, so quotes are comparable and nothing important is missed before you sign.',
    icon: <Store size={18} color="#d97706" />,
  },
  {
    id: 'run_of_show',
    tab: 'schedule',
    targetSelector: '#tour-run-of-show',
    label: 'Vedic Run of Show',
    title: 'Muhurat Pheras & 10 PM Sound Curfew',
    description:
      'Coordinate Haldi, Sangeet, Baraat, and Lagna Muhurat Pheras. Downstream activities shift automatically when rituals run late, and municipal 10 PM sound curfew boundaries are enforced.',
    icon: <Clock size={18} color="#8b5cf6" />,
  },
  {
    id: 'copilot',
    tab: 'copilot',
    targetSelector: '#tour-copilot-drawer',
    label: 'AI Copilot',
    title: 'Contextual Copilot & "Pin to Plan"',
    description:
      'Ask questions with suggested prompt chips, view token-streamed advice, and tap "Pin to plan" to convert any Copilot recommendation directly into an actionable task in your timeline.',
    icon: <Bot size={18} color="var(--accent-primary)" />,
  },
];

const AUTOPLAY_MS = 8000;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
  onOpenCopilot?: () => void;
  onCloseCopilot?: () => void;
  /** Lets the tour run a what-if scenario on the visitor's behalf */
  onRunScenario?: (scenario: ScenarioInput) => void;
  onUndoScenario?: () => void;
  onTriggerChaosSample?: () => void;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export const DemoTour: React.FC<DemoTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenCopilot,
  onCloseCopilot,
  onRunScenario,
  onUndoScenario,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const total = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStepIdx] || TOUR_STEPS[0];
  const isLast = currentStepIdx === total - 1;

  // Auto-switch tabs or open copilot when stepping
  useEffect(() => {
    if (!isOpen) return;

    if (step.tab === 'copilot') {
      onOpenCopilot?.();
    } else {
      onCloseCopilot?.();
      onNavigateTab?.(step.tab);
    }

    const t = window.setTimeout(() => {
      const el = document.querySelector(step.targetSelector);
      if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [isOpen, currentStepIdx, step.tab, step.targetSelector, onNavigateTab, onOpenCopilot, onCloseCopilot]);

  // Track the highlighted element so the spotlight follows scroll, resize and re-render
  const measure = useCallback(() => {
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    const pad = 8;
    setRect((prev) => {
      const next = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
      if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height) {
        return prev;
      }
      return next;
    });
  }, [step.targetSelector]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(measure);
    const interval = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isOpen, measure, currentStepIdx]);

  const handleNext = useCallback(() => {
    if (currentStepIdx < total - 1) {
      setCurrentStepIdx((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentStepIdx, total, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStepIdx > 0) setCurrentStepIdx((i) => i - 1);
  }, [currentStepIdx]);

  // Optional auto-play (never when the visitor prefers reduced motion)
  useEffect(() => {
    if (!isOpen || !autoplay || paused || isLast || reducedMotion()) return;
    const t = window.setTimeout(() => setCurrentStepIdx((i) => Math.min(i + 1, total - 1)), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [isOpen, autoplay, paused, currentStepIdx, isLast, total]);

  // Focus management & keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Focus the next button when step changes
    const timer = setTimeout(() => {
      nextBtnRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Tab' && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const hasApplied = Boolean(applied[step.id]);
  const cardAtTop = rect ? rect.top + rect.height / 2 > window.innerHeight * 0.55 : false;
  const progressPct = ((currentStepIdx + 1) / total) * 100;

  const runAction = () => {
    if (!step.action || !onRunScenario) return;
    setAutoplay(false);
    onRunScenario(step.action.scenario);
    setApplied((prev) => ({ ...prev, [step.id]: true }));
  };

  const undoAction = () => {
    onUndoScenario?.();
    setApplied((prev) => ({ ...prev, [step.id]: false }));
  };

  return (
    <div
      className="tour-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided Tour, step ${currentStepIdx + 1} of ${total}: ${step.title}`}
    >
      {rect ? (
        <div
          className="tour-spotlight"
          aria-hidden="true"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}

      <div
        ref={cardRef}
        className={`tour-card tour-card--${cardAtTop ? 'top' : 'bottom'}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="tour-card__progress" aria-hidden="true">
          <span style={{ width: `${progressPct}%` }} />
        </div>

        <div className="tour-card__top">
          <div className="tour-card__badge">
            <span className="tour-card__icon">{step.icon}</span>
            <span>{`${currentStepIdx + 1} of ${total} · ${step.label}`}</span>
          </div>
          <button type="button" className="tour-card__x" onClick={onClose} aria-label="Skip guided tour">
            <X size={18} />
          </button>
        </div>

        <h3 className="tour-card__title">{step.title}</h3>
        <p className="tour-card__text">{step.description}</p>

        {step.action && onRunScenario && (
          <div className="tour-card__action">
            {hasApplied ? (
              <>
                <span className="tour-card__done" role="status">
                  <CheckCircle2 size={15} /> {step.action.doneLabel}
                </span>
                {onUndoScenario && (
                  <button type="button" className="tour-btn tour-btn--ghost" onClick={undoAction}>
                    <Undo2 size={14} /> Undo
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="tour-btn tour-btn--accent" onClick={runAction}>
                <Zap size={14} /> {step.action.label}
              </button>
            )}
          </div>
        )}

        <div className="tour-card__nav">
          <div className="tour-card__dots" role="group" aria-label="Jump to step">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`tour-dot ${i === currentStepIdx ? 'is-on' : ''} ${i < currentStepIdx ? 'is-done' : ''}`}
                aria-label={`Go to step ${i + 1}: ${s.label}`}
                aria-current={i === currentStepIdx ? 'step' : undefined}
                onClick={() => setCurrentStepIdx(i)}
              />
            ))}
          </div>

          <div className="tour-card__buttons">
            {!reducedMotion() && !isLast && (
              <button
                type="button"
                className="tour-btn tour-btn--text"
                onClick={() => setAutoplay((a) => !a)}
                aria-pressed={autoplay}
                title="Advance automatically every few seconds"
              >
                {autoplay ? <Pause size={13} /> : <Play size={13} />}
                {autoplay ? 'Pause' : 'Auto-play'}
              </button>
            )}
            <button type="button" className="tour-btn tour-btn--text" onClick={onClose}>
              Skip tour
            </button>
            {currentStepIdx > 0 && (
              <button type="button" className="tour-btn tour-btn--ghost" onClick={handlePrev}>
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button ref={nextBtnRef} type="button" className="tour-btn tour-btn--primary" onClick={handleNext}>
              {isLast ? (
                <>
                  <span>Finish Tour</span>
                  <CheckCircle2 size={15} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
