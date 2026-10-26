import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import type { NavigationTab } from '../../hooks/useEventPlan';

export interface TourStep {
  id: string;
  tab: NavigationTab | 'copilot';
  targetSelector: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'kpis',
    tab: 'dashboard',
    targetSelector: '#tour-hero-kpis',
    badge: '1 of 6 · Executive Dashboard',
    title: 'Cultural Intelligence at a Glance',
    description:
      'Budgets formatted in Indian ₹ Lakhs & Crores, live RSVP counter with Jain dietary tracking, countdown, and real-time budget utilization ring.',
    icon: <IndianRupee size={18} color="var(--accent-primary)" />,
  },
  {
    id: 'budget_donut',
    tab: 'budget',
    targetSelector: '#tour-budget-donut',
    badge: '2 of 6 · Interactive Budget',
    title: 'Interactive Donut & Category Filter',
    description:
      'Expenses categorized across venue, catering, decor and photography. Hover slices for percentage readouts and click to filter the line-item ledger below.',
    icon: <IndianRupee size={18} color="#06b6d4" />,
  },
  {
    id: 'chaos',
    tab: 'dashboard',
    targetSelector: '#tour-chaos-bar',
    badge: '3 of 6 · The Chaos Button',
    title: 'Simulate Real-World Event Volatility',
    description:
      'Indian celebrations face unexpected quote spikes and weather disruptions. Click "Simulate: Caterer raises price 20%" to trigger immediate budget recalculation and quantified trade-offs.',
    icon: <Zap size={18} color="#f59e0b" />,
  },
  {
    id: 'rules',
    tab: 'dashboard',
    targetSelector: '#tour-decision-engine',
    badge: '4 of 6 · Decision Engine',
    title: 'Deterministic Rules & "Why Am I Seeing This?"',
    description:
      '12+ culturally grounded rules monitor your plan: isolated Jain kitchen counters, municipal sound NOC permits, and short-notice triage. Click "Why am I seeing this?" to view the exact data thresholds.',
    icon: <ShieldAlert size={18} color="#ec4899" />,
  },
  {
    id: 'run_of_show',
    tab: 'schedule',
    targetSelector: '#tour-run-of-show',
    badge: '5 of 6 · Vedic Run of Show',
    title: 'Muhurat Pheras & 10 PM Sound Curfew',
    description:
      'Coordinate Haldi, Sangeet, Baraat, and Lagna Muhurat Pheras. Downstream activities shift automatically when rituals run late, and municipal 10 PM sound curfew boundaries are enforced.',
    icon: <Clock size={18} color="#8b5cf6" />,
  },
  {
    id: 'copilot',
    tab: 'copilot',
    targetSelector: '#tour-copilot-drawer',
    badge: '6 of 6 · AI Copilot',
    title: 'Contextual Copilot & "Pin to Plan"',
    description:
      'Ask questions with suggested prompt chips, view token-streamed advice, and tap "Pin to plan" to convert any Copilot recommendation directly into an actionable task in your timeline.',
    icon: <Bot size={18} color="var(--accent-primary)" />,
  },
];

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenCopilot: () => void;
  onCloseCopilot?: () => void;
  onTriggerChaosSample?: () => void;
}

export const DemoTour: React.FC<DemoTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenCopilot,
  onCloseCopilot,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const step = TOUR_STEPS[currentStepIdx] || TOUR_STEPS[0];

  // Auto-switch tabs or open copilot when stepping
  useEffect(() => {
    if (!isOpen) return;

    if (step.tab === 'copilot') {
      onOpenCopilot?.();
    } else {
      onCloseCopilot?.();
      onNavigateTab?.(step.tab);
    }

    // Scroll target into view smoothly if present
    setTimeout(() => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [isOpen, currentStepIdx, step.tab, step.targetSelector, onNavigateTab, onOpenCopilot, onCloseCopilot]);

  const handleNext = useCallback(() => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentStepIdx, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((i) => i - 1);
    }
  }, [currentStepIdx]);

  // Focus management & keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    nextBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Tab' && cardRef.current) {
        // Focus trap inside tour card
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const isLast = currentStepIdx === TOUR_STEPS.length - 1;

  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided Tour: ${step.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '1.25rem',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={cardRef}
        className="tour-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--surface-raised, #ffffff)',
          color: 'var(--text, #1e293b)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1.5px solid var(--accent-primary, #b45309)',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
          padding: '1.25rem 1.5rem',
          position: 'relative',
          animation: 'tourSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'var(--surface-subtle, #f1f5f9)',
              }}
            >
              {step.icon}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--accent-primary, #b45309)',
              }}
            >
              {step.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Skip guided tour"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Content */}
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            margin: '0 0 0.5rem 0',
            fontFamily: 'var(--font-display, inherit)',
            color: 'var(--text, #0f172a)',
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h3>

        <p
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: 'var(--text-muted, #475569)',
            margin: '0 0 1.25rem 0',
          }}
        >
          {step.description}
        </p>

        {/* Navigation & Progress Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
            paddingTop: '0.85rem',
          }}
        >
          {/* Progress Dots */}
          <div
            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            aria-hidden="true"
          >
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === currentStepIdx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background:
                    i === currentStepIdx
                      ? 'var(--accent-primary, #b45309)'
                      : 'var(--border, #cbd5e1)',
                  transition: 'all 200ms ease',
                }}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.35rem 0.65rem',
              }}
            >
              Skip tour
            </button>

            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #cbd5e1)',
                  background: 'var(--surface-subtle, #f8fafc)',
                  color: 'var(--text, #1e293b)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}

            <button
              ref={nextBtnRef}
              type="button"
              onClick={handleNext}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent-primary, #b45309)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)',
              }}
            >
              {isLast ? (
                <>
                  <span>Finish Tour</span>
                  <CheckCircle2 size={15} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
