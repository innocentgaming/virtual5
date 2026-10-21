import { describe, it, expect } from 'vitest';
import { auditTimelineTasks } from '../services/decisionEngine';
import type { TaskItem } from '../types/event';

describe('Intelligent Timeline & Task Auditing', () => {
  it('correctly calculates overdue, upcoming, and completed task states', () => {
    const tasks: TaskItem[] = [
      {
        id: 't1',
        title: 'Book Venue',
        category: 'venue',
        dueDate: '2026-09-01', // in the past relative to 2026-10-21
        completed: false,
        priority: 'urgent',
      },
      {
        id: 't2',
        title: 'Sign Catering Contract',
        category: 'catering',
        dueDate: '2026-09-15', // past, but completed
        completed: true,
        priority: 'high',
      },
      {
        id: 't3',
        title: 'Mail Invitations',
        category: 'guests',
        dueDate: '2026-11-15', // future
        completed: false,
        priority: 'medium',
      },
      {
        id: 't4',
        title: 'Final Headcount',
        category: 'final',
        dueDate: '2026-12-01', // future
        completed: false,
        priority: 'high',
      },
    ];

    const audit = auditTimelineTasks(tasks, '2026-10-21');

    expect(audit.totalCount).toBe(4);
    expect(audit.overdueCount).toBe(1); // t1 is past and not completed
    expect(audit.completedCount).toBe(1); // t2 is completed
    expect(audit.upcomingCount).toBe(2); // t3 and t4 are future and not completed
    expect(audit.progressPercentage).toBe(25); // 1 out of 4 = 25%

    const t1Status = audit.tasksWithStatus.find((t) => t.id === 't1');
    expect(t1Status?.isOverdue).toBe(true);

    const t2Status = audit.tasksWithStatus.find((t) => t.id === 't2');
    expect(t2Status?.isOverdue).toBe(false); // completed tasks are not overdue
  });

  it('handles empty task list gracefully without dividing by zero', () => {
    const audit = auditTimelineTasks([], '2026-10-21');
    expect(audit.totalCount).toBe(0);
    expect(audit.progressPercentage).toBe(0);
    expect(audit.overdueCount).toBe(0);
    expect(audit.upcomingCount).toBe(0);
  });

  it('calculates 100% progress when all tasks are marked completed', () => {
    const tasks: TaskItem[] = [
      { id: 't1', title: 'Task 1', category: 'venue', dueDate: '2026-08-01', completed: true, priority: 'urgent' },
      { id: 't2', title: 'Task 2', category: 'final', dueDate: '2026-09-01', completed: true, priority: 'high' },
    ];

    const audit = auditTimelineTasks(tasks, '2026-10-21');
    expect(audit.completedCount).toBe(2);
    expect(audit.overdueCount).toBe(0);
    expect(audit.progressPercentage).toBe(100);
  });
});
