import { useState, useEffect } from 'react';
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
import { GuestManager } from './components/guests/GuestManager';
import { RunOfShowManager } from './components/schedule/RunOfShowManager';
import { AICopilotDrawer } from './components/copilot/AICopilotDrawer';
import { Toast } from './components/common/Toast';
import { downloadEventCalendar } from './services/calendarService';
import { RotateCcw } from 'lucide-react';
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
    addGuest,
    updateGuest,
    deleteGuest,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    regenerateRecommendations,
    resetToDefaults,
    exportCurrentPlan,
  } = useEventPlan();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('eventwise_color_mode');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [notification, setNotification] = useState<string | null>(null);

  // Sync color mode to localStorage
  useEffect(() => {
    localStorage.setItem('eventwise_color_mode', colorMode);
  }, [colorMode]);

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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

  const handleExportCalendar = () => {
    downloadEventCalendar(activeEvent);
    showToast('iCalendar (.ics) file exported with timeline reminders!');
  };

  return (
    <div
      data-theme={activeEvent.eventType}
      data-color-mode={colorMode}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Toast Notification */}
      {notification && (
        <Toast
          message={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Main Header */}
      <Header
        events={events}
        activeEvent={activeEvent}
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        onSelectEvent={selectEvent}
        onNewEvent={() => setIsCreatingNew(true)}
        onExport={exportCurrentPlan}
        onExportCalendar={handleExportCalendar}
        onOpenAISettings={() => setActiveTab('ai')}
        onOpenCopilot={() => setIsCopilotOpen(true)}
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

            {activeTab === 'guests' && (
              <GuestManager
                plan={activeEvent}
                onAddGuest={addGuest}
                onUpdateGuest={updateGuest}
                onDeleteGuest={deleteGuest}
              />
            )}

            {activeTab === 'schedule' && (
              <RunOfShowManager
                plan={activeEvent}
                onAddScheduleItem={addScheduleItem}
                onUpdateScheduleItem={updateScheduleItem}
                onDeleteScheduleItem={deleteScheduleItem}
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

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        plan={activeEvent}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong>EventWise AI — India Edition</strong>
            <span>🇮🇳 Made for India First · Royal Weddings, Bollywood Birthdays & Community Melas (₹ en-IN)</span>
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

