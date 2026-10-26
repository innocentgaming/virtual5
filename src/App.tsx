import { useState, useEffect, Suspense, useCallback } from 'react';
import { useEventPlan, type NavigationTab } from './hooks/useEventPlan';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { Toast, ToastProvider } from './components/ui';
import { RotateCcw } from 'lucide-react';
import { lazyWithPreload } from './utils/lazyWithPreload';
import './index.css';

// Code-split tabs and drawer via lazyWithPreload with prefetch & test bypass
const EventSetupForm = lazyWithPreload(() =>
  import('./components/setup/EventSetupForm').then((m) => ({ default: m.EventSetupForm }))
);
const BudgetManager = lazyWithPreload(() =>
  import('./components/budget/BudgetManager').then((m) => ({ default: m.BudgetManager }))
);
const TimelineManager = lazyWithPreload(() =>
  import('./components/timeline/TimelineManager').then((m) => ({ default: m.TimelineManager }))
);
const VendorChecklist = lazyWithPreload(() =>
  import('./components/vendors/VendorChecklist').then((m) => ({ default: m.VendorChecklist }))
);
const PersonalizedIdeas = lazyWithPreload(() =>
  import('./components/ideas/PersonalizedIdeas').then((m) => ({ default: m.PersonalizedIdeas }))
);
const AIAssistantModal = lazyWithPreload(() =>
  import('./components/ai/AIAssistantModal').then((m) => ({ default: m.AIAssistantModal }))
);
const GuestManager = lazyWithPreload(() =>
  import('./components/guests/GuestManager').then((m) => ({ default: m.GuestManager }))
);
const RunOfShowManager = lazyWithPreload(() =>
  import('./components/schedule/RunOfShowManager').then((m) => ({ default: m.RunOfShowManager }))
);
const AICopilotDrawer = lazyWithPreload(() =>
  import('./components/copilot/AICopilotDrawer').then((m) => ({ default: m.AICopilotDrawer }))
);
const AuthModal = lazyWithPreload(() =>
  import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const UserProfileModal = lazyWithPreload(() =>
  import('./components/auth/UserProfileModal').then((m) => ({ default: m.UserProfileModal }))
);
const LandingPage = lazyWithPreload(() =>
  import('./components/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

function TabSkeleton() {
  return (
    <div
      className="card animate-pulse"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minHeight: '400px',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading section content..."
    >
      <div style={{ height: '32px', width: '32%', backgroundColor: 'var(--border-subtle)', borderRadius: '6px' }} />
      <div style={{ height: '18px', width: '65%', backgroundColor: 'var(--border-subtle)', borderRadius: '4px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ height: '90px', backgroundColor: 'var(--border-subtle)', borderRadius: '8px' }} />
        <div style={{ height: '90px', backgroundColor: 'var(--border-subtle)', borderRadius: '8px' }} />
        <div style={{ height: '90px', backgroundColor: 'var(--border-subtle)', borderRadius: '8px' }} />
      </div>
      <div style={{ height: '220px', backgroundColor: 'var(--border-subtle)', borderRadius: '8px', marginTop: '1rem' }} />
    </div>
  );
}

function MainAppContent() {
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
    applyTradeOff,
    undoLastChange,
    applyScenarioChange,
    storageError,
    clearStorageError,
  } = useEventPlan();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('eventwise_color_mode');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [notification, setNotification] = useState<string | null>(null);
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    isProfileModalOpen,
    closeProfileModal,
  } = useAuth();

  // Sync color mode and event theme to document root (html and body) and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eventwise_color_mode', colorMode);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-color-mode', colorMode);
    document.documentElement.setAttribute('data-theme', activeEvent.eventType);
    document.documentElement.style.colorScheme = colorMode;
    if (document.body) {
      document.body.setAttribute('data-color-mode', colorMode);
      document.body.setAttribute('data-theme', activeEvent.eventType);
    }
  }, [colorMode, activeEvent.eventType]);

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

  const handleExportCalendar = async () => {
    const { downloadEventCalendar } = await import('./services/calendarService');
    downloadEventCalendar(activeEvent);
    showToast('iCalendar (.ics) file exported with timeline reminders!');
  };

  // Dynamic document title update per active section
  useEffect(() => {
    const tabTitles: Record<NavigationTab, string> = {
      landing: 'Home & Features Showcase',
      dashboard: 'Dashboard Overview',
      setup: 'Event Setup',
      budget: 'Budget Planner & Expenses',
      timeline: 'Timeline & Tasks',
      schedule: 'Run of Show & Schedule',
      guests: 'Guest List & RSVPs',
      vendors: 'Vendor Checklist & Procurement',
      ideas: 'Personalized Ideas',
      ai: 'AI Assistant',
    };
    const viewName = isCreatingNew ? 'Create New Celebration' : tabTitles[activeTab] || 'Dashboard';
    document.title = `${viewName} — ${activeEvent.title} | EventWise AI`;
  }, [activeTab, activeEvent.title, isCreatingNew]);

  const handleTabHover = useCallback((tab: NavigationTab) => {
    switch (tab) {
      case 'budget':
        BudgetManager.preload();
        break;
      case 'timeline':
        TimelineManager.preload();
        break;
      case 'guests':
        GuestManager.preload();
        break;
      case 'schedule':
        RunOfShowManager.preload();
        break;
      case 'vendors':
        VendorChecklist.preload();
        break;
      case 'ideas':
        PersonalizedIdeas.preload();
        break;
      case 'ai':
        AIAssistantModal.preload();
        break;
      case 'setup':
        EventSetupForm.preload();
        break;
      case 'landing':
        LandingPage.preload();
        break;
    }
  }, []);

  // Idle prefetch route chunks progressively after initial render
  useEffect(() => {
    const prefetchIdle = () => {
      const items = [
        LandingPage,
        BudgetManager,
        TimelineManager,
        GuestManager,
        RunOfShowManager,
        VendorChecklist,
        PersonalizedIdeas,
        AICopilotDrawer,
        AuthModal,
        UserProfileModal,
      ];
      let idx = 0;
      const scheduleNext = () => {
        if (idx < items.length) {
          const comp = items[idx++];
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
              comp.preload();
              scheduleNext();
            });
          } else {
            setTimeout(() => {
              comp.preload();
              scheduleNext();
            }, 250);
          }
        }
      };
      scheduleNext();
    };

    const timer = setTimeout(prefetchIdle, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastProvider>
      <div
        data-theme={activeEvent.eventType}
        data-color-mode={colorMode}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-main)',
          transition: 'background-color var(--transition-fast), color var(--transition-fast)',
        }}
      >
      {/* Accessibility Skip-To-Main Link */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Toast Notification */}
      {notification && (
        <Toast
          message={notification}
          onDismiss={() => setNotification(null)}
        />
      )}
      {storageError && (
        <Toast
          message={storageError}
          type="danger"
          onDismiss={() => clearStorageError()}
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
        onNavigateTab={setActiveTab}
        onOpenCopilot={() => {
          AICopilotDrawer.preload();
          setIsCopilotOpen(true);
        }}
      />

      <main id="main" tabIndex={-1} className="app-container" style={{ flex: 1, marginTop: '1.25rem', outline: 'none' }}>
        {/* Navigation Tabs */}
        {!isCreatingNew && (
          <Navigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onTabHover={handleTabHover}
            overdueTasksCount={timelineAudit.overdueCount}
            isOverBudget={budgetSummary.isOverBudget}
          />
        )}

        {/* View Routing */}
        <Suspense fallback={<TabSkeleton />}>
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
                  onOpenCopilot={() => {
                    AICopilotDrawer.preload();
                    setIsCopilotOpen(true);
                  }}
                  onExportCalendar={handleExportCalendar}
                  onApplyTradeOff={applyTradeOff}
                  onApplyScenario={applyScenarioChange}
                  onUndoLastChange={undoLastChange}
                  isGenerating={isGenerating}
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
                  onAddBudgetItem={addBudgetItem}
                  onAddTask={addTask}
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

              {activeTab === 'landing' && (
                <LandingPage
                  activeEvent={activeEvent}
                  events={events}
                  onSelectEvent={selectEvent}
                  onNavigateTab={setActiveTab}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* AI Copilot Drawer */}
      <Suspense fallback={null}>
        <AICopilotDrawer
          plan={activeEvent}
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          onApplyTradeOff={applyTradeOff}
        />
      </Suspense>

      {/* Accessible Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-raised)',
          padding: '2rem 1.5rem',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginTop: 'auto',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Top Footer: Brand, Value Proposition & Capabilities */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>EventWise AI — India Edition</strong>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                  }}
                >
                  PRO SUITE
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  All-in-One Indian Event Management Platform
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Replacing spreadsheets for Royal Weddings, Bollywood Birthdays, and Community Melas across India.
              </p>
            </div>

            {/* Quick Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 600 }}>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('landing'); }}
                style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700 }}
              >
                🌟 Home & Showcase
              </a>
              <span>•</span>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('budget'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Budget Tracker
              </a>
              <span>•</span>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('schedule'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Day-of Schedule
              </a>
              <span>•</span>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('guests'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Guest & Jain Counter
              </a>
              <span>•</span>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('vendors'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Vendor Directory
              </a>
              <span>•</span>
              <a
                href="#main"
                onClick={(e) => { e.preventDefault(); setActiveTab('ideas'); }}
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Cultural Moodboards
              </a>
            </div>
          </div>

          {/* Bottom Footer: Reset Demo Data & Privacy Notice */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all events back to standard sample templates? Any custom added items will be replaced.')) {
                    resetToDefaults();
                    showToast('Reset to default sample events.');
                  }
                }}
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background var(--transition-fast)',
                }}
                title="Reset events data to sample templates"
              >
                <RotateCcw size={13} />
                Reset Demo Data
              </button>
              <span>Planning benchmark engine. Client-side state never transmits secret API keys to servers.</span>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              100% Offline Capable · WCAG AA Contrast · Zero Hallucinations
            </div>
          </div>
        </div>
      </footer>

      {/* Authentication & Profile Modals */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={closeAuthModal}
            initialMode={authModalMode}
            onSuccess={(msg) => showToast(msg)}
          />
        </Suspense>
      )}

      {isProfileModalOpen && (
        <Suspense fallback={null}>
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={closeProfileModal}
            activeEvent={activeEvent}
            onSignOutFeedback={(msg) => showToast(msg)}
            onSwitchPersonaFeedback={(msg) => showToast(msg)}
          />
        </Suspense>
      )}
    </div>
    </ToastProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;

