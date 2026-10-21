import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  EventPlan,
  BudgetItem,
  TaskItem,
  VendorItem,
  EventType,
} from '../types/event';
import {
  loadSavedEvents,
  saveEvents,
  loadActiveEventId,
  saveActiveEventId,
  exportPlanAsJson,
} from '../services/storageService';
import { calculateBudgetSummary, evaluateDecisionRules, auditTimelineTasks } from '../services/decisionEngine';
import { generateFallbackPlan } from '../services/fallbackPlanner';
import { generateAIEventPlan } from '../services/aiPlanner';
import { INITIAL_EVENTS } from '../data/sampleEvents';

export type NavigationTab =
  | 'dashboard'
  | 'setup'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'ideas'
  | 'ai';

export function useEventPlan() {
  const [events, setEvents] = useState<EventPlan[]>(() => loadSavedEvents());
  const [activeEventId, setActiveEventId] = useState<string>(() => {
    const savedId = loadActiveEventId();
    if (savedId && events.some((e) => e.id === savedId)) {
      return savedId;
    }
    return events[0]?.id || 'default-1';
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Synchronize events state to localStorage whenever modified
  useEffect(() => {
    if (events.length > 0) {
      saveEvents(events);
    }
  }, [events]);

  // Synchronize active ID
  useEffect(() => {
    if (activeEventId) {
      saveActiveEventId(activeEventId);
    }
  }, [activeEventId]);

  // Find active plan
  const activeEvent = useMemo(() => {
    const found = events.find((e) => e.id === activeEventId);
    return found || events[0] || INITIAL_EVENTS[0];
  }, [events, activeEventId]);

  // Computed budget summary
  const budgetSummary = useMemo(() => {
    const summary = calculateBudgetSummary(
      activeEvent.totalBudget,
      activeEvent.budgetItems,
      activeEvent.contingencyRate
    );
    summary.perGuestCost =
      activeEvent.guestCount > 0 ? Math.round(summary.totalEstimated / activeEvent.guestCount) : 0;
    return summary;
  }, [activeEvent.totalBudget, activeEvent.budgetItems, activeEvent.contingencyRate, activeEvent.guestCount]);

  // Computed timeline audit
  const timelineAudit = useMemo(() => {
    return auditTimelineTasks(activeEvent.tasks);
  }, [activeEvent.tasks]);

  // Re-evaluate decision rules dynamically
  const activeInsights = useMemo(() => {
    const { insights, missingPrompts } = evaluateDecisionRules(activeEvent);
    return { insights, missingPrompts };
  }, [activeEvent]);

  // Mutator helper that updates the active event
  const updateActiveEvent = useCallback(
    (updater: (prev: EventPlan) => EventPlan) => {
      setEvents((prevEvents) =>
        prevEvents.map((evt) => {
          if (evt.id === activeEvent.id) {
            const updated = updater(evt);
            const { insights, missingPrompts } = evaluateDecisionRules(updated);
            return {
              ...updated,
              decisionInsights: insights,
              missingInfoPrompts: missingPrompts,
            };
          }
          return evt;
        })
      );
    },
    [activeEvent.id]
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

  // Regeneration without losing plan ID
  const regenerateRecommendations = useCallback(
    async (useAI = false, apiKey?: string) => {
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
      // If deleting the last event, reset to default sample
      setEvents(INITIAL_EVENTS);
      setActiveEventId(INITIAL_EVENTS[0].id);
      return;
    }
    const remaining = events.filter((e) => e.id !== activeEvent.id);
    setEvents(remaining);
    setActiveEventId(remaining[0].id);
  }, [events, activeEvent.id]);

  // Reset to default sample events
  const resetToDefaults = useCallback(() => {
    setEvents(INITIAL_EVENTS);
    setActiveEventId(INITIAL_EVENTS[0].id);
    setActiveTab('dashboard');
  }, []);

  // Export
  const exportCurrentPlan = useCallback(() => {
    exportPlanAsJson(activeEvent);
  }, [activeEvent]);

  return {
    events,
    activeEvent,
    activeEventId,
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
    regenerateRecommendations,
    deleteCurrentEvent,
    resetToDefaults,
    exportCurrentPlan,
  };
}
