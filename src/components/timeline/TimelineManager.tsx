import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldAlert,
  Clock,
  Lock,
  Check,
  Sparkles,
  Copy,
} from 'lucide-react';
import type { TaskItem, TaskCategory, TaskPriority, EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge, Modal, EmptyState, useToast } from '../ui';

interface TimelineManagerProps {
  plan: EventPlan;
  onToggleTask: (id: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<TaskItem>) => void;
  isLoading?: boolean;
}

type TimelineFilter = 'all' | 'overdue' | 'this_week' | 'completed';

const CATEGORY_NAMES: Record<TaskCategory, string> = {
  venue: 'Venue & Logistics',
  catering: 'Catering & Dining',
  vendors: 'Vendor Hiring',
  guests: 'Guest Management',
  decor: 'Decor & Florals',
  logistics: 'Logistics & Transit',
  final: 'Day-of Execution',
};

const PHASES = [
  {
    id: 'phase_90_plus',
    title: 'Phase 1: 90+ Days Before Event (Foundations & Muhurats)',
    description: 'Auspicious timing, master venue bookings, and core caterer contracts.',
  },
  {
    id: 'phase_30_days',
    title: 'Phase 2: 30–90 Days Before Event (Key Vendors & Invitations)',
    description: 'Photographer, decorator, mehendi artists, and postal wedding invitations.',
  },
  {
    id: 'phase_2_weeks',
    title: 'Phase 3: 2–4 Weeks Before Event (Tasting, Outfits & Final RSVPs)',
    description: 'Menu tasting, bridal trial runs, and finalized guest headcount counts.',
  },
  {
    id: 'phase_final_week',
    title: 'Phase 4: Final Fortnight & Week of Event (Final Run & Curfew)',
    description: 'Mandap havan setup, sound curfew compliance, and rehearsal coordination.',
  },
] as const;

interface SamagriItem {
  id: string;
  name: string;
  quantity: string;
  category: 'mandap' | 'havan' | 'kanyadaan' | 'swagat';
}

const DEFAULT_SAMAGRI_ITEMS: SamagriItem[] = [
  // Mandap & Kalash Sthapana
  { id: 'sm-1', name: 'Copper or Brass Kalash', quantity: '1 pc', category: 'mandap' },
  { id: 'sm-2', name: 'Fresh Green Coconut with husk (Nariyal)', quantity: '2 pcs', category: 'mandap' },
  { id: 'sm-3', name: 'Fresh Mango Leaves (Aam ke Patte)', quantity: '11 pcs', category: 'mandap' },
  { id: 'sm-4', name: 'Mauli / Rakshasutra Red Sacred Thread', quantity: '2 rolls', category: 'mandap' },
  { id: 'sm-5', name: 'Betel Nuts (Supari) & Betel Leaves (Paan)', quantity: '21 pcs each', category: 'mandap' },

  // Havan & Pheras
  { id: 'sm-6', name: 'Pure Desi Ghee (Cow Ghee)', quantity: '2 kg', category: 'havan' },
  { id: 'sm-7', name: 'Dry Havan Samagri Herbs & Navgraha Wood', quantity: '1 kg packet', category: 'havan' },
  { id: 'sm-8', name: 'Camphor Tablets (Bhimseni Kapoor)', quantity: '100g', category: 'havan' },
  { id: 'sm-9', name: 'Black Sesame Seeds (Kala Til) & Barley (Jau)', quantity: '250g each', category: 'havan' },
  { id: 'sm-10', name: 'Janeu (Sacred Cotton Thread)', quantity: '5 pcs', category: 'havan' },

  // Kanyadaan & Sindoor Daan
  { id: 'sm-11', name: 'Pure Sindoor / Kumkum & Haldi Ganth (Turmeric roots)', quantity: '50g + 5 pcs', category: 'kanyadaan' },
  { id: 'sm-12', name: 'Sacred Gangajal Bottle', quantity: '1 bottle', category: 'kanyadaan' },
  { id: 'sm-13', name: 'Silver Shagun Coin (Chandi ka Sikka)', quantity: '1 pc', category: 'kanyadaan' },
  { id: 'sm-14', name: 'Akshat (Unbroken White Rice grains with turmeric)', quantity: '500g', category: 'kanyadaan' },

  // Swagat & Varmala
  { id: 'sm-15', name: 'Fresh Rose & Jasmine Varmalas (in ice box storage)', quantity: '2 garlands', category: 'swagat' },
  { id: 'sm-16', name: 'Fresh Rose Petal Baskets (Pushp Varsha for Pheras)', quantity: '5 baskets', category: 'swagat' },
];

