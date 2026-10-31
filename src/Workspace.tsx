import { useState, useEffect, Suspense, useCallback } from 'react';
import { useEventPlan, type NavigationTab } from './hooks/useEventPlan';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { Toast, ToastProvider } from './components/ui';
import {
  RotateCcw,
  Sparkles,
  Compass,
  Share2,
  Printer,
  LayoutDashboard,
  CalendarClock,
  Users as UsersIcon,
  IndianRupee,
} from 'lucide-react';
import { PersonaSwitcher } from './components/demo/PersonaSwitcher';
import { DemoTour } from './components/demo/DemoTour';
import { lazyWithPreload } from './utils/lazyWithPreload';
import type { TaskCategory } from './types/event';
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
const AccountModal = lazyWithPreload(() =>
  import('./components/auth/AccountModal').then((m) => ({ default: m.AccountModal }))
);
const EventWebsiteModal = lazyWithPreload(() =>
  import('./components/website/EventWebsiteModal').then((m) => ({ default: m.EventWebsiteModal }))
);
import { EmptyStateOnboarding } from './components/onboarding/EmptyStateOnboarding';
import { useAuth } from './hooks/useAuth';
import { Link } from './routerComponents';

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

export type WorkspaceMode = 'account' | 'demo';

export function Workspace({ mode }: { mode: WorkspaceMode }) {
  const { user, refresh, logout } = useAuth();
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
    clearAllEvents,
    loadSampleTemplates,
    exportCurrentPlan,
    importPlan,
    applyTradeOff,
    undoLastChange,
    applyScenarioChange,
    storageError,
    clearStorageError,
    syncStatus,
    accountLoad,
    reloadAccount,
    hasPlans,
    resolveSyncConflict,
    retrySync,
    lastChangeDiff,
    clearLastChangeDiff,
  } = useEventPlan({ cloudSync: mode === 'account', onSessionExpired: refresh });

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isWebsiteOpen, setIsWebsiteOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const websiteParam = new URLSearchParams(window.location.search).get('website');
    return websiteParam === '1' || websiteParam === 'true';
  });
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('eventwise_color_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
      return 'dark';
    }
    return 'light';
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const tourParam = new URLSearchParams(window.location.search).get('tour');
    return tourParam === '1' || tourParam === 'true' || tourParam === 'start';
  });

  // URL Query Parameters parsing for demo mode (?tour=1, ?event=..., ?tab=..., ?scenario=..., ?website=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const eventParam = params.get('event');
    if (eventParam && events.length > 0) {
      const target = events.find(
        (e) =>
          e.eventType.toLowerCase() === eventParam.toLowerCase() ||
          e.id.toLowerCase().includes(eventParam.toLowerCase())
      );
      if (target && target.id !== activeEvent?.id) {
        selectEvent(target.id);
      }
    }

    const tabParam = params.get('tab') as NavigationTab | null;
    if (
      tabParam &&
      ['dashboard', 'budget', 'timeline', 'schedule', 'guests', 'vendors', 'ideas', 'ai', 'setup'].includes(
        tabParam
      )
    ) {
      setActiveTab(tabParam);
    }

    const scenarioParam = params.get('scenario');
    if (scenarioParam) {
      if (scenarioParam === 'caterer_spike') {
        applyScenarioChange({
          vendorPriceSpikePercent: 20,
          scenarioName: 'Caterer Quote Spike (+20%)',
        });
      } else if (scenarioParam === 'rain') {
        applyScenarioChange({
          newVenuePreference: 'farmhouse_lawn',
          scenarioName: 'Rain Forecast on Outdoor Day',
        });
      } else if (scenarioParam === 'rsvp') {
        applyScenarioChange({
          guestDelta: 30,
          scenarioName: 'Surge: +30 Extra RSVPs',
        });
      }
    }
  }, [events, activeEvent?.id, selectEvent, setActiveTab, applyScenarioChange]);

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeEvent) {
      url.searchParams.set('event', activeEvent.eventType);
    }
    url.searchParams.set('tab', activeTab);
    navigator.clipboard.writeText(url.toString());
    showToast('✓ Shareable demo link copied to clipboard!');
  };

  // Sync color mode and event theme to document root (html and body) and localStorage
  const activeEventType = activeEvent?.eventType;
  useEffect(() => {
    try {
      localStorage.setItem('eventwise_color_mode', colorMode);
    } catch {
      // ignore
    }
    const themeName = activeEventType || 'wedding';
    document.documentElement.setAttribute('data-color-mode', colorMode);
    document.documentElement.setAttribute('data-theme', themeName);
    document.documentElement.style.colorScheme = colorMode;
    if (document.body) {
      document.body.setAttribute('data-color-mode', colorMode);
      document.body.setAttribute('data-theme', themeName);
    }
  }, [colorMode, activeEventType]);

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

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
    if (!activeEvent) return;
    const { downloadEventCalendar } = await import('./services/calendarService');
    downloadEventCalendar(activeEvent);
    showToast('iCalendar (.ics) file exported with timeline reminders!');
  };

  const handleImportPlan = useCallback((jsonString: string) => {
    const res = importPlan(jsonString);
    if (res.success) {
      showToast('Event plan successfully restored from JSON backup!');
    } else {
      showToast(`Restore failed: ${res.error || 'Corrupted file'}`);
    }
  }, [importPlan, showToast]);

  // Dynamic document title update per active section
  useEffect(() => {
    const tabTitles: Record<NavigationTab, string> = {
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
    if (mode === 'account' && (accountLoad !== 'ready' || !hasPlans)) {
      document.title = 'Your plans | EventWise AI';
      return;
    }
    const viewName = isCreatingNew ? 'Create New Celebration' : tabTitles[activeTab] || 'Dashboard';
    document.title = `${viewName} — ${activeEvent?.title || 'EventWise AI'} | EventWise AI`;
  }, [activeTab, activeEvent?.title, isCreatingNew, mode, accountLoad, hasPlans]);

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
    }
  }, []);

  // Idle prefetch route chunks progressively after initial render
  useEffect(() => {
    const prefetchIdle = () => {
      const items = [
        BudgetManager,
        TimelineManager,
        GuestManager,
        RunOfShowManager,
        VendorChecklist,
        PersonalizedIdeas,
        AICopilotDrawer,
        AccountModal,
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

  // Signed-in accounts: never render the (sample) fallback plan while the account's own plans load,
  // when loading failed, or when this is a brand-new account with no plans yet.
  if (mode === 'account' && accountLoad !== 'ready') {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        {accountLoad === 'error' ? (
          <div className="card" role="alert" style={{ padding: '2rem', maxWidth: '460px', textAlign: 'center', display: 'grid', gap: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>We couldn’t load your plans</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Check your connection and try again. Your saved plans are safe in your account.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={reloadAccount}>Try again</button>
              <button type="button" className="btn btn-ghost" onClick={() => void logout()}>Sign out</button>
            </div>
          </div>
        ) : (
          <div role="status" aria-live="polite" style={{ width: 'min(520px, 100%)' }}>
            <TabSkeleton />
          </div>
        )}
      </div>
    );
  }

  if (mode === 'account' && !hasPlans) {
    const firstName = user?.name?.split(' ')[0];
    return (
      <ToastProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <strong>EventWise AI</strong>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void logout()}>Sign out</button>
          </header>
          <main id="main" tabIndex={-1} className="app-container" style={{ flex: 1, marginTop: '1.25rem', outline: 'none' }}>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>
              {firstName ? `Welcome, ${firstName}!` : 'Welcome!'} Let’s plan your first celebration.
            </h1>
            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)' }}>
              Your account starts empty. Tell us about your event and we’ll build a personalised plan that is saved to your account.
            </p>
            <Suspense fallback={<TabSkeleton />}>
              <EventSetupForm isEditing={false} onSave={handleCreateNewSubmit} isGenerating={isGenerating} />
            </Suspense>
          </main>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div
        data-theme={activeEvent ? activeEvent.eventType : 'wedding'}
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

      {mode === 'demo' && activeEvent && (
        <aside className="demo-showcase-bar" role="status" aria-label="Demo mode navigation and persona switcher">
          <div className="demo-showcase-bar__content">
            <div className="demo-showcase-bar__left">
              <span className="demo-badge">DEMO EVALUATOR</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                You are exploring a demo with sample events. Plans stay in this browser.
              </span>
              <PersonaSwitcher
                activeEventId={activeEvent.id}
                onSelectPersona={(evt) => {
                  const existing = events.find((e) => e.id === evt.id);
                  if (existing) {
                    selectEvent(evt.id);
                  } else {
                    selectEvent(evt.id);
                  }
                  showToast(`Switched celebration: ${evt.title}`);
                }}
              />
            </div>

            <div className="demo-showcase-bar__right">
              <button
                type="button"
                className="demo-tour-launch-btn"
                onClick={() => setIsTourActive(true)}
                aria-label="Start 90-second guided product tour"
              >
                <Compass size={15} />
                <span>Start 90s Tour</span>
              </button>

              <button
                type="button"
                className="demo-action-btn"
                onClick={handleCopyShareLink}
                title="Copy shareable link with current persona and tab"
                aria-label="Copy shareable demo link"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>

              <button
                type="button"
                className="demo-action-btn"
                onClick={() => window.print()}
                title="Print executive event summary report"
                aria-label="Print event summary PDF"
              >
                <Printer size={14} />
                <span>PDF Summary</span>
              </button>

              <Link to="/signup?next=/app" className="demo-save-link">
                Create an account to save
              </Link>
            </div>
          </div>
        </aside>
      )}

      {syncStatus === 'conflict' && (
        <div className="conflict-banner" role="alert" style={{ background: '#78350f', color: '#fef3c7', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span><strong>Sync Conflict:</strong> A newer version was saved from another device.</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-sm" style={{ background: '#f59e0b', color: '#1f2937', fontWeight: 600 }} onClick={() => resolveSyncConflict('cloud')}>
              Load latest
            </button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ color: '#fef3c7', borderColor: '#fef3c7' }} onClick={() => resolveSyncConflict('device')}>
              Keep this device
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        events={events}
        activeEvent={activeEvent}
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        mode={mode}
        user={user}
        syncStatus={syncStatus}
        onRetrySync={retrySync}
        onOpenAccount={() => {
          AccountModal.preload();
          setIsAccountOpen(true);
        }}
        onSelectEvent={selectEvent}
        onNewEvent={() => setIsCreatingNew(true)}
        onOpenWebsite={() => {
          EventWebsiteModal.preload();
          setIsWebsiteOpen(true);
        }}
        onExport={exportCurrentPlan}
        onImportPlan={handleImportPlan}
        onExportCalendar={handleExportCalendar}
        onOpenAISettings={() => setActiveTab('ai')}
        onOpenCopilot={() => {
          AICopilotDrawer.preload();
          setIsCopilotOpen(true);
        }}
      />


      {syncStatus === 'conflict' && (
        <div className="demo-banner demo-banner--warn" role="alert">
          <span>Your plans were changed on another device.</span>
          <button type="button" className="demo-banner__btn" onClick={() => void resolveSyncConflict('cloud')}>
            Load the latest version
          </button>
          <button type="button" className="demo-banner__btn" onClick={() => void resolveSyncConflict('device')}>
            Keep what is on this device
          </button>
        </div>
      )}

      <main id="main" tabIndex={-1} className="app-container" style={{ flex: 1, marginTop: '1.25rem', outline: 'none' }}>
        {/* Navigation Tabs */}
        {!isCreatingNew && activeEvent && (
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
          ) : !activeEvent ? (
            <EmptyStateOnboarding
              user={user}
              onCreateNew={() => setIsCreatingNew(true)}
              onOpenAIPlanner={() => {
                setIsCreatingNew(true);
              }}
              onOpenWebsiteBuilder={() => {
                EventWebsiteModal.preload();
                setIsWebsiteOpen(true);
              }}
              onLoadSampleData={() => {
                loadSampleTemplates();
                showToast('Sample celebration templates loaded successfully!');
              }}
              onQuickStartWithCategory={async (template) => {
                await createNewEvent(template, false);
                showToast(`Celebration "${template.title}" created successfully!`);
              }}
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
                  lastChangeDiff={lastChangeDiff}
                  onClearDiff={clearLastChangeDiff}
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
                <div id="tour-timeline">
                  <TimelineManager
                    plan={activeEvent}
                    onToggleTask={toggleTask}
                    onAddTask={addTask}
                    onDeleteTask={deleteTask}
                    onUpdateTask={updateTask}
                  />
                </div>
              )}

              {activeTab === 'guests' && (
                <div id="tour-guests">
                  <GuestManager
                    plan={activeEvent}
                    onAddGuest={addGuest}
                    onUpdateGuest={updateGuest}
                    onDeleteGuest={deleteGuest}
                  />
                </div>
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
                <div id="tour-vendors">
                  <VendorChecklist
                    plan={activeEvent}
                    onUpdateVendor={updateVendor}
                    onAddVendor={addVendor}
                  />
                </div>
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
                  onRegeneratePlan={async (useAI?: boolean, apiKey?: string) => {
                    await regenerateRecommendations(useAI, apiKey);
                    showToast(useAI ? 'GenAI generation completed!' : 'Rule Engine plan re-evaluated!');
                  }}
                  isGenerating={isGenerating}
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
          activeTab={activeTab}
          onPinTask={(t: { title: string; category?: TaskCategory; notes?: string }) => {
            if (!activeEvent) return;
            addTask({
              title: t.title,
              category: t.category || 'final',
              dueDate: activeEvent.eventDate,
              priority: 'high',
              completed: false,
              notes: t.notes,
            });
            showToast(`✓ Pinned task: "${t.title}"`);
          }}
        />
      </Suspense>

      {/* 90-Second Guided Demo Tour */}
      {mode === 'demo' && (
        <DemoTour
          isOpen={isTourActive}
          onClose={() => setIsTourActive(false)}
          onNavigateTab={setActiveTab}
          onOpenCopilot={() => {
            AICopilotDrawer.preload();
            setIsCopilotOpen(true);
          }}
          onCloseCopilot={() => setIsCopilotOpen(false)}
          onRunScenario={applyScenarioChange}
          onUndoScenario={undoLastChange}
        />
      )}

      {/* Responsive Mobile Bottom Tab Bar (<= 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <button
          type="button"
          className={`mobile-bottom-nav__item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          aria-label="Mobile Bottom Overview"
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__item ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
          aria-label="Mobile Bottom Budget"
        >
          <IndianRupee size={20} />
          <span>Budget</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          aria-label="Mobile Bottom Schedule"
        >
          <CalendarClock size={20} />
          <span>Schedule</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-nav__item ${activeTab === 'guests' ? 'active' : ''}`}
          onClick={() => setActiveTab('guests')}
          aria-label="Mobile Bottom Guests"
        >
          <UsersIcon size={20} />
          <span>Guests</span>
        </button>
        <button
          type="button"
          className="mobile-bottom-nav__item mobile-bottom-nav__item--copilot"
          onClick={() => {
            AICopilotDrawer.preload();
            setIsCopilotOpen(true);
          }}
          aria-label="Mobile Bottom Copilot"
        >
          <Sparkles size={20} />
          <span>Copilot</span>
        </button>
      </nav>

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

          {/* Bottom Footer */}
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
              {mode === 'demo' && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset the demo back to the standard sample events? Anything you added here will be replaced.')) {
                      resetToDefaults();
                      showToast('Demo reset to the sample events.');
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
                  }}
                >
                  <RotateCcw size={13} />
                  Reset demo
                </button>
              )}
              <span>Gemini API keys are never stored in your plans.</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontWeight: 600 }}>
              <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
              <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</Link>
              <Link to="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {isAccountOpen && mode === 'account' && (
        <Suspense fallback={null}>
          <AccountModal
            isOpen={isAccountOpen}
            onClose={() => setIsAccountOpen(false)}
            activeEvent={activeEvent}
            onFeedback={(msg: string) => showToast(msg)}
            onClearAllEvents={async () => {
              await clearAllEvents();
              showToast('Celebration database reset to fresh blank state.');
            }}
          />
        </Suspense>
      )}

      {isWebsiteOpen && (
        <Suspense fallback={null}>
          <EventWebsiteModal
            isOpen={isWebsiteOpen}
            onClose={() => setIsWebsiteOpen(false)}
            plan={activeEvent}
            onAddGuest={addGuest}
            onUpdateGuest={updateGuest}
            onToast={(msg: string) => showToast(msg)}
          />
        </Suspense>
      )}
    </div>
    </ToastProvider>
  );
}

export default Workspace;
