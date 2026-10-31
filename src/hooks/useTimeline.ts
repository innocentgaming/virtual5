import { useCallback } from 'react';
import type { EventPlan, TaskItem, ScheduleItem } from '../types/event';
import { repaceTimelineTasks } from '../services/decisionEngine';

export function useTimeline(
  activeEvent: EventPlan | undefined,
  updateEvent: (updated: EventPlan) => void
) {
  const addTask = useCallback(
    (task: Omit<TaskItem, 'id'>) => {
      if (!activeEvent) return;
      const newTask: TaskItem = {
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      updateEvent({
        ...activeEvent,
        tasks: [...activeEvent.tasks, newTask],
      });
    },
    [activeEvent, updateEvent]
  );

  const updateTask = useCallback(
    (task: TaskItem) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        tasks: activeEvent.tasks.map((t) => (t.id === task.id ? task : t)),
      });
    },
    [activeEvent, updateEvent]
  );

  const deleteTask = useCallback(
    (id: string) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        tasks: activeEvent.tasks.filter((t) => t.id !== id),
      });
    },
    [activeEvent, updateEvent]
  );

  const toggleTask = useCallback(
    (id: string) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        tasks: activeEvent.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      });
    },
    [activeEvent, updateEvent]
  );

  const addScheduleItem = useCallback(
    (item: Omit<ScheduleItem, 'id'>) => {
      if (!activeEvent) return;
      const newItem: ScheduleItem = {
        ...item,
        id: `schedule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      updateEvent({
        ...activeEvent,
        schedule: [...(activeEvent.schedule || []), newItem],
      });
    },
    [activeEvent, updateEvent]
  );

  const updateScheduleItem = useCallback(
    (item: ScheduleItem) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        schedule: (activeEvent.schedule || []).map((s) => (s.id === item.id ? item : s)),
      });
    },
    [activeEvent, updateEvent]
  );

  const deleteScheduleItem = useCallback(
    (id: string) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        schedule: (activeEvent.schedule || []).filter((s) => s.id !== id),
      });
    },
    [activeEvent, updateEvent]
  );

  const repaceTimeline = useCallback(
    (newDateStr: string) => {
      if (!activeEvent) return;
      const updatedTasks = repaceTimelineTasks(activeEvent.tasks, activeEvent.eventDate, newDateStr);
      updateEvent({
        ...activeEvent,
        eventDate: newDateStr,
        tasks: updatedTasks,
      });
    },
    [activeEvent, updateEvent]
  );

  return {
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    repaceTimeline,
  };
}

