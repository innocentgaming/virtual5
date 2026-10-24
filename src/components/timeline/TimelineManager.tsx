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
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <CalendarDays size={20} color="var(--accent-primary)" />
              Date-Aware Preparation Timeline
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Milestones are sequenced relative to your event date ({plan.eventDate}).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
            id="btn-add-timeline-task"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
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
            <button
              key={btn.id}
              type="button"
              className={`btn btn-sm ${filter === btn.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(btn.id)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Add Task Modal / Form */}
        {showAddModal && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-medium)',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Add Timeline Milestone
            </h4>
            <form onSubmit={handleCreateTask}>
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
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <p style={{ fontWeight: 600 }}>No tasks in this filter view.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredTasks.map((task) => {
              const taskDate = new Date(task.dueDate);
              taskDate.setHours(0, 0, 0, 0);
              const isOverdue = !task.completed && taskDate.getTime() < now.getTime();

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: task.completed ? 'var(--bg-card-subtle)' : 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderLeft: isOverdue
                      ? '5px solid var(--color-danger)'
                      : task.priority === 'urgent'
                      ? '5px solid var(--color-warning)'
                      : '5px solid var(--accent-primary)',
                    opacity: task.completed ? 0.75 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }}
                    aria-label={`Toggle task completion for ${task.title}`}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                        }}
                      >
                        {task.title}
                      </span>

                      {isOverdue && (
                        <span className="badge badge-danger">
                          Overdue ({task.dueDate})
                        </span>
                      )}

                      <span
                        className={`badge ${
                          task.priority === 'urgent'
                            ? 'badge-danger'
                            : task.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {task.priority.toUpperCase()}
                      </span>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Category: {task.category}
                      </span>
                    </div>

                    {task.notes && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {task.notes}
                      </div>
                    )}

                    {task.dependencies && task.dependencies.length > 0 && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>↳ Prerequisite:</span>
                        {task.dependencies.map((depId) => {
                          const depTask = plan.tasks.find((t) => t.id === depId);
                          const isMet = depTask?.completed;
                          return (
                            <span
                              key={depId}
                              style={{
                                padding: '1px 7px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                backgroundColor: isMet ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                border: isMet ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                color: isMet ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 600,
                              }}
                            >
                              {isMet ? '✓' : '⚠️'} {depTask ? depTask.title.slice(0, 36) + (depTask.title.length > 36 ? '...' : '') : depId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {task.dueDate}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                      title="Delete this task"
                      aria-label={`Delete task ${task.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
