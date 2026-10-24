import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import type { TaskItem, TaskCategory, TaskPriority, EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge, Modal, EmptyState } from '../common';

interface TimelineManagerProps {
  plan: EventPlan;
  onToggleTask: (id: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<TaskItem>) => void;
}

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  plan,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new task
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('vendors');
  const [newDueDate, setNewDueDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newNotes, setNewNotes] = useState('');

  const { now, daysUntilEvent, isPastEvent, isShortNotice } = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    const target = new Date(plan.eventDate);
    const diff = Math.ceil((target.getTime() - n.getTime()) / (1000 * 60 * 60 * 24));
    return {
      now: n,
      daysUntilEvent: diff,
      isPastEvent: diff < 0,
      isShortNotice: diff >= 0 && diff <= 21,
    };
  }, [plan.eventDate]);

  // Filter tasks
  const filteredTasks = plan.tasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

    if (filter === 'completed') return task.completed;
    if (filter === 'overdue') return isOverdue;
    if (filter === 'upcoming') return !task.completed && !isOverdue;
    return true; // all
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      category: newCategory,
      dueDate: newDueDate,
      completed: false,
      priority: newPriority,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Date warnings */}
      {isPastEvent && (
        <div className="alert-box alert-danger" role="alert">
          <ShieldAlert size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>Event Date Has Passed ({plan.eventDate})</div>
            <p style={{ fontSize: '0.875rem' }}>
              This event occurred in the past. To generate an active preparation schedule, update the event date under Event Setup.
            </p>
          </div>
        </div>
      )}

      {isShortNotice && (
        <div className="alert-box alert-warning" role="alert">
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>Short-Notice Event Horizon ({daysUntilEvent} Days Remaining)</div>
            <p style={{ fontSize: '0.875rem' }}>
              Standard multi-month lead times have been compressed. The timeline prioritizes urgent critical-path tasks: venue lock-in, immediate headcount confirmation, and off-the-shelf catering options.
            </p>
          </div>
        </div>
      )}

      {/* Timeline Controls & Filter Header */}
      <Card>
        <CardHeader
          title="Date-Aware Preparation Timeline"
          icon={<CalendarDays size={20} color="var(--accent-primary)" />}
          subtitle={`Milestones are sequenced relative to your target event date (${plan.eventDate}).`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus size={15} />}
              id="btn-add-timeline-task"
            >
              Add Task
            </Button>
          }
        />

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {(
            [
              { id: 'all', label: `All Tasks (${plan.tasks.length})` },
              {
                id: 'upcoming',
                label: `Upcoming (${plan.tasks.filter((t) => !t.completed && new Date(t.dueDate) >= now).length})`,
              },
              {
                id: 'overdue',
                label: `Overdue (${plan.tasks.filter((t) => !t.completed && new Date(t.dueDate) < now).length})`,
              },
              {
                id: 'completed',
                label: `Completed (${plan.tasks.filter((t) => t.completed).length})`,
              },
            ] as const
          ).map((btn) => (
            <Button
              key={btn.id}
              variant={filter === btn.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(btn.id)}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Visual Vertical Timeline List */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={38} color="var(--color-success)" />}
            title="No tasks in this filter view"
            description="All tasks matching this criteria are satisfied or no tasks have been created."
          />
        ) : (
          <div
            style={{
              position: 'relative',
              paddingLeft: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Visual vertical spine */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '7px',
                width: '2px',
                backgroundColor: 'var(--border-medium)',
              }}
              aria-hidden="true"
            />

            {filteredTasks.map((task) => {
              const taskDate = new Date(task.dueDate);
              taskDate.setHours(0, 0, 0, 0);
              const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

              return (
                <div
                  key={task.id}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.125rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: task.completed ? 'var(--bg-card-subtle)' : 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderLeft: isOverdue
                      ? '5px solid var(--color-danger)'
                      : task.priority === 'urgent'
                      ? '5px solid var(--color-warning)'
                      : task.completed
                      ? '5px solid var(--color-success)'
                      : '5px solid var(--accent-primary)',
                    boxShadow: 'var(--shadow-xs)',
                    opacity: task.completed ? 0.78 : 1,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {/* Timeline node marker */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.85rem',
                      top: '1.25rem',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: task.completed
                        ? 'var(--color-success)'
                        : isOverdue
                        ? 'var(--color-danger)'
                        : task.priority === 'urgent'
                        ? 'var(--color-warning)'
                        : 'var(--accent-primary)',
                      border: '2px solid var(--bg-card)',
                      boxShadow: '0 0 0 2px var(--border-medium)',
                    }}
                    aria-hidden="true"
                  />

                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginTop: '2px',
                      cursor: 'pointer',
                      accentColor: 'var(--accent-primary)',
                    }}
                    aria-label={`Toggle task completion for ${task.title}`}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                        }}
                      >
                        {task.title}
                      </span>

                      {isOverdue && (
                        <Badge variant="danger">
                          Overdue ({task.dueDate})
                        </Badge>
                      )}

                      <Badge
                        variant={
                          task.priority === 'urgent'
                            ? 'danger'
                            : task.priority === 'high'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {task.priority.toUpperCase()}
                      </Badge>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Category: {task.category}
                      </span>
                    </div>

                    {task.notes && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {task.notes}
                      </div>
                    )}

                    {task.dependencies && task.dependencies.length > 0 && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>↳ Prerequisite:</span>
                        {task.dependencies.map((depId) => {
                          const depTask = plan.tasks.find((t) => t.id === depId);
                          const isMet = depTask?.completed;
                          return (
                            <span
                              key={depId}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                backgroundColor: isMet ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                                border: isMet ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(220, 38, 38, 0.35)',
                                color: isMet ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 700,
                              }}
                            >
                              {isMet ? '✓' : '⚠️'} {depTask ? depTask.title.slice(0, 36) + (depTask.title.length > 36 ? '...' : '') : depId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {task.dueDate}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDeleteTask(task.id)}
                      style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                      title="Delete this task"
                      aria-label={`Delete task ${task.title}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Timeline Milestone"
        subtitle="Schedule deliverables and deadlines relative to the main event date."
      >
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="task-title" className="form-label">Task Title *</label>
              <input
                id="task-title"
                type="text"
                className="form-control"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Schedule rehearsal walk-through"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-due" className="form-label">Target Due Date *</label>
              <input
                id="task-due"
                type="date"
                className="form-control"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="task-cat" className="form-label">Category</label>
              <select
                id="task-cat"
                className="form-control"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
              >
                <option value="venue">Venue</option>
                <option value="catering">Catering</option>
                <option value="vendors">Vendors</option>
                <option value="guests">Guests & Invitations</option>
                <option value="decor">Decor & Styling</option>
                <option value="logistics">Logistics & Rentals</option>
                <option value="final">Final Countdown</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-prio" className="form-label">Urgency Priority</label>
              <select
                id="task-prio"
                className="form-control"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-notes" className="form-label">Task Notes / Checklist</label>
            <input
              id="task-notes"
              type="text"
              className="form-control"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Key contacts or prerequisites..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
