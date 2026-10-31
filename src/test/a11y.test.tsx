import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { BudgetManager } from '../components/budget/BudgetManager';
import { GuestManager } from '../components/guests/GuestManager';
import { TimelineManager } from '../components/timeline/TimelineManager';
import { RunOfShowManager } from '../components/schedule/RunOfShowManager';
import { VendorChecklist } from '../components/vendors/VendorChecklist';
import { AICopilotDrawer } from '../components/copilot/AICopilotDrawer';
import { calculateBudgetSummary, auditTimelineTasks } from '../services/decisionEngine';

expect.extend(matchers);

describe('WCAG 2.1 AA Automated Axe Audit - EventWise AI', () => {
  const event = INITIAL_EVENTS[0];
  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.contingencyRate);
  const timelineAudit = auditTimelineTasks(event.tasks);

  it('reports zero accessibility violations for the Dashboard Overview page', async () => {
    const { container } = render(
      <main id="main">
        <h1 className="sr-only">EventWise AI</h1>
        <div data-theme="wedding" data-color-mode="light">
          <DashboardOverview
            plan={event}
            budgetSummary={budgetSummary}
            timelineAudit={timelineAudit}
            onNavigateTab={() => {}}
            onToggleTask={() => {}}
            onRegenerateIdeas={() => {}}
            onOpenCopilot={() => {}}
            onExportCalendar={() => {}}
          />
        </div>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reports zero accessibility violations for the Budget Manager page', async () => {
    const { container } = render(
      <main id="main">
        <h1 className="sr-only">EventWise AI</h1>
        <div data-theme="wedding" data-color-mode="light">
          <BudgetManager
            plan={event}
            budgetSummary={budgetSummary}
            onAddExpense={() => {}}
            onUpdateExpense={() => {}}
            onDeleteExpense={() => {}}
            onUpdateContingency={() => {}}
          />
        </div>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reports zero accessibility violations for the Guest Manager page', async () => {
    const { container } = render(
      <main id="main">
        <h1 className="sr-only">EventWise AI</h1>
        <div data-theme="wedding" data-color-mode="light">
          <GuestManager
            plan={event}
            onAddGuest={() => {}}
            onUpdateGuest={() => {}}
            onDeleteGuest={() => {}}
          />
        </div>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reports zero accessibility violations for the Schedule & Timeline page', async () => {
    const { container } = render(
      <main id="main">
        <h1 className="sr-only">EventWise AI</h1>
        <div data-theme="wedding" data-color-mode="light">
          <TimelineManager
            plan={event}
            onToggleTask={() => {}}
            onAddTask={() => {}}
            onDeleteTask={() => {}}
            onUpdateTask={() => {}}
          />
          <RunOfShowManager
            plan={event}
            onAddScheduleItem={() => {}}
            onUpdateScheduleItem={() => {}}
            onDeleteScheduleItem={() => {}}
          />
        </div>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reports zero accessibility violations for the Vendor Checklist page', async () => {
    const { container } = render(
      <main id="main">
        <h1 className="sr-only">EventWise AI</h1>
        <div data-theme="wedding" data-color-mode="light">
          <VendorChecklist
            plan={event}
            onUpdateVendor={() => {}}
            onAddVendor={() => {}}
          />
        </div>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('reports zero accessibility violations for the open Copilot Drawer', async () => {
    const { container } = render(
      <div data-theme="wedding" data-color-mode="light">
        <h1 className="sr-only">EventWise AI</h1>
        <AICopilotDrawer
          plan={event}
          isOpen={true}
          onClose={() => {}}
        />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
