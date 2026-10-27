import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  EventPlan,
  BudgetItem,
  TaskItem,
  VendorItem,
  GuestItem,
  ScheduleItem,
  EventType,
  TradeOffOption,
  VenuePreference,
  PlanChangeLogEntry,
  PlanChangeDiff,
} from '../types/event';
import {
  loadSavedEvents,
  saveEvents,
  loadActiveEventId,
  saveActiveEventId,
  exportPlanAsJson,
  importPlanFromJson,
  getStorageError,
  subscribeStorageError,
  clearStorageError,
  isValidEventPlan,
  sanitizeEventForStorage,
} from '../services/storageService';
import { eventsApi, type RemoteEventsDoc } from '../services/authApi';
import {
  calculateBudgetSummary,
  evaluateDecisionRules,
  auditTimelineTasks,
  repaceTimelineTasks,
} from '../services/decisionEngine';
import { generateFallbackPlan } from '../services/fallbackPlanner';
import { generateAIEventPlan } from '../services/aiPlanner';
import { INITIAL_EVENTS } from '../data/sampleEvents';
import { formatCurrency } from '../utils/formatters';

export interface ScenarioInput {
  vendorId?: string;
  vendorPriceSpikePercent?: number;
  guestDelta?: number;
  dateShiftDays?: number;
  newVenuePreference?: VenuePreference;
  budgetDeltaPercent?: number;
  cancelVendorId?: string;
  scenarioName?: string;
}

export type NavigationTab =
  | 'dashboard'
  | 'setup'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'ideas'
  | 'guests'
  | 'schedule'
  | 'ai';

export type SyncStatus = 'off' | 'loading' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

export interface UseEventPlanOptions {
  /** When true, plans are loaded from / saved to the signed-in user's cloud account. */
  cloudSync?: boolean;
  /** Called when the server says the session is no longer valid. */
  onSessionExpired?: () => void;
  /** When false, fresh accounts start with an empty database. Defaults to false if cloudSync is true. */
  fallbackToSample?: boolean;
}

export function computePlanChangeDiff(prev: EventPlan, updated: EventPlan): PlanChangeDiff | null {
  const details: string[] = [];
  const prevSummary = calculateBudgetSummary(prev.totalBudget, prev.budgetItems, prev.contingencyRate, prev.guestCount);
  const updatedSummary = calculateBudgetSummary(updated.totalBudget, updated.budgetItems, updated.contingencyRate, updated.guestCount);

  let utilizationChange: PlanChangeDiff['utilizationChange'] | undefined;
  if (Math.abs(prevSummary.utilizationPercentage - updatedSummary.utilizationPercentage) >= 0.1) {
    utilizationChange = {
      from: prevSummary.utilizationPercentage,
      to: updatedSummary.utilizationPercentage,
    };
    details.push(`Utilization ${prevSummary.utilizationPercentage}% → ${updatedSummary.utilizationPercentage}%`);
  }

  let budgetChange: PlanChangeDiff['budgetChange'] | undefined;
  if (prev.totalBudget !== updated.totalBudget) {
    budgetChange = {
      from: prev.totalBudget,
      to: updated.totalBudget,
      diff: updated.totalBudget - prev.totalBudget,
    };
    details.push(`Budget ${formatCurrency(prev.totalBudget)} → ${formatCurrency(updated.totalBudget)}`);
  }

  let guestChange: PlanChangeDiff['guestChange'] | undefined;
  if (prev.guestCount !== updated.guestCount) {
    guestChange = {
      from: prev.guestCount,
      to: updated.guestCount,
      diff: updated.guestCount - prev.guestCount,
    };
    details.push(`Guests ${prev.guestCount} → ${updated.guestCount} (${updated.guestCount > prev.guestCount ? '+' : ''}${updated.guestCount - prev.guestCount})`);
  }

  if (prev.eventDate !== updated.eventDate) {
    details.push(`Date shifted ${prev.eventDate} → ${updated.eventDate}`);
  }

  if (prev.venuePreference !== updated.venuePreference) {
    details.push(`Venue ${prev.venuePreference} → ${updated.venuePreference}`);
  }

  if (!prevSummary.isOverBudget && updatedSummary.isOverBudget) {
    const overage = updatedSummary.totalEstimated - updatedSummary.totalBudget;
    details.push(`New alert: over budget by ${formatCurrency(overage)}`);
  }

  const prevInsightIds = new Set((prev.decisionInsights || []).map((i) => i.id));
  const newInsights = (updated.decisionInsights || []).filter(
    (i) => !prevInsightIds.has(i.id) && (i.type === 'warning' || i.type === 'action_required')
  );
  if (newInsights.length > 0) {
    details.push(`${newInsights.length} new alert${newInsights.length > 1 ? 's' : ''}: ${newInsights.map((i) => i.title).join(', ')}`);
  }

  if (details.length === 0) return null;

  return {
    timestamp: new Date().toLocaleTimeString(),
    summary: details[0] || 'Plan parameters modified',
    details,
    utilizationChange,
    budgetChange,
    guestChange,
    newAlertsCount: newInsights.length,
    newAlertTitles: newInsights.map((i) => i.title),
  };
}

