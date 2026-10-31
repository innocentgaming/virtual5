import type { TaskItem } from '../types/event';
import { SHORT_NOTICE_DAYS_CRITICAL } from '../constants';

export interface BlockedTaskAudit {
  blockedTaskId: string;
  blockedTaskTitle: string;
  prerequisiteId: string;
  prerequisiteTitle: string;
}

/**
 * Detects tasks that are blocked because a prerequisite task is overdue and incomplete.
 *
 * @param tasks - List of task items to analyze
 * @param currentDateStr - Optional reference anchor date string
 * @returns Array of blocked task audit descriptors
 */
export function detectBlockedTasks(tasks: TaskItem[], currentDateStr?: string): BlockedTaskAudit[] {
  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const blockedList: BlockedTaskAudit[] = [];

  for (const task of tasks) {
    if (task.completed || !task.dependencies || task.dependencies.length === 0) continue;

    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId);
      if (depTask && !depTask.completed) {
        const depDate = new Date(depTask.dueDate);
        depDate.setHours(0, 0, 0, 0);
        // If prerequisite is overdue or due on/after the dependent task
        if (depDate.getTime() < now.getTime() || depDate.getTime() >= new Date(task.dueDate).getTime()) {
          blockedList.push({
            blockedTaskId: task.id,
            blockedTaskTitle: task.title,
            prerequisiteId: depTask.id,
            prerequisiteTitle: depTask.title,
          });
        }
      }
    }
  }

  return blockedList;
}

/**
 * Recomputes task due dates when an event date shifts earlier or later.
 * Compresses timelines during short-notice windows (<14 or <21 days) and respects task dependencies.
 *
 * @param tasks - Existing task items
 * @param oldDateStr - Previous event target date
 * @param newDateStr - Updated event target date
 * @param currentDateStr - Optional reference anchor date string
 * @returns Re-paced task items with adjusted due dates
 */
export function repaceTimelineTasks(
  tasks: TaskItem[],
  oldDateStr: string,
  newDateStr: string,
  currentDateStr?: string
): TaskItem[] {
  if (!tasks || tasks.length === 0) return [];

  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const targetDate = new Date(newDateStr);
  targetDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const oldTargetDate = new Date(oldDateStr);
  oldTargetDate.setHours(0, 0, 0, 0);

  return tasks.map((task) => {
    // Keep already completed tasks on their historical completion date
    if (task.completed) {
      return task;
    }

    // Past or today event: clamp all to today
    if (daysRemaining <= 0) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
    }

    // Short-notice triage window (< 14 days) - compress by priority
    if (daysRemaining <= SHORT_NOTICE_DAYS_CRITICAL) {
      let offsetDaysFromNow = 1;
      if (task.priority === 'urgent') offsetDaysFromNow = Math.min(daysRemaining, 2);
      else if (task.priority === 'high') offsetDaysFromNow = Math.min(daysRemaining, Math.max(2, Math.round(daysRemaining * 0.4)));
      else if (task.priority === 'medium') offsetDaysFromNow = Math.min(daysRemaining, Math.max(3, Math.round(daysRemaining * 0.7)));
      else offsetDaysFromNow = Math.min(daysRemaining, Math.max(4, Math.round(daysRemaining * 0.9)));

      const newDate = new Date(now.getTime() + offsetDaysFromNow * 86400000);
      const yyyy = newDate.getFullYear();
      const mm = String(newDate.getMonth() + 1).padStart(2, '0');
      const dd = String(newDate.getDate()).padStart(2, '0');
      return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
    }

    // Standard proportional re-pacing
    const taskCurrentDate = new Date(task.dueDate);
    taskCurrentDate.setHours(0, 0, 0, 0);
    const oldLeadDays = Math.max(0, Math.round((oldTargetDate.getTime() - taskCurrentDate.getTime()) / 86400000));
    const oldTotalSpan = Math.max(1, Math.round((oldTargetDate.getTime() - now.getTime()) / 86400000));
    const ratio = Math.max(0.05, Math.min(1.0, oldLeadDays / oldTotalSpan));

    const newLeadDays = Math.max(1, Math.round(daysRemaining * ratio));
    const computedTaskDate = new Date(targetDate.getTime() - newLeadDays * 86400000);

    // Ensure due date is not in the past relative to now
    if (computedTaskDate.getTime() < now.getTime()) {
      computedTaskDate.setTime(now.getTime());
    }

    const yyyy = computedTaskDate.getFullYear();
    const mm = String(computedTaskDate.getMonth() + 1).padStart(2, '0');
    const dd = String(computedTaskDate.getDate()).padStart(2, '0');
    return { ...task, dueDate: `${yyyy}-${mm}-${dd}` };
  });
}

/**
 * Audits timeline tasks for overdue, upcoming, and blocked milestone states.
 *
 * @param tasks - List of task items to audit
 * @param currentDateStr - Optional reference anchor date string
 * @returns Full breakdown with overdue, upcoming, and blocked tallies
 */
export function auditTimelineTasks(
  tasks: TaskItem[],
  currentDateStr?: string
): {
  overdueCount: number;
  upcomingCount: number;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  blockedCount: number;
  tasksWithStatus: (TaskItem & { isOverdue: boolean; isBlocked?: boolean; blockedByNames?: string[] })[];
} {
  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  now.setHours(0, 0, 0, 0);

  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  let overdueCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;
  let blockedCount = 0;

  const tasksWithStatus = tasks.map((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

    // Check if blocked by uncompleted prerequisite
    const blockedByNames: string[] = [];
    if (!task.completed && task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const dep = taskMap.get(depId);
        if (dep && !dep.completed) {
          const depDate = new Date(dep.dueDate);
          depDate.setHours(0, 0, 0, 0);
          if (depDate.getTime() < now.getTime() || depDate.getTime() >= taskDate.getTime()) {
            blockedByNames.push(dep.title);
          }
        }
      }
    }

    const isBlocked = blockedByNames.length > 0;
    if (isBlocked) {
      blockedCount++;
    }

    if (task.completed) {
      completedCount++;
    } else if (isOverdue) {
      overdueCount++;
    } else {
      upcomingCount++;
    }

    return {
      ...task,
      isOverdue,
      isBlocked,
      blockedByNames: blockedByNames.length > 0 ? blockedByNames : undefined,
    };
  });

  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    overdueCount,
    upcomingCount,
    completedCount,
    totalCount,
    progressPercentage,
    blockedCount,
    tasksWithStatus,
  };
}

