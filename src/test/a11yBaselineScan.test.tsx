import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { EventSetupForm } from '../components/setup/EventSetupForm';
import { BudgetManager } from '../components/budget/BudgetManager';
import { TimelineManager } from '../components/timeline/TimelineManager';
import { GuestManager } from '../components/guests/GuestManager';
import { RunOfShowManager } from '../components/schedule/RunOfShowManager';
import { VendorChecklist } from '../components/vendors/VendorChecklist';
import { PersonalizedIdeas } from '../components/ideas/PersonalizedIdeas';
import { AIAssistantModal } from '../components/ai/AIAssistantModal';
import { AICopilotDrawer } from '../components/copilot/AICopilotDrawer';
import { calculateBudgetSummary, auditTimelineTasks } from '../services/decisionEngine';

describe('Step 0 Accessibility Baseline Audit - All Main Views', () => {
  const event = INITIAL_EVENTS[0];
  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.contingencyRate);
  const timelineAudit = auditTimelineTasks(event.tasks);

  async function checkAxe(name: string, ui: React.ReactElement) {
    const { container } = render(ui);
    const results = await axe(container);
    console.log(`\n--- [Axe Scan] ${name} (Violations: ${results.violations.length}) ---`);
    if (results.violations.length > 0) {
      results.violations.forEach((v) => {
        console.log(`❌ [${v.impact?.toUpperCase()}] Rule: ${v.id} (${v.description}) - ${v.nodes.length} nodes`);
        v.nodes.slice(0, 3).forEach((n) => {
          console.log(`   - Node: ${n.target.join(' ')}`);
          console.log(`     Summary: ${n.failureSummary}`);
        });
      });
    } else {
      console.log(`✅ Zero axe violations in ${name}!`);
    }
    return results.violations;
  }

  it('audits all main views and components across themes and modes', async () => {
    // 1. Dashboard
    await checkAxe('DashboardOverview', (
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
    ));

    // 2. Event Setup Form
    await checkAxe('EventSetupForm', (
      <div data-theme="wedding" data-color-mode="light">
        <EventSetupForm
          initialPlan={event}
          isEditing={true}
          onSave={() => {}}
          onCancel={() => {}}
        />
      </div>
    ));

    // 3. Budget Manager
    await checkAxe('BudgetManager', (
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
    ));

    // 4. Timeline Manager
    await checkAxe('TimelineManager', (
      <div data-theme="wedding" data-color-mode="light">
        <TimelineManager
          plan={event}
          onToggleTask={() => {}}
          onAddTask={() => {}}
          onDeleteTask={() => {}}
          onUpdateTask={() => {}}
        />
      </div>
    ));

    // 5. Guest Manager
    await checkAxe('GuestManager', (
      <div data-theme="wedding" data-color-mode="light">
        <GuestManager
          plan={event}
          onAddGuest={() => {}}
          onUpdateGuest={() => {}}
          onDeleteGuest={() => {}}
        />
      </div>
    ));

    // 6. Run of Show Manager
    await checkAxe('RunOfShowManager', (
      <div data-theme="wedding" data-color-mode="light">
        <RunOfShowManager
          plan={event}
          onAddScheduleItem={() => {}}
          onUpdateScheduleItem={() => {}}
          onDeleteScheduleItem={() => {}}
        />
      </div>
    ));

    // 7. Vendor Checklist
    await checkAxe('VendorChecklist', (
      <div data-theme="wedding" data-color-mode="light">
        <VendorChecklist
          plan={event}
          onUpdateVendor={() => {}}
          onAddVendor={() => {}}
        />
      </div>
    ));

    // 8. Personalized Ideas
    await checkAxe('PersonalizedIdeas', (
      <div data-theme="wedding" data-color-mode="light">
        <PersonalizedIdeas
          plan={event}
          onRegenerateIdeas={() => {}}
          onAddBudgetItem={() => {}}
          onAddTask={() => {}}
        />
      </div>
    ));

    // 9. AI Assistant Modal
    await checkAxe('AIAssistantModal', (
      <div data-theme="wedding" data-color-mode="light">
        <AIAssistantModal
          plan={event}
          onRegeneratePlan={() => Promise.resolve()}
        />
      </div>
    ));

    // 10. AI Copilot Drawer
    await checkAxe('AICopilotDrawer', (
      <div data-theme="wedding" data-color-mode="light">
        <AICopilotDrawer
          plan={event}
          isOpen={true}
          onClose={() => {}}
        />
      </div>
    ));
  });
});
