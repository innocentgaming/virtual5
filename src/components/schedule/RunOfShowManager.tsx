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
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import type { ScheduleItem, EventPlan } from '../../types/event';
import { downloadEventCalendar } from '../../services/calendarService';
import { Card, CardHeader, Button, Badge, Modal, EmptyState } from '../common';

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
    setFormLocation(plan.venuePreference.replace(/_/g, ' '));
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
          <span className="stat-value" style={{ fontSize: '1.4rem' }}>{plan.eventDate}</span>
          <span className="stat-subtext">{plan.city}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Assigned Vendor Roles</span>
          <span className="stat-value">{uniqueRoles.length}</span>
          <span className="stat-subtext">Teams synchronized</span>
        </div>
      </div>

      {/* 10 PM Sound Curfew Notice Banner */}
      <div className="alert-box alert-warning" role="status">
        <Volume2 size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Baraat & Sound Curfew Protocol (10:00 PM Municipal Regulation)
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>
            In accordance with Indian municipal environmental standards, outdoor amplified music, Dhol processions, and Baraats must conclude or transition indoors by 10:00 PM. EventWise AI pre-calibrates indoor banquet switches to avoid local authority citations.
          </p>
        </div>
      </div>

      {/* Main Itinerary Card */}
      <Card>
        <CardHeader
          title="Run of Show & Day-of Itinerary"
          icon={<Clock size={20} color="var(--accent-primary)" />}
          subtitle="Minute-by-minute execution schedule for vendors, coordinators, and hosts."
          action={
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadEventCalendar(plan)}
                leftIcon={<Calendar size={14} />}
                title="Download RFC 5545 .ics calendar file"
              >
                Export iCal (.ics)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer size={14} />}
                title="Print Day-of Itinerary"
              >
                Print Sheet
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                leftIcon={<Plus size={14} />}
              >
                Add Milestone
              </Button>
            </div>
          }
        />

        {/* Schedule Timeline Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {schedule.length === 0 ? (
            <EmptyState
              icon={<Clock size={36} color="var(--text-muted)" />}
              title="No Day-of Milestones Created"
              description="Outline your timeline from morning muhurats to evening reception by clicking '+ Add Milestone'."
            />
          ) : (
            schedule.map((item, idx) => {
              const isCurfewTrigger =
                item.time.includes('10:') ||
                item.activity.toLowerCase().includes('curfew') ||
                item.activity.toLowerCase().includes('sound');

              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.25rem',
                    padding: '1.125rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isCurfewTrigger ? 'var(--color-warning-bg)' : 'var(--bg-card)',
                    border: isCurfewTrigger ? '1px solid var(--color-warning-border)' : '1px solid var(--border-light)',
                    borderLeft: isCurfewTrigger ? '5px solid var(--color-warning)' : '5px solid var(--accent-primary)',
                    boxShadow: 'var(--shadow-xs)',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {/* Time Indicator Badge */}
                  <div
                    style={{
                      minWidth: '100px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurfewTrigger ? 'var(--color-warning-border)' : 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      border: '1px solid var(--border-medium)',
                      flexShrink: 0,
                    }}
                  >
                    {item.time}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.activity}
                      </h4>
                      <Badge variant="info" icon={<UserCheck size={11} />}>
                        {item.responsibleRole}
                      </Badge>
                      {isCurfewTrigger && (
                        <Badge variant="warning" icon={<AlertTriangle size={11} />}>
                          Noise Curfew
                        </Badge>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} color="var(--accent-primary)" />
                        {item.location}
                      </span>
                    </div>

                    {item.notes && (
                      <p
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-card-subtle)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '2px solid var(--accent-primary)',
                        }}
                      >
                        💡 <strong>Cue / Note:</strong> {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      style={{ padding: '4px 8px' }}
                      title="Edit milestone"
                    >
                      <Edit2 size={13} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDeleteScheduleItem(item.id)}
                      style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                      title="Remove milestone"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Add / Edit Itinerary Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingId ? 'Edit Day-of Milestone' : 'Add Day-of Schedule Milestone'}
        subtitle="Coordinate vendor cues, sound equipment switches, and ritual timings."
      >
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
                placeholder="e.g. Officiant, DJ, Caterer, Pandit Ji"
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
              placeholder="e.g. Grand Baraat Arrival & Milni Welcome"
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
              placeholder="e.g. Main Haveli Courtyard, Royal Lawn"
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
              placeholder="e.g. Ensure sound engineer switches to indoor speakers at 10 PM sharp"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingId ? 'Save Changes' : 'Add Milestone'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
