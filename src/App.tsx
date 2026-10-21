import { useState } from 'react';
import { useEventPlan } from './hooks/useEventPlan';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { EventSetupForm } from './components/setup/EventSetupForm';
import { BudgetManager } from './components/budget/BudgetManager';
import { TimelineManager } from './components/timeline/TimelineManager';
import { VendorChecklist } from './components/vendors/VendorChecklist';
import { PersonalizedIdeas } from './components/ideas/PersonalizedIdeas';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { Sparkles, RotateCcw } from 'lucide-react';
import './index.css';

export function App() {
  const {
    events,
    activeEvent,
    activeTab,
    budgetSummary,
    timelineAudit,
    isGenerating,
    setActiveTab,
    selectEvent,
    createNewEvent,
    updateEventParameters,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    updateContingencyRate,
    toggleTask,
    addTask,
    deleteTask,
    updateTask,
    updateVendor,
    addVendor,
    regenerateRecommendations,
    resetToDefaults,
    exportCurrentPlan,
  } = useEventPlan();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateNewSubmit = async (data: Parameters<typeof createNewEvent>[0], useAI: boolean) => {
    await createNewEvent(data, useAI);
    setIsCreatingNew(false);
    showToast(`Event "${data.title}" successfully created and personalized!`);
  };

  const handleEditDetailsSubmit = (data: Parameters<typeof createNewEvent>[0]) => {
    updateEventParameters(data);
    setActiveTab('dashboard');
    showToast('Event details updated and plan recalculations completed!');
  };

  const handleRegenerateIdeas = async () => {
    await regenerateRecommendations(false);
    showToast('Personalized recommendations and alternatives refreshed!');
  };

  return (
    <div data-theme={activeEvent.eventType} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--text-main)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          role="status"
        >
          <Sparkles size={16} color="#fbbf24" />
          <span>{notification}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', marginLeft: '8px' }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={selectEvent}
        onNewEvent={() => setIsCreatingNew(true)}
        onExport={exportCurrentPlan}
        onOpenAISettings={() => setActiveTab('ai')}
      />

      <main className="app-container" style={{ flex: 1, marginTop: '1.25rem' }}>
        {/* Navigation Tabs */}
        {!isCreatingNew && (
          <Navigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            overdueTasksCount={timelineAudit.overdueCount}
            isOverBudget={budgetSummary.isOverBudget}
          />
        )}

        {/* View Routing */}
        {isCreatingNew ? (
          <EventSetupForm
            isEditing={false}
            onSave={handleCreateNewSubmit}
            onCancel={() => setIsCreatingNew(false)}
            isGenerating={isGenerating}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                plan={activeEvent}
                budgetSummary={budgetSummary}
                timelineAudit={timelineAudit}
                onNavigateTab={setActiveTab}
                onToggleTask={toggleTask}
                onRegenerateIdeas={handleRegenerateIdeas}
              />
            )}

            {activeTab === 'setup' && (
              <EventSetupForm
                initialPlan={activeEvent}
                isEditing={true}
                onSave={handleEditDetailsSubmit}
                onCancel={() => setActiveTab('dashboard')}
                isGenerating={isGenerating}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetManager
                plan={activeEvent}
                budgetSummary={budgetSummary}
                onAddExpense={addBudgetItem}
                onUpdateExpense={updateBudgetItem}
                onDeleteExpense={deleteBudgetItem}
                onUpdateContingency={updateContingencyRate}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineManager
                plan={activeEvent}
                onToggleTask={toggleTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onUpdateTask={updateTask}
              />
            )}

            {activeTab === 'vendors' && (
              <VendorChecklist
                plan={activeEvent}
                onUpdateVendor={updateVendor}
                onAddVendor={addVendor}
              />
            )}

            {activeTab === 'ideas' && (
              <PersonalizedIdeas
                plan={activeEvent}
                onRegenerateIdeas={handleRegenerateIdeas}
                isGenerating={isGenerating}
              />
            )}

            {activeTab === 'ai' && (
              <AIAssistantModal
                plan={activeEvent}
                onRegeneratePlan={async (useAI, apiKey) => {
                  await regenerateRecommendations(useAI, apiKey);
                  showToast(useAI ? 'GenAI generation completed!' : 'Rule Engine plan re-evaluated!');
                }}
                isGenerating={isGenerating}
              />
            )}
          </>
        )}
      </main>

      {/* Accessible Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-card)',
          padding: '1.5rem',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong>EventWise AI v1.0.0</strong> — Intelligent Event Planning Assistant for Weddings, Birthdays & Community Events.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all events back to standard sample templates? Any custom added items will be replaced.')) {
                  resetToDefaults();
                  showToast('Reset to default sample events.');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8125rem',
              }}
              title="Reset events data to sample templates"
            >
              <RotateCcw size={14} />
              Reset Demo Data
            </button>
            <span>All estimates are planning benchmarks. Never stores secret keys in browser storage.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
