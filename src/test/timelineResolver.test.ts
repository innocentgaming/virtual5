import { describe, it, expect } from 'vitest';
import {
  detectBlockedTasks,
  repaceTimelineTasks,
  auditTimelineTasks,
} from '../services/timelineResolver';
import type { TaskItem } from '../types/event';

describe('Timeline Resolver Suite', () => {
  const sampleTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Book Venue',
      category: 'venue',
      dueDate: '2026-10-01',
      priority: 'high',
      completed: true,
      dependencies: [],
    },
    {
      id: 'task-2',
      title: 'Send Invitations',
      category: 'invitations',
      dueDate: '2026-10-15',
      priority: 'high',
      completed: false,
      dependencies: ['task-1'],
    },
    {
      id: 'task-3',
      title: 'Confirm Catering Menu',
      category: 'catering',
      dueDate: '2026-10-20',
      priority: 'medium',
      completed: false,
      dependencies: ['task-2'],
    },
  ];

  it('detects no blocked tasks when all prerequisites are fulfilled', () => {
    const blocked = detectBlockedTasks(sampleTasks, '2026-10-10');
    expect(blocked).toHaveLength(0);
  });

  it('detects blocked tasks when prerequisite is overdue and incomplete', () => {
    // Current date is 2026-10-18: task-2 is overdue (due 2026-10-15) and incomplete
    const blocked = detectBlockedTasks(sampleTasks, '2026-10-18');
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0].blockedTaskId).toBe('task-3');
    expect(blocked[0].prerequisiteId).toBe('task-2');
  });

  it('detects blocked tasks when prerequisite is scheduled after dependent task', () => {
    const misorderedTasks: TaskItem[] = [
      {
        id: 't-dep',
        title: 'Prerequisite Task',
        category: 'venue',
        dueDate: '2026-10-25',
        completed: false,
        dependencies: [],
      },
      {
        id: 't-child',
        title: 'Dependent Task',
        category: 'decor',
        dueDate: '2026-10-20',
        completed: false,
        dependencies: ['t-dep'],
      },
    ];

    const blocked = detectBlockedTasks(misorderedTasks, '2026-10-01');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].blockedTaskId).toBe('t-child');
    expect(blocked[0].prerequisiteId).toBe('t-dep');
  });

  it('repaces tasks proportionally when event date moves forward', () => {
    const repaced = repaceTimelineTasks(sampleTasks, '2026-11-01', '2026-12-01', '2026-09-01');

    expect(repaced).toHaveLength(sampleTasks.length);
    const originalDate = new Date(sampleTasks[1].dueDate).getTime();
    const newDate = new Date(repaced[1].dueDate).getTime();
    expect(newDate).toBeGreaterThan(originalDate);
  });

  it('repaces tasks with compression on short-notice event shifts', () => {
    const anchor = '2026-10-01';
    const shortNoticeDate = '2026-10-11';

    const repaced = repaceTimelineTasks(sampleTasks, '2026-11-01', shortNoticeDate, anchor);

    expect(repaced).toHaveLength(sampleTasks.length);
    repaced.forEach((task) => {
      expect(new Date(task.dueDate).getTime()).toBeLessThanOrEqual(
        new Date(shortNoticeDate).getTime(),
      );
    });
  });

  it('audits timeline tasks and accurately classifies overdue and pending states', () => {
    const audit = auditTimelineTasks(sampleTasks, '2026-10-18');

    expect(audit.totalCount).toBe(3);
    expect(audit.completedCount).toBe(1);
    expect(audit.overdueCount).toBe(1); // task-2 is overdue
    expect(audit.blockedCount).toBe(1); // task-3 is blocked by overdue task-2
    expect(audit.progressPercentage).toBe(33);
    expect(audit.tasksWithStatus).toHaveLength(3);
  });
});
