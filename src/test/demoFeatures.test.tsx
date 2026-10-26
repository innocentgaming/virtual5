import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaSwitcher } from '../components/demo/PersonaSwitcher';
import { ChaosBar } from '../components/demo/ChaosBar';
import { DemoTour } from '../components/demo/DemoTour';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { AICopilotDrawer } from '../components/copilot/AICopilotDrawer';
import { evaluateDecisionRules, TOTAL_DECISION_RULES_COUNT } from '../services/decisionEngine';
import { SAMPLE_WEDDING, SAMPLE_BIRTHDAY } from '../data/sampleEvents';
import type { BudgetSummary } from '../types/event';

describe('Investor & Evaluator Demo Features Suite', () => {
  const mockBudgetSummary: BudgetSummary = {
    totalBudget: 3500000,
    totalEstimated: 3100000,
    remainingBalance: 400000,
    utilizationPercentage: 88,
    isOverBudget: false,
    contingencyAmount: 420000,
    categoryTotals: {
      venue: 800800,
      catering: 1293600,
      decor: 123200,
      photography: 554400,
      entertainment: 154000,
      logistics: 154000,
      invitations: 0,
      contingency: 420000,
      other: 0,
    },
    perGuestCost: 8857,
    totalActual: 3100000,
    variance: 0,
    isActualOverBudget: false,
  };

  const mockTimelineAudit = {
    overdueCount: 1,
    upcomingCount: 5,
    completedCount: 4,
    totalCount: 10,
    progressPercentage: 40,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* =========================================================================
     1. PERSONA SWITCHER TESTS
     ========================================================================= */
  describe('PersonaSwitcher', () => {
    it('renders the 3 flagship celebrations with city and budget in ₹ Lakhs', () => {
      const handleSelect = vi.fn();
      render(
        <PersonaSwitcher
          activeEventId={SAMPLE_WEDDING.id}
          onSelectPersona={handleSelect}
        />
      );

      // Verify all 3 options are rendered
      expect(screen.getByText('Aarav & Ananya')).toBeInTheDocument();
      expect(screen.getByText(/Jaipur/i)).toBeInTheDocument();
      expect(screen.getByText("Rohan's 30th")).toBeInTheDocument();
      expect(screen.getByText(/Mumbai/i)).toBeInTheDocument();
      expect(screen.getByText('Diwali & Dandiya Mela')).toBeInTheDocument();
      expect(screen.getByText(/Bengaluru/i)).toBeInTheDocument();

      // Verify budget badges in Lakhs
      expect(screen.getByText(/₹35L/i)).toBeInTheDocument();
      expect(screen.getByText(/₹3.5L/i)).toBeInTheDocument();

      // Verify active badge on active persona
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('invokes onSelectPersona when an inactive persona is clicked', () => {
      const handleSelect = vi.fn();
      render(
        <PersonaSwitcher
          activeEventId={SAMPLE_WEDDING.id}
          onSelectPersona={handleSelect}
        />
      );

      const birthdayBtn = screen.getByRole('button', { name: /Rohan's 30th/i });
      fireEvent.click(birthdayBtn);

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(SAMPLE_BIRTHDAY);
    });
  });

  /* =========================================================================
     2. CHAOS & SCENARIO BUTTON TESTS
     ========================================================================= */
  describe('ChaosBar & Instant Simulations', () => {
    it('renders headline simulation button and dropdown', () => {
      render(<ChaosBar plan={SAMPLE_WEDDING} />);

      expect(screen.getByText(/Simulate: Caterer raises price 20%/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /More simulation scenarios/i })).toBeInTheDocument();
    });

    it('triggers caterer price spike on headline button click', () => {
      const onApplyScenario = vi.fn();
      render(
        <ChaosBar
          plan={SAMPLE_WEDDING}
          onApplyScenario={onApplyScenario}
        />
      );

      const headlineBtn = screen.getByRole('button', { name: /Simulate: Caterer raises price 20%/i });
      fireEvent.click(headlineBtn);

      expect(onApplyScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorPriceSpikePercent: 20,
        })
      );
    });

    it('renders trade-off proposal banner when changeLog has entries', () => {
      const planWithChange = {
        ...SAMPLE_WEDDING,
        changeLog: [
          {
            id: 'chg-1',
            timestamp: new Date().toISOString(),
            description: 'Simulated +20% Caterer Price Spike',
            changes: { vendorPriceDelta: 200000 },
          },
        ],
      };

      const onApplyTradeOff = vi.fn();
      const onUndo = vi.fn();

      render(
        <ChaosBar
          plan={planWithChange}
          onApplyTradeOff={onApplyTradeOff}
          onUndoLastChange={onUndo}
        />
      );

      // Verify proposal and undo buttons exist
      expect(screen.getByText(/Trade-off suggestion:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Apply suggestion/i })).toBeInTheDocument();

      const undoBtn = screen.getByRole('button', { name: /Undo/i });
      fireEvent.click(undoBtn);
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  /* =========================================================================
     3. GUIDED DEMO TOUR TESTS
     ========================================================================= */
  describe('DemoTour 90-Second Walkthrough', () => {
    it('renders tour modal with step 1 and navigates to subsequent steps', () => {
      const onNavigateTab = vi.fn();
      const onOpenCopilot = vi.fn();
      const onClose = vi.fn();

      render(
        <DemoTour
          isOpen={true}
          onClose={onClose}
          onNavigateTab={onNavigateTab}
          onOpenCopilot={onOpenCopilot}
        />
      );

      // Step 1: Dashboard
      expect(screen.getByText(/1 of 6/i)).toBeInTheDocument();
      expect(screen.getByText('Cultural Intelligence at a Glance')).toBeInTheDocument();

      // Click Next -> Step 2
      const nextBtn = screen.getByRole('button', { name: /^Next$/i });
      fireEvent.click(nextBtn);

      expect(screen.getByText(/2 of 6/i)).toBeInTheDocument();
      expect(screen.getByText('Interactive Donut & Category Filter')).toBeInTheDocument();
      expect(onNavigateTab).toHaveBeenCalledWith('budget');

      // Click Next -> Step 3
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      expect(screen.getByText(/3 of 6/i)).toBeInTheDocument();
      expect(screen.getByText('Simulate Real-World Event Volatility')).toBeInTheDocument();

      // Click Next -> Step 4
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      expect(screen.getByText(/4 of 6/i)).toBeInTheDocument();
      expect(screen.getByText(/Deterministic Rules & "Why Am I Seeing This\?"/i)).toBeInTheDocument();

      // Click Next -> Step 5
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      expect(screen.getByText(/5 of 6/i)).toBeInTheDocument();
      expect(screen.getByText('Muhurat Pheras & 10 PM Sound Curfew')).toBeInTheDocument();
      expect(onNavigateTab).toHaveBeenCalledWith('schedule');

      // Click Next -> Step 6 (Copilot)
      fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
      expect(screen.getByText(/6 of 6/i)).toBeInTheDocument();
      expect(screen.getByText(/Contextual Copilot & "Pin to Plan"/i)).toBeInTheDocument();
      expect(onOpenCopilot).toHaveBeenCalled();

      // Finish tour
      const finishBtn = screen.getByRole('button', { name: /Finish tour/i });
      fireEvent.click(finishBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('closes on Escape key press', () => {
      const onClose = vi.fn();
      render(
        <DemoTour
          isOpen={true}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  /* =========================================================================
     4. DECISION ENGINE EXPLAINABILITY & WHY ACCORDION
     ========================================================================= */
  describe('Decision Engine Explainability', () => {
    it('evaluates rules and returns metadata (ruleName, whyExplanation, thresholdMet)', () => {
      const { insights } = evaluateDecisionRules(SAMPLE_WEDDING);

      expect(TOTAL_DECISION_RULES_COUNT).toBe(12);
      expect(insights.length).toBeGreaterThan(0);

      // Verify that enriched insights contain rule metadata
      insights.forEach((insight) => {
        expect(insight.ruleId).toBeDefined();
        expect(insight.ruleName).toBeDefined();
        expect(insight.whyExplanation).toBeDefined();
        expect(insight.thresholdMet).toBeDefined();
      });
    });

    it('renders "Rules fired: N / 12" counter and toggles "Why am I seeing this?" in Dashboard', () => {
      const { insights } = evaluateDecisionRules(SAMPLE_WEDDING);
      const planWithInsights = {
        ...SAMPLE_WEDDING,
        decisionInsights: insights,
      };

      render(
        <DashboardOverview
          plan={planWithInsights}
          budgetSummary={mockBudgetSummary}
          timelineAudit={mockTimelineAudit}
          onNavigateTab={vi.fn()}
          onToggleTask={vi.fn()}
          onRegenerateIdeas={vi.fn()}
        />
      );

      // Verify rules fired counter badge
      expect(screen.getByText(new RegExp(`${insights.length}/${TOTAL_DECISION_RULES_COUNT} Fired`, 'i'))).toBeInTheDocument();

      // Verify "Why am I seeing this?" toggle buttons exist
      const whyButtons = screen.getAllByRole('button', { name: /Explain reason for/i });
      expect(whyButtons.length).toBeGreaterThan(0);

      // Expand the first insight's explanation
      fireEvent.click(whyButtons[0]);

      // Verify rule name and trigger are rendered
      expect(screen.getByText(/Rule:/i)).toBeInTheDocument();
      expect(screen.getByText(/Trigger:/i)).toBeInTheDocument();
    });
  });

  /* =========================================================================
     5. COPILOT DRAWER UPGRADE & PIN TO PLAN
     ========================================================================= */
  describe('AICopilotDrawer Context & Pin to Plan', () => {
    it('adapts context suggestions according to activeTab and eventType', () => {
      const { rerender } = render(
        <AICopilotDrawer
          plan={SAMPLE_WEDDING}
          isOpen={true}
          onClose={vi.fn()}
          activeTab="budget"
        />
      );

      // Budget suggestions
      expect(screen.getByText(/How to cut ₹50K from catering budget\?/i)).toBeInTheDocument();

      // Switch to schedule tab
      rerender(
        <AICopilotDrawer
          plan={SAMPLE_WEDDING}
          isOpen={true}
          onClose={vi.fn()}
          activeTab="schedule"
        />
      );
      expect(screen.getByText(/10 PM curfew rules & sound permits/i)).toBeInTheDocument();

      // Switch to guests tab
      rerender(
        <AICopilotDrawer
          plan={SAMPLE_WEDDING}
          isOpen={true}
          onClose={vi.fn()}
          activeTab="guests"
        />
      );
      expect(screen.getByText(/Jain & Pure Veg separate kitchen tips/i)).toBeInTheDocument();
    });

    it('renders "Pin to plan" and calls onPinTask when clicked', () => {
      const onPinTask = vi.fn();
      render(
        <AICopilotDrawer
          plan={SAMPLE_WEDDING}
          isOpen={true}
          onClose={vi.fn()}
          onPinTask={onPinTask}
        />
      );

      // Welcome message is an assistant message with Pin to plan button
      const pinBtn = screen.getByRole('button', { name: /Pin recommendation as task/i });
      expect(pinBtn).toBeInTheDocument();

      fireEvent.click(pinBtn);
      expect(onPinTask).toHaveBeenCalledTimes(1);
      expect(onPinTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Action: Namaste!'),
          category: 'final',
        })
      );

      // Button updates to "Pinned"
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
  });
});
