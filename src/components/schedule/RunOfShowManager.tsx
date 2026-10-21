import React, { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Printer,
  MapPin,
  UserCheck,
} from 'lucide-react';
import type { ScheduleItem, EventPlan } from '../../types/event';
import { downloadEventCalendar } from '../../services/calendarService';

interface RunOfShowManagerProps {
  plan: EventPlan;
  onAddScheduleItem: (item: Omit<ScheduleItem, 'id'>) => void;
  onUpdateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => void;
  onDeleteScheduleItem: (id: string) => void;
}

export const RunOfShowManager: React.FC<RunOfShowManagerProps> = ({
  plan,
  onAddScheduleItem,
  onUpdateScheduleItem,
  onDeleteScheduleItem,
}) => {
  const schedule = useMemo(() => plan.schedule || [], [plan.schedule]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formTime, setFormTime] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formRole, setFormRole] = useState('Event Coordinator');
  const [formNotes, setFormNotes] = useState('');

  const uniqueRoles = useMemo(() => {
    const s = new Set(schedule.map((item) => item.responsibleRole).filter(Boolean));
    return Array.from(s);
  }, [schedule]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTime('12:00 PM');
    setFormActivity('');
    setFormLocation(plan.venuePreference.replace('_', ' '));
    setFormRole('Event Coordinator');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormTime(item.time);
    setFormActivity(item.activity);
    setFormLocation(item.location);
    setFormRole(item.responsibleRole);
    setFormNotes(item.notes || '');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim() || !formTime.trim()) return;

    if (editingId) {
      onUpdateScheduleItem(editingId, {
        time: formTime.trim(),
        activity: formActivity.trim(),
        location: formLocation.trim() || 'Main Venue',
        responsibleRole: formRole.trim() || 'Coordinator',
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddScheduleItem({
        time: formTime.trim(),
        activity: formActivity.trim(),
        location: formLocation.trim() || 'Main Venue',
        responsibleRole: formRole.trim() || 'Coordinator',
        notes: formNotes.trim() || undefined,
      });
    }

    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Summary Cards */}
      <div className="grid-cols-3">
        <div className="stat-card">
          <span className="stat-label">Total Day-of Milestones</span>
          <span className="stat-value">{schedule.length}</span>
          <span className="stat-subtext">Calibrated itinerary blocks</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Event Horizon Date</span>
          <span className="stat-value" style={{ fontSize: '1.25rem' }}>{plan.eventDate}</span>
          <span className="stat-subtext">{plan.city}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Assigned Vendor Roles</span>
          <span className="stat-value">{uniqueRoles.length}</span>
          <span className="stat-subtext">Teams synchronized</span>
        </div>
      </div>

      {/* Main Itinerary Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Clock size={20} color="var(--accent-primary)" />
              Run of Show & Day-of Itinerary
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Minute-by-minute execution schedule for vendors, coordinators, and hosts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => downloadEventCalendar(plan)}
              className="btn btn-secondary btn-sm"
              title="Download RFC 5545 .ics calendar file"
            >
              <Calendar size={14} />
              <span>Export iCal (.ics)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              title="Print Day-of Itinerary"
            >
              <Printer size={14} />
              <span>Print Sheet</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Add Milestone</span>
            </button>
          </div>
        </div>

        {/* Schedule Timeline Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {schedule.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No day-of schedule milestones created yet. Click "+ Add Milestone" to outline your itinerary.
            </div>
          ) : (
            schedule.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                }}
              >
                {/* Time Indicator */}
                <div
                  style={{
                    minWidth: '95px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  {item.time}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.activity}
                    </h4>
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <UserCheck size={11} /> {item.responsibleRole}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={13} color="var(--accent-primary)" />
                      {item.location}
                    </span>
                  </div>

                  {item.notes && (
                    <p style={{ marginTop: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card-subtle)', padding: '6px 10px', borderRadius: '4px' }}>
                      💡 <strong>Cue / Note:</strong> {item.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                    title="Edit milestone"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteScheduleItem(item.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                    title="Remove milestone"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
          <div className="modal-content">
            <h3 id="schedule-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editingId ? 'Edit Day-of Milestone' : 'Add Day-of Schedule Milestone'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label htmlFor="sch-time" className="form-label">Time / Timing *</label>
                  <input
                    id="sch-time"
                    type="text"
                    className="form-control"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 04:00 PM or 16:00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sch-role" className="form-label">Responsible Role / Lead *</label>
                  <input
                    id="sch-role"
                    type="text"
                    className="form-control"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. Officiant, DJ, Caterer"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sch-act" className="form-label">Activity Description *</label>
                <input
                  id="sch-act"
                  type="text"
                  className="form-control"
                  value={formActivity}
                  onChange={(e) => setFormActivity(e.target.value)}
                  placeholder="e.g. Grand Entrance & Welcome Toasts"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sch-loc" className="form-label">Location / Zone *</label>
                <input
                  id="sch-loc"
                  type="text"
                  className="form-control"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Main Lawn Pergola, Banquet Hall"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sch-notes" className="form-label">Cues, Mic Checks & Notes (Optional)</label>
                <textarea
                  id="sch-notes"
                  rows={2}
                  className="form-control"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Ensure audio mic is handed to best man, champagne pre-poured"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingId ? 'Save Changes' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