interface TaskNodeItemProps {
  task: TaskItem;
  todayTime: number;
  taskMap: Map<string, TaskItem>;
  onToggle: (task: TaskItem) => void;
  onDelete: (id: string, title: string) => void;
}

const TaskNodeItem = React.memo<TaskNodeItemProps>(({
  task,
  todayTime,
  taskMap,
  onToggle,
  onDelete,
}) => {
  const taskDate = new Date(task.dueDate);
  taskDate.setHours(0, 0, 0, 0);
  const isOverdue = !task.completed && taskDate.getTime() < todayTime;
  const daysOverdue = isOverdue
    ? Math.ceil((todayTime - taskDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Prerequisites resolution via Map O(1)
  const prereqTasks = (task.dependencies || [])
    .map((depId) => taskMap.get(depId))
    .filter(Boolean) as TaskItem[];

  const isBlocked = prereqTasks.some((p) => !p.completed);

  return (
    <li
      className="timeline-node"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: task.completed ? 'var(--surface-subtle)' : 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderLeft: task.completed
          ? '5px solid var(--color-success)'
          : isOverdue
          ? '5px solid var(--color-danger)'
          : task.priority === 'urgent'
          ? '5px solid var(--color-warning)'
          : '5px solid var(--accent-primary)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all var(--transition-fast)',
      }}
    >
      {/* Node Marker Dot */}
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
          border: '2px solid var(--surface)',
          boxShadow: '0 0 0 2px var(--border)',
        }}
        aria-hidden="true"
      />

      {/* Inline Complete Checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        style={{
          width: '20px',
          height: '20px',
          marginTop: '2px',
          cursor: 'pointer',
          accentColor: 'var(--accent-primary)',
        }}
        aria-label={`Mark task completed: ${task.title}`}
      />

      {/* Task Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h4
              style={{
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                textDecoration: task.completed ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </h4>

            {/* Blocked lock icon & tooltip */}
            {isBlocked && (
              <span
                title="Blocked: Requires prerequisite task to be completed first"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-warning-text)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                }}
              >
                <Lock size={14} color="var(--color-warning)" />
                <span>Blocked</span>
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete(task.id, task.title)}
            style={{ padding: '2px 8px', color: 'var(--color-danger)' }}
            title="Delete task"
            aria-label={`Delete task ${task.title}`}
          >
            <Trash2 size={13} />
          </Button>
        </div>

        {/* Task Meta: Due Date, Category, Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '6px', flexWrap: 'wrap', fontSize: 'var(--text-xs)' }}>
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            Due: <time dateTime={task.dueDate}>{task.dueDate}</time>
          </span>

          <Badge variant="neutral">
            {CATEGORY_NAMES[task.category] || task.category}
          </Badge>

          {/* Status with Text + Icon (Never color alone) */}
          {task.completed ? (
            <Badge variant="success">
              <Check size={12} style={{ marginRight: '4px' }} /> Done
            </Badge>
          ) : isOverdue ? (
            <Badge variant="danger">
              <AlertCircle size={12} style={{ marginRight: '4px' }} />
              Overdue ({daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue)
            </Badge>
          ) : task.priority === 'urgent' ? (
            <Badge variant="warning">
              <AlertCircle size={12} style={{ marginRight: '4px' }} /> Urgent
            </Badge>
          ) : (
            <Badge variant="info">
              <CalendarDays size={12} style={{ marginRight: '4px' }} /> Upcoming
            </Badge>
          )}
        </div>

        {/* Prerequisite chips */}
        {prereqTasks.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: '8px', flexWrap: 'wrap' }}>
            {prereqTasks.map((prereq) => (
              <span
                key={prereq.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: prereq.completed ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  color: prereq.completed ? 'var(--color-success-text)' : 'var(--color-warning-text)',
                  border: `1px solid ${prereq.completed ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
                }}
                title={prereq.completed ? 'Prerequisite completed' : 'Prerequisite pending completion'}
              >
                {prereq.completed ? `✓ ${prereq.title}` : `⚠ Needs: ${prereq.title}`}
              </span>
            ))}
          </div>
        )}

        {task.notes && (
          <p style={{ margin: '8px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {task.notes}
          </p>
        )}
      </div>
    </li>
  );
});

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  plan,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  isLoading = false,
}) => {
  const toast = useToast();
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form fields
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('vendors');
  const [newDueDate, setNewDueDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDependency, setNewDependency] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  const addTaskButtonRef = useRef<HTMLButtonElement>(null);

  // Vedic Samagri Kit states
  const [showSamagriModal, setShowSamagriModal] = useState(false);
  const [checkedSamagri, setCheckedSamagri] = useState<Record<string, boolean>>({});
  const [copiedSamagri, setCopiedSamagri] = useState(false);

  const toggleSamagri = (id: string) => {
    setCheckedSamagri((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const samagriPreparedCount = useMemo(() => {
    return DEFAULT_SAMAGRI_ITEMS.filter((item) => checkedSamagri[item.id]).length;
  }, [checkedSamagri]);

  const samagriListText = useMemo(() => {
    let out = `🪔 Vedic Wedding Ritual & Puja Samagri Checklist\nEvent: ${plan.title || 'Wedding'}\nDate: ${plan.eventDate} | Venue: ${plan.venuePreference.replace(/_/g, ' ')}\n\n`;

    const categories: Record<string, string> = {
      mandap: '1. MANDAP & KALASH STHAPANA',
      havan: '2. HAVAN KUND & SAPTAPADI PHERAS',
      kanyadaan: '3. KANYADAAN & SINDOOR DAAN',
      swagat: '4. VARMALA & SWAGAT PUSHP VARSHA',
    };

    Object.entries(categories).forEach(([catKey, catTitle]) => {
      out += `${catTitle}:\n`;
      DEFAULT_SAMAGRI_ITEMS.filter((i) => i.category === catKey).forEach((item) => {
        const isReady = checkedSamagri[item.id] ? '✓ [Ready]' : '○ [Pending]';
        out += `  ${isReady} ${item.name} (${item.quantity})\n`;
      });
      out += '\n';
    });

    out += `*Generated via EventWise AI Puja Assistant*`;
    return out;
  }, [plan, checkedSamagri]);

  const handleCopySamagri = () => {
    navigator.clipboard.writeText(samagriListText);
    setCopiedSamagri(true);
    toast.showToast('Samagri checklist copied for WhatsApp / Pandit Ji! 📋', 'success');
    setTimeout(() => setCopiedSamagri(false), 2500);
  };

  // Date horizon calculations
  const { today, daysUntilEvent, isPastEvent, isShortNotice } = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const target = new Date(plan.eventDate);
    const diff = Math.ceil((target.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
    return {
      today: t,
      daysUntilEvent: diff,
      isPastEvent: diff < 0,
      isShortNotice: diff >= 0 && diff <= 21,
    };
  }, [plan.eventDate]);

  // Overall Task Audit
  const audit = useMemo(() => {
    let overdueCount = 0;
    let completedCount = 0;
    let thisWeekCount = 0;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    plan.tasks.forEach((t) => {
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);

      if (t.completed) {
        completedCount++;
      } else if (d.getTime() < today.getTime()) {
        overdueCount++;
      }

      if (d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime()) {
        thisWeekCount++;
      }
    });

    const total = plan.tasks.length;
    const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      completedCount,
      overdueCount,
      thisWeekCount,
      progressPct,
    };
  }, [plan.tasks, today]);


  // Filter tasks
  const filteredTasks = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return plan.tasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      const isOverdue = !task.completed && taskDate.getTime() < today.getTime();

      if (filter === 'completed') return task.completed;
      if (filter === 'overdue') return isOverdue;
      if (filter === 'this_week') {
        return taskDate.getTime() >= startOfWeek.getTime() && taskDate.getTime() <= endOfWeek.getTime();
      }
      return true;
    });
  }, [plan.tasks, filter, today]);

  // Group filtered tasks by Phase
  const tasksByPhase = useMemo(() => {
    const map: Record<string, TaskItem[]> = {
      phase_90_plus: [],
      phase_30_days: [],
      phase_2_weeks: [],
      phase_final_week: [],
    };

    filteredTasks.forEach((t) => {
      const eventTime = new Date(plan.eventDate).getTime();
      const taskTime = new Date(t.dueDate).getTime();
      const daysBefore = Math.ceil((eventTime - taskTime) / (1000 * 60 * 60 * 24));
      let pid: typeof PHASES[number]['id'] = 'phase_final_week';
      if (daysBefore >= 90) pid = 'phase_90_plus';
      else if (daysBefore >= 30) pid = 'phase_30_days';
      else if (daysBefore >= 14) pid = 'phase_2_weeks';

      map[pid].push(t);
    });

    return map;
  }, [filteredTasks, plan.eventDate]);

  const taskMap = useMemo(() => new Map(plan.tasks.map((t) => [t.id, t])), [plan.tasks]);

  const handleToggle = useCallback((task: TaskItem) => {
    onToggleTask(task.id);
    toast.showToast(
      task.completed ? `Task reopened: ${task.title}` : `Completed task: ${task.title} 🎉`,
      'success'
    );
  }, [onToggleTask, toast]);

  const handleDelete = useCallback((id: string, title: string) => {
    onDeleteTask(id);
    toast.showToast(`Deleted task: ${title}`, 'info');
  }, [onDeleteTask, toast]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      category: newCategory,
      dueDate: newDueDate,
      completed: false,
      priority: newPriority,
      dependencies: newDependency ? [newDependency] : undefined,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewNotes('');
    setNewDependency('');
    setShowAddModal(false);
    toast.showToast(`Task created: ${newTitle.trim()}`, 'success');
    addTaskButtonRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ height: '90px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <div style={{ height: '350px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* =====================================================================
          1. EVENT HORIZON ALERTS (Short Notice & Past Date)
          ===================================================================== */}
      {isPastEvent && (
        <div className="alert-box alert-danger" role="alert">
          <ShieldAlert size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>Event Date Has Passed ({plan.eventDate})</div>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              This event occurred in the past. To generate an active preparation schedule, update the event date under Event Setup.
            </p>
          </div>
        </div>
      )}

      {isShortNotice && (
        <div className="alert-box alert-warning" role="alert">
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>
              Short-Notice Horizon: {daysUntilEvent} Days Remaining ({daysUntilEvent < 14 ? '<14 Days Urgent Triage' : '<21 Days Compression'})
            </div>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '2px' }}>
              Standard multi-month lead times have been compressed into rapid sprints. Prioritize critical path tasks: lock venue contract immediately, finalize caterer headcount, and avoid custom manufacturing.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. OVERALL TIMELINE PROGRESS & FILTER STRIP
          ===================================================================== */}
      <Card>
        <CardHeader
          headingLevel="h2"
          title="Date-Aware Preparation Timeline"
          icon={<CalendarDays size={20} color="var(--accent-primary)" />}
          subtitle={`Phased milestones relative to celebration date (${plan.eventDate} in ${plan.city}).`}
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSamagriModal(true)}
                leadingIcon={<Sparkles size={14} />}
                id="btn-vedic-samagri"
              >
                Puja Samagri Kit
              </Button>
              <Button
                ref={addTaskButtonRef}
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                leadingIcon={<Plus size={16} />}
                id="btn-add-timeline-task"
              >
                Add Task
              </Button>
            </div>
          }
        />

        {/* Overall Completion Bar */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Overall Timeline Execution
            </span>
            <span className="tabular-nums" style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {audit.completedCount} of {audit.total} tasks completed ({audit.progressPct}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${audit.progressPct}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                transition: 'width var(--transition-normal)',
              }}
            />
          </div>
        </div>

        {/* Filter Pills with Counts */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Tasks ({audit.total})
          </Button>
          <Button
            variant={filter === 'overdue' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('overdue')}
            style={filter === 'overdue' ? {} : audit.overdueCount > 0 ? { borderColor: 'var(--color-danger)', color: 'var(--color-danger)' } : {}}
            leadingIcon={<AlertCircle size={13} />}
          >
            Overdue ({audit.overdueCount})
          </Button>
          <Button
            variant={filter === 'this_week' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('this_week')}
            leadingIcon={<Clock size={13} />}
          >
            This Week ({audit.thisWeekCount})
          </Button>
          <Button
            variant={filter === 'completed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('completed')}
            leadingIcon={<Check size={13} />}
          >
            Done ({audit.completedCount})
          </Button>
        </div>

        {/* Live region for screen readers */}
        <div aria-live="polite" role="status" className="sr-only">
          Showing {filteredTasks.length} of {plan.tasks.length} tasks for {filter} filter
        </div>
      </Card>

      {/* =====================================================================
          3. VERTICAL TIMELINE PHASES (90+ Days, 30 Days, 2 Weeks, Final Week)
          ===================================================================== */}
      {filteredTasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 size={38} color="var(--color-success)" />}
            title="No tasks in this timeline view"
            description="All tasks matching this filter are satisfied or no tasks have been scheduled."
            action={
              filter !== 'all' ? (
                <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                  View All Tasks
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {PHASES.map((phase) => {
            const phaseTasks = tasksByPhase[phase.id] || [];
            if (phaseTasks.length === 0) return null;

            return (
              <section key={phase.id} aria-labelledby={`phase-heading-${phase.id}`}>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <h3
                    id={`phase-heading-${phase.id}`}
                    style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text)', margin: '0 0 2px 0' }}
                  >
                    {phase.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                    {phase.description}
                  </p>
                </div>

                <div style={{ position: 'relative' }}>
                  {/* Vertical spine line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      bottom: '12px',
                      left: '8px',
                      width: '2px',
                      backgroundColor: 'var(--border)',
                    }}
                    aria-hidden="true"
                  />

                  {/* Semantic ordered list for accessibility */}
                  <ol
                    style={{
                      listStyle: 'none',
                      padding: '0 0 0 1.75rem',
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    {phaseTasks.map((task) => (
                      <TaskNodeItem
                        key={task.id}
                        task={task}
                        todayTime={today.getTime()}
                        taskMap={taskMap}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ol>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          4. ADD TASK MODAL (With Dependency Picker)
          ===================================================================== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Schedule New Preparation Milestone"
      >
        <form onSubmit={handleCreateTask}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="tsk-title" className="form-label">
                <span>Task Milestone Title *</span>
              </label>
              <input
                id="tsk-title"
                type="text"
                className="form-control"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Confirm Mehendi Artist & Dhol Walas"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="tsk-category" className="form-label">
                  <span>Category</span>
                </label>
                <select
                  id="tsk-category"
                  className="form-control"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                >
                  {(Object.keys(CATEGORY_NAMES) as TaskCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_NAMES[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tsk-priority" className="form-label">
                  <span>Priority</span>
                </label>
                <select
                  id="tsk-priority"
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
              <label htmlFor="tsk-duedate" className="form-label">
                <span>Target Due Date *</span>
              </label>
              <input
                id="tsk-duedate"
                type="date"
                className="form-control"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tsk-prereq" className="form-label">
                <span>Prerequisite Task (Optional Dependency)</span>
              </label>
              <select
                id="tsk-prereq"
                className="form-control"
                value={newDependency}
                onChange={(e) => setNewDependency(e.target.value)}
              >
                <option value="">None (Can start immediately)</option>
                {plan.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tsk-notes" className="form-label">
                <span>Notes & Vendor Coordination Details</span>
              </label>
              <input
                id="tsk-notes"
                type="text"
                className="form-control"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Advance payment receipt required"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" size="md" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" leadingIcon={<Sparkles size={16} />}>
                Save Task
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          VEDIC RITUAL & PUJA SAMAGRI CHECKLIST MODAL
          ===================================================================== */}
      <Modal
        isOpen={showSamagriModal}
        onClose={() => setShowSamagriModal(false)}
        title="Vedic Ritual & Puja Samagri Kit"
        subtitle="Complete checklist for Mandap, Havan Kund, Kanyadaan & Varmala ceremonies."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Header Summary & WhatsApp Copy */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                Procurement Readiness: {samagriPreparedCount} of {DEFAULT_SAMAGRI_ITEMS.length} items procured
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                Handover checklist to Pandit Ji or puja bhandaar store.
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySamagri}
              leadingIcon={copiedSamagri ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              id="btn-copy-samagri"
            >
              {copiedSamagri ? 'Copied to Clipboard!' : 'Copy for WhatsApp'}
            </Button>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(samagriPreparedCount / DEFAULT_SAMAGRI_ITEMS.length) * 100}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          {/* Categorized Checklists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '380px', overflowY: 'auto', paddingRight: 'var(--space-1)' }}>
            {[
              { key: 'mandap', title: '1. Mandap & Kalash Sthapana', badge: 'Sacred Altar' },
              { key: 'havan', title: '2. Havan Kund & Saptapadi Pheras', badge: 'Sacred Fire' },
              { key: 'kanyadaan', title: '3. Kanyadaan & Sindoor Daan', badge: 'Main Rituals' },
              { key: 'swagat', title: '4. Varmala & Swagat Pushp Varsha', badge: 'Procession' },
            ].map((section) => {
              const items = DEFAULT_SAMAGRI_ITEMS.filter((i) => i.category === section.key);
              return (
                <div key={section.key} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                      {section.title}
                    </h4>
                    <Badge variant="neutral" size="sm">{section.badge}</Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {items.map((item) => {
                      const isChecked = !!checkedSamagri[item.id];
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface)',
                            border: isChecked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-xs)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSamagri(item.id)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <span style={{ textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? 'var(--text-muted)' : 'var(--text)', fontWeight: isChecked ? 500 : 600 }}>
                              {item.name}
                            </span>
                          </div>
                          <Badge variant={isChecked ? 'success' : 'neutral'} size="sm">
                            {item.quantity}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            <Button variant="primary" size="md" onClick={() => setShowSamagriModal(false)}>
              Close Checklist
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