export function useEventPlan(options: UseEventPlanOptions = {}) {
  const { cloudSync = false, onSessionExpired } = options;
  // Signed-in accounts never start from this browser's shared localStorage or the sample events:
  // the cloud account is the only source of truth, so a new user can't inherit someone else's
  // (or the demo's) plans. Guests / demo keep the localStorage + sample-event behaviour.
  const [events, setEvents] = useState<EventPlan[]>(() => (cloudSync ? [] : loadSavedEvents()));
  const [activeEventId, setActiveEventId] = useState<string>(() => {
    if (cloudSync) return '';
    const savedId = loadActiveEventId();
    return savedId || 'default-1';
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(() => getStorageError());
  const [lastChangeDiff, setLastChangeDiff] = useState<PlanChangeDiff | null>(null);
  const clearLastChangeDiff = useCallback(() => setLastChangeDiff(null), []);

  // Subscribe to storage quota errors
  useEffect(() => {
    return subscribeStorageError(setStorageError);
  }, []);

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Debounced synchronization of events to localStorage (400ms trailing).
  // Skipped for signed-in accounts: their plans live in the cloud, and a shared browser key would leak
  // them to whoever opens the app next on this device.
  useEffect(() => {
    if (cloudSync || events.length === 0) return;

    const timer = setTimeout(() => {
      saveEvents(eventsRef.current);
    }, 400);

    return () => clearTimeout(timer);
  }, [events, cloudSync]);

  // Immediate flush on pagehide, visibilitychange, or window unload
  useEffect(() => {
    if (cloudSync) return;
    const flush = () => {
      if (eventsRef.current.length > 0) {
        saveEvents(eventsRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [cloudSync]);

  // Synchronize active ID (guests only; accounts store it in the cloud document)
  useEffect(() => {
    if (!cloudSync && activeEventId) {
      saveActiveEventId(activeEventId);
    }
  }, [activeEventId, cloudSync]);

  // ---------------------------------------------------------------------------
  // Cloud sync (signed-in accounts only). The cloud document is the single source of truth.
  // ---------------------------------------------------------------------------
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync ? 'loading' : 'off');
  // 'idle' for guests; for accounts: loading the plans -> ready (may be empty for a brand-new account) or error.
  const [accountLoad, setAccountLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>(cloudSync ? 'loading' : 'idle');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const remoteVersionRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const activeIdRef = useRef(activeEventId);
  const conflictDocRef = useRef<RemoteEventsDoc | null>(null);
  const expiredRef = useRef(onSessionExpired);
  useEffect(() => {
    activeIdRef.current = activeEventId;
    expiredRef.current = onSessionExpired;
  }, [activeEventId, onSessionExpired]);

  const applyRemote = useCallback((doc: RemoteEventsDoc) => {
    const valid = doc.events.filter((e): e is EventPlan => isValidEventPlan(e));
    if (valid.length === 0) {
      setEvents([]);
      setActiveEventId('');
      return false;
    }
    setEvents(valid);
    setActiveEventId(doc.activeId && valid.some((e) => e.id === doc.activeId) ? doc.activeId : valid[0].id);
    return true;
  }, []);

  const pushToCloud = useCallback(
    async (force = false) => {
      const payload = eventsRef.current.filter((e) => isValidEventPlan(e)).map(sanitizeEventForStorage);
      if (payload.length === 0 && !force) return;
      setSyncStatus('saving');
      const res = await eventsApi.save({
        events: payload,
        activeId: activeIdRef.current || (payload[0]?.id ?? null),
        baseUpdatedAt: remoteVersionRef.current,
        force,
      });
      if (res.ok) {
        remoteVersionRef.current = res.updatedAt;
        setSyncStatus('saved');
      } else if (res.status === 401) {
        expiredRef.current?.();
      } else if (res.status === 409) {
        const doc = res as unknown as RemoteEventsDoc;
        conflictDocRef.current = { events: doc.events ?? [], activeId: doc.activeId ?? null, updatedAt: doc.updatedAt ?? 0 };
        setSyncStatus('conflict');
      } else {
        setSyncStatus(res.code === 'network' ? 'offline' : 'error');
      }
    },
    []
  );

  // Initial load: pull the account's plans. A brand-new account is simply empty: it is NOT seeded with
  // sample events or whatever happens to be stored on this device.
  useEffect(() => {
    if (!cloudSync) return;
    let cancelled = false;
    void (async () => {
      const res = await eventsApi.load();
      if (cancelled) return;
      if (!res.ok) {
        if (res.status === 401) expiredRef.current?.();
        setSyncStatus(res.code === 'network' ? 'offline' : 'error');
        setAccountLoad('error');
        return;
      }
      remoteVersionRef.current = res.updatedAt;
      hydratedRef.current = true;
      if (res.events.length > 0 && applyRemote(res)) {
        setSyncStatus('saved');
      } else {
        setEvents([]);
        setActiveEventId('');
        setSyncStatus('saved');
      }
      setAccountLoad('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudSync, applyRemote, loadAttempt]);

  const reloadAccount = useCallback(() => {
    setAccountLoad('loading');
    setSyncStatus('loading');
    setLoadAttempt((n) => n + 1);
  }, []);

  // Debounced upload on every change after the initial load.
  useEffect(() => {
    if (!cloudSync || !hydratedRef.current || events.length === 0) return;
    const timer = setTimeout(() => {
      void pushToCloud();
    }, 1500);
    return () => clearTimeout(timer);
  }, [cloudSync, events, activeEventId, pushToCloud]);

  // Best-effort flush when the tab is hidden.
  useEffect(() => {
    if (!cloudSync) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && hydratedRef.current) void pushToCloud();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [cloudSync, pushToCloud]);

  const resolveSyncConflict = useCallback(
    async (keep: 'cloud' | 'device') => {
      const remote = conflictDocRef.current;
      conflictDocRef.current = null;
      if (keep === 'cloud' && remote) {
        remoteVersionRef.current = remote.updatedAt;
        if (applyRemote(remote)) setSyncStatus('saved');
      } else {
        if (remote) remoteVersionRef.current = remote.updatedAt;
        await pushToCloud(true);
      }
    },
    [applyRemote, pushToCloud]
  );

  const retrySync = useCallback(() => {
    if (cloudSync && hydratedRef.current) void pushToCloud();
  }, [cloudSync, pushToCloud]);

  // Find active plan
  const activeEvent: EventPlan | null = useMemo(() => {
    if (events.length === 0) return null;
    const found = events.find((e) => e.id === activeEventId);
    return found || events[0] || null;
  }, [events, activeEventId]);

  // Computed budget summary
  const budgetSummary = useMemo(() => {
    const summary = calculateBudgetSummary(
      activeEvent?.totalBudget ?? 0,
      activeEvent?.budgetItems ?? [],
      activeEvent?.contingencyRate ?? 0.1
    );
    summary.perGuestCost =
      activeEvent && activeEvent.guestCount > 0 ? Math.round(summary.totalEstimated / activeEvent.guestCount) : 0;
    return summary;
  }, [activeEvent]);

  // Computed timeline audit
  const timelineAudit = useMemo(() => {
    return auditTimelineTasks(activeEvent?.tasks ?? []);
  }, [activeEvent?.tasks]);

  // Memoized decision rules selector - avoids re-evaluating unchanged rules
  const activeInsights = useMemo(() => {
    if (!activeEvent) return { insights: [], missingPrompts: [] };
    if (activeEvent.decisionInsights && activeEvent.missingInfoPrompts) {
      return {
        insights: activeEvent.decisionInsights,
        missingPrompts: activeEvent.missingInfoPrompts,
      };
    }
    const { insights, missingPrompts } = evaluateDecisionRules(activeEvent);
    return { insights, missingPrompts };
  }, [activeEvent]);

  // Mutator helper that updates the active event
  const updateActiveEvent = useCallback(
    (updater: (prev: EventPlan) => EventPlan) => {
      if (!activeEvent) return;
      setEvents((prevEvents) =>
        prevEvents.map((evt) => {
          if (evt.id === activeEvent.id) {
            const updated = updater(evt);
            const { insights, missingPrompts } = evaluateDecisionRules(updated);
            const fullyUpdated: EventPlan = {
              ...updated,
              decisionInsights: insights,
              missingInfoPrompts: missingPrompts,
            };
            const diff = computePlanChangeDiff(evt, fullyUpdated);
            if (diff) {
              setLastChangeDiff(diff);
            }
            return fullyUpdated;
          }
          return evt;
        })
      );
    },
    [activeEvent]
  );

  // Event Switcher
  const selectEvent = useCallback((id: string) => {
    setActiveEventId(id);
  }, []);

  // Create new event
  const createNewEvent = useCallback(
    async (
      input: {
        title?: string;
        eventType: EventType;
        eventDate: string;
        city: string;
        venueName?: string;
        guestCount: number;
        totalBudget: number;
        venuePreference?: EventPlan['venuePreference'];
        foodPreference?: EventPlan['foodPreference'];
        theme?: string;
        priorities?: EventPlan['priorities'];
        accessibilityNeeds?: string[];
        culturalTraditions?: string;
        specialNotes?: string;
        contingencyRate?: number;
      },
      useAI = false,
      apiKey?: string
    ) => {
      setIsGenerating(true);
      setGenerationError(null);

      try {
        let newPlan: EventPlan;
        if (useAI) {
          newPlan = await generateAIEventPlan({ ...input, customApiKey: apiKey });
        } else {
          newPlan = generateFallbackPlan(input);
        }

        setEvents((prev) => [newPlan, ...prev]);
        setActiveEventId(newPlan.id);
        setActiveTab('dashboard');
        return newPlan;
      } catch (err) {
        console.error('Plan generation failed, using rule engine', err);
        const fallback = generateFallbackPlan(input);
        setEvents((prev) => [fallback, ...prev]);
        setActiveEventId(fallback.id);
        setActiveTab('dashboard');
        return fallback;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Update Event Details (triggers recalculation of per-guest costs, etc.)
  const updateEventParameters = useCallback(
    (updates: Partial<EventPlan>) => {
      updateActiveEvent((prev) => {
        const next = { ...prev, ...updates };

        // If guest count changed, adjust per-guest item notes or estimates if flagged
        if (updates.guestCount && updates.guestCount !== prev.guestCount) {
          const ratio = updates.guestCount / Math.max(1, prev.guestCount);
          next.budgetItems = next.budgetItems.map((item) => {
            if (item.isPerGuest) {
              return {
                ...item,
                estimatedCost: Math.round(item.estimatedCost * ratio),
                notes: `Auto-scaled for ${updates.guestCount} guests.`,
              };
            }
            return item;
          });
        }

        return next;
      });
    },
    [updateActiveEvent]
  );

  // Budget Actions
  const addBudgetItem = useCallback(
    (item: Omit<BudgetItem, 'id'>) => {
      const newItem: BudgetItem = {
        ...item,
        id: 'b-custom-' + Date.now(),
        estimatedCost: Math.max(0, isNaN(item.estimatedCost) ? 0 : item.estimatedCost),
      };
      updateActiveEvent((prev) => ({
        ...prev,
        budgetItems: [...prev.budgetItems, newItem],
      }));
    },
    [updateActiveEvent]
  );

  const updateBudgetItem = useCallback(
    (id: string, updates: Partial<BudgetItem>) => {
      updateActiveEvent((prev) => ({
        ...prev,
        budgetItems: prev.budgetItems.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates,
                estimatedCost:
                  updates.estimatedCost !== undefined
                    ? Math.max(0, isNaN(updates.estimatedCost) ? 0 : updates.estimatedCost)
                    : item.estimatedCost,
              }
            : item
        ),
      }));
    },
    [updateActiveEvent]
  );

  const deleteBudgetItem = useCallback(
    (id: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        budgetItems: prev.budgetItems.filter((item) => item.id !== id),
      }));
    },
    [updateActiveEvent]
  );

  const updateContingencyRate = useCallback(
    (rate: number) => {
      const safeRate = Math.max(0, Math.min(0.5, isNaN(rate) ? 0.10 : rate));
      updateActiveEvent((prev) => ({
        ...prev,
        contingencyRate: safeRate,
      }));
    },
    [updateActiveEvent]
  );

  // Timeline / Task Actions
  const toggleTask = useCallback(
    (id: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        ),
      }));
    },
    [updateActiveEvent]
  );

  const addTask = useCallback(
    (task: Omit<TaskItem, 'id'>) => {
      const newTask: TaskItem = {
        ...task,
        id: 't-custom-' + Date.now(),
      };
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
      }));
    },
    [updateActiveEvent]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<TaskItem>) => {
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },
    [updateActiveEvent]
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    },
    [updateActiveEvent]
  );

  // Vendor Actions
  const updateVendor = useCallback(
    (id: string, updates: Partial<VendorItem>) => {
      updateActiveEvent((prev) => ({
        ...prev,
        vendors: prev.vendors.map((v) =>
          v.id === id
            ? {
                ...v,
                ...updates,
                estimatedCost:
                  updates.estimatedCost !== undefined
                    ? Math.max(0, isNaN(updates.estimatedCost) ? 0 : updates.estimatedCost)
                    : v.estimatedCost,
              }
            : v
        ),
      }));
    },
    [updateActiveEvent]
  );

  const addVendor = useCallback(
    (vendor: Omit<VendorItem, 'id'>) => {
      const newVendor: VendorItem = {
        ...vendor,
        id: 'v-custom-' + Date.now(),
      };
      updateActiveEvent((prev) => ({
        ...prev,
        vendors: [...prev.vendors, newVendor],
      }));
    },
    [updateActiveEvent]
  );

  // Guest Actions
  const addGuest = useCallback(
    (guest: Omit<GuestItem, 'id'>) => {
      const newGuest: GuestItem = {
        ...guest,
        id: 'g-custom-' + Date.now(),
      };
      updateActiveEvent((prev) => ({
        ...prev,
        guests: [...(prev.guests || []), newGuest],
      }));
    },
    [updateActiveEvent]
  );

  const updateGuest = useCallback(
    (id: string, updates: Partial<GuestItem>) => {
      updateActiveEvent((prev) => ({
        ...prev,
        guests: (prev.guests || []).map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));
    },
    [updateActiveEvent]
  );

  const deleteGuest = useCallback(
    (id: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        guests: (prev.guests || []).filter((g) => g.id !== id),
      }));
    },
    [updateActiveEvent]
  );

  // Schedule Actions
  const addScheduleItem = useCallback(
    (item: Omit<ScheduleItem, 'id'>) => {
      const newItem: ScheduleItem = {
        ...item,
        id: 's-custom-' + Date.now(),
      };
      updateActiveEvent((prev) => ({
        ...prev,
        schedule: [...(prev.schedule || []), newItem],
      }));
    },
    [updateActiveEvent]
  );

  const updateScheduleItem = useCallback(
    (id: string, updates: Partial<ScheduleItem>) => {
      updateActiveEvent((prev) => ({
        ...prev,
        schedule: (prev.schedule || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateActiveEvent]
  );

  const deleteScheduleItem = useCallback(
    (id: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        schedule: (prev.schedule || []).filter((s) => s.id !== id),
      }));
    },
    [updateActiveEvent]
  );

  // -------------------------------------------------------------------------
  // CORE CHANGE-HANDLING LOOP: Trade-off Execution & Undo Log
  // -------------------------------------------------------------------------

  const applyTradeOff = useCallback(
    (tradeOff: TradeOffOption, title?: string) => {
      updateActiveEvent((prev) => {
        const previousSnapshot = {
          totalBudget: prev.totalBudget,
          guestCount: prev.guestCount,
          eventDate: prev.eventDate,
          venuePreference: prev.venuePreference,
          budgetItems: JSON.parse(JSON.stringify(prev.budgetItems)),
          tasks: JSON.parse(JSON.stringify(prev.tasks)),
          vendors: JSON.parse(JSON.stringify(prev.vendors)),
        };

        let updatedBudget = prev.totalBudget;
        let updatedGuests = prev.guestCount;
        let updatedVenue = prev.venuePreference;
        let updatedDate = prev.eventDate;
        let updatedBudgetItems = [...prev.budgetItems];
        let updatedTasks = [...prev.tasks];
        let updatedVendors = [...prev.vendors];

        const p = tradeOff.payload || {};

        switch (tradeOff.actionType) {
          case 'reduce_budget_item': {
            if (p.itemId) {
              updatedBudgetItems = updatedBudgetItems.map((item) => {
                if (item.id === p.itemId) {
                  const cut = Number(p.amount || 0);
                  const newCost = Math.max(0, item.estimatedCost - cut);
                  return { ...item, estimatedCost: newCost };
                }
                return item;
              });
            } else if (p.category) {
              updatedBudgetItems = updatedBudgetItems.map((item) => {
                if (item.category === p.category) {
                  const cut = Number(p.amount || 0);
                  const newCost = Math.max(0, item.estimatedCost - cut);
                  return { ...item, estimatedCost: newCost };
                }
                return item;
              });
            }
            break;
          }

          case 'increase_budget': {
            if (p.amount) {
              updatedBudget = Math.max(0, updatedBudget + Number(p.amount));
            }
            break;
          }

          case 'adjust_guest_count': {
            if (p.newGuestCount !== undefined) {
              const nextGuestCount = Math.max(1, Number(p.newGuestCount));
              const ratio = nextGuestCount / Math.max(1, prev.guestCount);
              updatedGuests = nextGuestCount;
              updatedBudgetItems = updatedBudgetItems.map((item) => {
                if (item.isPerGuest) {
                  return {
                    ...item,
                    estimatedCost: Math.round(item.estimatedCost * ratio),
                    notes: `Auto-scaled for ${nextGuestCount} guests.`,
                  };
                }
                return item;
              });
            }
            break;
          }

          case 'add_budget_item': {
            const newItem: BudgetItem = {
              id: 'b-tradeoff-' + Date.now(),
              name: String(p.name || 'New Budget Item'),
              category: (p.category as BudgetItem['category']) || 'other',
              estimatedCost: Math.max(0, Number(p.estimatedCost || 0)),
              priority: (p.priority as BudgetItem['priority']) || 'essential',
              notes: p.notes ? String(p.notes) : 'Added via decision trade-off action.',
            };
            updatedBudgetItems.push(newItem);
            break;
          }

          case 'update_vendor_status': {
            if (p.vendorId) {
              updatedVendors = updatedVendors.map((v) =>
                v.id === p.vendorId ? { ...v, status: (p.status as VendorItem['status']) || 'shortlisted' } : v
              );
            }
            break;
          }

          case 'update_venue': {
            if (p.venuePreference) {
              updatedVenue = p.venuePreference as VenuePreference;
            }
            break;
          }

          case 'add_task': {
            const newTask: TaskItem = {
              id: 't-tradeoff-' + Date.now(),
              title: String(p.title || p.taskTitle || 'New Action Task'),
              category: (p.category as TaskItem['category']) || 'final',
              dueDate: p.dueDate ? String(p.dueDate) : prev.eventDate,
              completed: false,
              priority: (p.priority as TaskItem['priority']) || 'high',
              notes: p.notes ? String(p.notes) : 'Generated from decision engine trade-off.',
            };
            updatedTasks.push(newTask);
            break;
          }

          case 'repace_timeline': {
            const targetDate = p.newDate ? String(p.newDate) : prev.eventDate;
            updatedTasks = repaceTimelineTasks(updatedTasks, prev.eventDate, targetDate);
            if (p.newDate) {
              updatedDate = targetDate;
            }
            break;
          }

          case 'apply_dietary_counter': {
            const counterCost = Number(p.cost || 25000);
            const counterItem: BudgetItem = {
              id: 'b-jain-counter-' + Date.now(),
              name: String(p.name || 'Dedicated Pure Veg & Jain Kitchen Counter Isolation'),
              category: 'catering',
              estimatedCost: counterCost,
              priority: 'essential',
              notes: 'Isolated preparation station, separate copper chafers, and distinct ladles.',
            };
            const counterTask: TaskItem = {
              id: 't-jain-audit-' + Date.now(),
              title: 'Audit Pure Veg & Jain Kitchen Separation with Head Chef',
              category: 'catering',
              dueDate: prev.eventDate,
              completed: false,
              priority: 'urgent',
              notes: 'Verify separate ladles, no root vegetables, and distinct serving line.',
            };
            updatedBudgetItems.push(counterItem);
            updatedTasks.push(counterTask);
            break;
          }
        }

        const appliedSnapshot = {
          totalBudget: updatedBudget,
          guestCount: updatedGuests,
          eventDate: updatedDate,
          venuePreference: updatedVenue,
          budgetItems: JSON.parse(JSON.stringify(updatedBudgetItems)),
          tasks: JSON.parse(JSON.stringify(updatedTasks)),
          vendors: JSON.parse(JSON.stringify(updatedVendors)),
        };

        const logEntry: PlanChangeLogEntry = {
          id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toISOString(),
          changeTitle: title || tradeOff.label,
          description: tradeOff.description,
          tradeOffApplied: tradeOff.id,
          previousSnapshot,
          appliedSnapshot,
        };

        const changeLog = [logEntry, ...(prev.changeLog || [])].slice(0, 20);

        return {
          ...prev,
          totalBudget: updatedBudget,
          guestCount: updatedGuests,
          eventDate: updatedDate,
          venuePreference: updatedVenue,
          budgetItems: updatedBudgetItems,
          tasks: updatedTasks,
          vendors: updatedVendors,
          changeLog,
        };
      });
    },
    [updateActiveEvent]
  );

  const undoLastChange = useCallback(() => {
    updateActiveEvent((prev) => {
      if (!prev.changeLog || prev.changeLog.length === 0) return prev;
      const [latest, ...remainingLog] = prev.changeLog;
      const snap = latest.previousSnapshot;

      return {
        ...prev,
        totalBudget: snap.totalBudget,
        guestCount: snap.guestCount,
        eventDate: snap.eventDate,
        venuePreference: snap.venuePreference,
        budgetItems: snap.budgetItems,
        tasks: snap.tasks,
        vendors: snap.vendors,
        changeLog: remainingLog,
      };
    });
  }, [updateActiveEvent]);

  const applyScenarioChange = useCallback(
    (scenario: ScenarioInput) => {
      updateActiveEvent((prev) => {
        const previousSnapshot = {
          totalBudget: prev.totalBudget,
          guestCount: prev.guestCount,
          eventDate: prev.eventDate,
          venuePreference: prev.venuePreference,
          budgetItems: JSON.parse(JSON.stringify(prev.budgetItems)),
          tasks: JSON.parse(JSON.stringify(prev.tasks)),
          vendors: JSON.parse(JSON.stringify(prev.vendors)),
        };

        let updatedBudget = prev.totalBudget;
        let updatedGuests = prev.guestCount;
        let updatedVenue = prev.venuePreference;
        let updatedDate = prev.eventDate;
        let updatedBudgetItems = [...prev.budgetItems];
        let updatedTasks = [...prev.tasks];
        let updatedVendors = [...prev.vendors];
        const changeDescriptions: string[] = [];

        // 1. Vendor price spike
        if (scenario.vendorPriceSpikePercent && scenario.vendorPriceSpikePercent > 0) {
          const targetCategory = scenario.vendorId
            ? prev.vendors.find((v) => v.id === scenario.vendorId)?.category
            : 'catering';
          updatedBudgetItems = updatedBudgetItems.map((item) => {
            if (item.category === targetCategory || (!targetCategory && item.category === 'catering')) {
              const spikeAmount = Math.round(item.estimatedCost * (scenario.vendorPriceSpikePercent! / 100));
              const newActual = (item.actualCost || item.estimatedCost) + spikeAmount;
              changeDescriptions.push(
                `${item.name} quote spiked by ${scenario.vendorPriceSpikePercent}% (+${formatCurrency(spikeAmount)})`
              );
              return {
                ...item,
                actualCost: newActual,
                notes: `${item.notes ? item.notes + ' ' : ''}Spiked by ${scenario.vendorPriceSpikePercent}%.`,
              };
            }
            return item;
          });
        }

        // 2. Guest headcount delta
        if (scenario.guestDelta && scenario.guestDelta !== 0) {
          const nextGuests = Math.max(10, prev.guestCount + scenario.guestDelta);
          const ratio = nextGuests / Math.max(1, prev.guestCount);
          updatedGuests = nextGuests;
          changeDescriptions.push(
            `Guest count adjusted by ${scenario.guestDelta > 0 ? '+' : ''}${scenario.guestDelta} (now ${nextGuests})`
          );
          updatedBudgetItems = updatedBudgetItems.map((item) => {
            if (item.isPerGuest) {
              return {
                ...item,
                estimatedCost: Math.round(item.estimatedCost * ratio),
                notes: `Auto-scaled for ${nextGuests} guests.`,
              };
            }
            return item;
          });
        }

        // 3. Date shift
        if (scenario.dateShiftDays && scenario.dateShiftDays !== 0) {
          const curr = new Date(prev.eventDate);
          curr.setDate(curr.getDate() + scenario.dateShiftDays);
          const yyyy = curr.getFullYear();
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          const newDateStr = `${yyyy}-${mm}-${dd}`;
          updatedTasks = repaceTimelineTasks(updatedTasks, prev.eventDate, newDateStr);
          updatedDate = newDateStr;
          changeDescriptions.push(
            `Event date shifted by ${scenario.dateShiftDays > 0 ? '+' : ''}${scenario.dateShiftDays} days (now ${newDateStr}); timeline re-paced`
          );
        }

        // 4. Venue change
        if (scenario.newVenuePreference && scenario.newVenuePreference !== prev.venuePreference) {
          updatedVenue = scenario.newVenuePreference;
          changeDescriptions.push(`Venue layout changed from ${prev.venuePreference} to ${scenario.newVenuePreference}`);
        }

        // 5. Budget delta percent
        if (scenario.budgetDeltaPercent && scenario.budgetDeltaPercent !== 0) {
          const delta = Math.round(prev.totalBudget * (scenario.budgetDeltaPercent / 100));
          updatedBudget = Math.max(10000, prev.totalBudget + delta);
          changeDescriptions.push(
            `Budget adjusted by ${scenario.budgetDeltaPercent > 0 ? '+' : ''}${scenario.budgetDeltaPercent}% (${formatCurrency(delta)})`
          );
        }

        // 6. Vendor cancel
        if (scenario.cancelVendorId) {
          const targetV = updatedVendors.find((v) => v.id === scenario.cancelVendorId);
          if (targetV) {
            updatedVendors = updatedVendors.map((v) =>
              v.id === scenario.cancelVendorId ? { ...v, status: 'cancelled' as const } : v
            );
            changeDescriptions.push(`Vendor ${targetV.role} cancelled / marked unavailable`);
          }
        }

        const appliedSnapshot = {
          totalBudget: updatedBudget,
          guestCount: updatedGuests,
          eventDate: updatedDate,
          venuePreference: updatedVenue,
          budgetItems: JSON.parse(JSON.stringify(updatedBudgetItems)),
          tasks: JSON.parse(JSON.stringify(updatedTasks)),
          vendors: JSON.parse(JSON.stringify(updatedVendors)),
        };

        const logEntry: PlanChangeLogEntry = {
          id: 'scenario-' + Date.now(),
          timestamp: new Date().toISOString(),
          changeTitle: scenario.scenarioName || 'Simulated Scenario Change',
          description: changeDescriptions.join('; ') || 'Applied scenario parameters.',
          previousSnapshot,
          appliedSnapshot,
        };

        const changeLog = [logEntry, ...(prev.changeLog || [])].slice(0, 20);

        return {
          ...prev,
          totalBudget: updatedBudget,
          guestCount: updatedGuests,
          eventDate: updatedDate,
          venuePreference: updatedVenue,
          budgetItems: updatedBudgetItems,
          tasks: updatedTasks,
          vendors: updatedVendors,
          changeLog,
        };
      });
    },
    [updateActiveEvent]
  );

  const repaceTimeline = useCallback(
    (newDateStr: string) => {
      updateActiveEvent((prev) => {
        const repaced = repaceTimelineTasks(prev.tasks, prev.eventDate, newDateStr);
        return {
          ...prev,
          eventDate: newDateStr,
          tasks: repaced,
        };
      });
    },
    [updateActiveEvent]
  );

  // Regeneration without losing plan ID
  const regenerateRecommendations = useCallback(
    async (useAI = false, apiKey?: string) => {
      if (!activeEvent) return;
      setIsGenerating(true);
      setGenerationError(null);
      try {
        let freshPlan: EventPlan;
        if (useAI) {
          freshPlan = await generateAIEventPlan({
            ...activeEvent,
            customApiKey: apiKey,
          });
        } else {
          freshPlan = generateFallbackPlan(activeEvent);
        }

        updateActiveEvent((prev) => ({
          ...prev,
          ideas: freshPlan.ideas,
          plannerSource: freshPlan.plannerSource,
          lastGeneratedAt: new Date().toISOString(),
          generationExplanation: freshPlan.generationExplanation,
        }));
      } catch {
        setGenerationError('Failed to regenerate recommendations.');
      } finally {
        setIsGenerating(false);
      }
    },
    [activeEvent, updateActiveEvent]
  );

  // Delete event
  const deleteCurrentEvent = useCallback(() => {
    if (events.length <= 1) {
      if (cloudSync) {
        setEvents([]);
        setActiveEventId('');
      } else {
        setEvents(INITIAL_EVENTS);
        setActiveEventId(INITIAL_EVENTS[0].id);
      }
      return;
    }
    const remaining = events.filter((e) => e.id !== activeEvent?.id);
    setEvents(remaining);
    setActiveEventId(remaining[0].id);
  }, [events, activeEvent, cloudSync]);

  // Reset to default sample events
  const resetToDefaults = useCallback(() => {
    setEvents(INITIAL_EVENTS);
    setActiveEventId(INITIAL_EVENTS[0].id);
    setActiveTab('dashboard');
  }, []);

  // Clear all events (Option 3: Clean slate / wipe for account)
  const clearAllEvents = useCallback(async () => {
    setEvents([]);
    setActiveEventId('');
    if (cloudSync) {
      setSyncStatus('saving');
      const res = await eventsApi.save({
        events: [],
        activeId: null,
        baseUpdatedAt: remoteVersionRef.current,
        force: true,
      });
      if (res.ok) {
        remoteVersionRef.current = res.updatedAt;
        setSyncStatus('saved');
      }
    }
  }, [cloudSync]);

  // Load sample starter templates into account
  const loadSampleTemplates = useCallback(() => {
    setEvents(INITIAL_EVENTS);
    setActiveEventId(INITIAL_EVENTS[0].id);
    setActiveTab('dashboard');
  }, []);

  // Export
  const exportCurrentPlan = useCallback(() => {
    if (activeEvent) {
      exportPlanAsJson(activeEvent);
    }
  }, [activeEvent]);

  // Import JSON backup
  const importPlan = useCallback((jsonString: string): { success: boolean; error?: string } => {
    const result = importPlanFromJson(jsonString);
    if (!result.success || !result.plan) {
      return { success: false, error: result.error || 'Failed to parse plan file.' };
    }
    const importedPlan = result.plan;
    setEvents((prev) => [importedPlan, ...prev]);
    setActiveEventId(importedPlan.id);
    setActiveTab('dashboard');
    return { success: true };
  }, []);

  return {
    events,
    activeEvent,
    activeEventId,
    hasEvents: events.length > 0,
    activeTab,
    budgetSummary,
    timelineAudit,
    activeInsights,
    isGenerating,
    generationError,
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
    updateTask,
    deleteTask,
    updateVendor,
    addVendor,
    addGuest,
    updateGuest,
    deleteGuest,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    regenerateRecommendations,
    deleteCurrentEvent,
    resetToDefaults,
    clearAllEvents,
    loadSampleTemplates,
    exportCurrentPlan,
    importPlan,
    applyTradeOff,
    undoLastChange,
    applyScenarioChange,
    repaceTimeline,
    storageError,
    clearStorageError,
    syncStatus,
    accountLoad,
    reloadAccount,
    hasPlans: events.length > 0,
    resolveSyncConflict,
    retrySync,
    lastChangeDiff,
    clearLastChangeDiff,
  };
}
