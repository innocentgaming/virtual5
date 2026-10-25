import React, { useState, useMemo, useRef } from 'react';
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
  Sparkles,
  Flame,
  Music,
  Heart,
  Utensils,
  HeartHandshake,
} from 'lucide-react';
import type { ScheduleItem, EventPlan } from '../../types/event';
import { downloadEventCalendar } from '../../services/calendarService';
import { Card, CardHeader, Button, Badge, Modal, EmptyState, useToast } from '../ui';

interface RunOfShowManagerProps {
  plan: EventPlan;
  onAddScheduleItem: (item: Omit<ScheduleItem, 'id'>) => void;
  onUpdateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => void;
  onDeleteScheduleItem: (id: string) => void;
  isLoading?: boolean;
}

type RitualType =
  | 'haldi'
  | 'baraat'
  | 'milni_varmala'
  | 'pheras'
  | 'feast'
  | 'sangeet'
  | 'bidaai'
  | 'ceremony';

interface RitualMeta {
  type: RitualType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: 'warning' | 'danger' | 'info' | 'success' | 'neutral';
}

function formatRitualLabelWithLang(label: string): React.ReactNode {
  const parts = label.split(/(Haldi|Baraat|Milni|Varmala|Pheras|Sangeet|Vidaai|Muhurat|Mandap)/gi);
  return parts.map((part, i) => {
    if (/^(Haldi|Baraat|Milni|Varmala|Pheras|Sangeet|Vidaai|Muhurat|Mandap)$/i.test(part)) {
      return <span key={i} lang="hi">{part}</span>;
    }
    return part;
  });
}

function getRitualMeta(activity: string, notes?: string): RitualMeta {
  const text = `${activity} ${notes || ''}`.toLowerCase();

  if (text.includes('haldi') || text.includes('ubtan') || text.includes('turmeric') || text.includes('tel')) {
    return {
      type: 'haldi',
      label: 'Haldi Ritual',
      color: '#B45309',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      badgeVariant: 'warning',
    };
  }
  if (text.includes('baraat') || text.includes('ghodi') || text.includes('dhol procession') || text.includes('groom entry')) {
    return {
      type: 'baraat',
      label: 'Baraat Procession',
      color: '#DC2626',
      bgColor: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.4)',
      badgeVariant: 'danger',
    };
  }
  if (text.includes('milni') || text.includes('varmala') || text.includes('jaimala') || text.includes('swagat')) {
    return {
      type: 'milni_varmala',
      label: 'Milni / Varmala',
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
      borderColor: 'rgba(217, 119, 6, 0.4)',
      badgeVariant: 'warning',
    };
  }
  if (text.includes('phera') || text.includes('muhurat') || text.includes('mandap') || text.includes('havan') || text.includes('kanyadaan') || text.includes('sindoor')) {
    return {
      type: 'pheras',
      label: 'Pheras & Vedic Vows',
      color: '#991B1B',
      bgColor: 'rgba(153, 27, 27, 0.12)',
      borderColor: 'rgba(153, 27, 27, 0.4)',
      badgeVariant: 'danger',
    };
  }
  if (text.includes('feast') || text.includes('dinner') || text.includes('lunch') || text.includes('breakfast') || text.includes('buffet') || text.includes('dining') || text.includes('chaat') || text.includes('thali') || text.includes('cater')) {
    return {
      type: 'feast',
      label: 'Feast & Dining',
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
      borderColor: 'rgba(5, 150, 105, 0.4)',
      badgeVariant: 'success',
    };
  }
  if (text.includes('sangeet') || text.includes('dj') || text.includes('dance') || text.includes('cocktail') || text.includes('music') || text.includes('performance')) {
    return {
      type: 'sangeet',
      label: 'Sangeet & DJ',
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.12)',
      borderColor: 'rgba(124, 58, 237, 0.4)',
      badgeVariant: 'info',
    };
  }
  if (text.includes('bidaai') || text.includes('vidai') || text.includes('farewell') || text.includes('doli')) {
    return {
      type: 'bidaai',
      label: 'Bidaai Farewell',
      color: '#C2410C',
      bgColor: 'rgba(194, 65, 12, 0.12)',
      borderColor: 'rgba(194, 65, 12, 0.4)',
      badgeVariant: 'warning',
    };
  }

  return {
    type: 'ceremony',
    label: 'Ceremony Milestone',
    color: 'var(--accent-primary)',
    bgColor: 'var(--surface-subtle)',
    borderColor: 'var(--border)',
    badgeVariant: 'neutral',
  };
}

function renderRitualIcon(type: RitualType) {
  switch (type) {
    case 'haldi':
      return <Sparkles size={16} color="#B45309" />;
    case 'baraat':
      return <Music size={16} color="#DC2626" />;
    case 'milni_varmala':
      return <Heart size={16} color="#D97706" />;
    case 'pheras':
      return <Flame size={16} color="#991B1B" />;
    case 'feast':
      return <Utensils size={16} color="#059669" />;
    case 'sangeet':
      return <Music size={16} color="#7C3AED" />;
    case 'bidaai':
      return <HeartHandshake size={16} color="#C2410C" />;
    default:
      return <Clock size={16} color="var(--accent-primary)" />;
  }
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function formatDateTimeAttr(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(currentMins: number, nextMins?: number): string {
  if (nextMins !== undefined && nextMins > currentMins) {
    const diff = nextMins - currentMins;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr`;
    return `${mins} min`;
  }
  return '60 min';
}

export const RunOfShowManager: React.FC<RunOfShowManagerProps> = ({
  plan,
  onAddScheduleItem,
  onUpdateScheduleItem,
  onDeleteScheduleItem,
  isLoading = false,
}) => {
  const toast = useToast();
  const schedule = useMemo(() => plan.schedule || [], [plan.schedule]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formTime, setFormTime] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formRole, setFormRole] = useState('Event Coordinator');
  const [formNotes, setFormNotes] = useState('');

  const addMilestoneBtnRef = useRef<HTMLButtonElement>(null);

  // Sorted items with minutes metadata
  const sortedItems = useMemo(() => {
    return [...schedule].map((item) => ({
      ...item,
      timeMins: parseTimeToMinutes(item.time),
    })).sort((a, b) => a.timeMins - b.timeMins);
  }, [schedule]);

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
      toast.showToast(`Updated milestone: ${formActivity.trim()}`, 'success');
    } else {
      onAddScheduleItem({
        time: formTime.trim(),
        activity: formActivity.trim(),
        location: formLocation.trim() || 'Main Venue',
        responsibleRole: formRole.trim() || 'Coordinator',
        notes: formNotes.trim() || undefined,
      });
      toast.showToast(`Added milestone: ${formActivity.trim()}`, 'success');
    }

    setShowAddModal(false);
    addMilestoneBtnRef.current?.focus();
  };

  const handleExportCalendar = () => {
    downloadEventCalendar(plan);
    toast.showToast('iCal calendar exported (.ics) 🎉', 'success');
  };

  const handlePrintSheet = () => {
    toast.showToast('Opening print dialog for Run of Show binder...', 'info');
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ height: '90px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="ui-skeleton" />
        <div style={{ height: '360px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="ui-skeleton" />
      </div>
    );
  }

  // Curfew cutoff at 10:00 PM = 1320 minutes
  const CURFEW_MINUTES = 22 * 60; // 1320
  const curfewIndex = sortedItems.findIndex((item) => item.timeMins >= CURFEW_MINUTES);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* =====================================================================
          1. PRINT-ONLY HEADER (Hidden on screen, visible in @media print)
          ===================================================================== */}
      <div className="print-header" style={{ display: 'none' }}>
        <h2 style={{ fontSize: '18pt', margin: '0 0 4pt 0', fontWeight: 'bold' }}>
          {plan.title || 'EventWise AI — Run of Show'}
        </h2>
        <p style={{ fontSize: '11pt', margin: 0 }}>
          <strong>Date:</strong> {plan.eventDate} | <strong>City:</strong> {plan.city} | <strong>Venue:</strong> {plan.venuePreference.replace(/_/g, ' ')} | <strong>Headcount:</strong> {plan.guestCount} guests
        </p>
      </div>

      {/* =====================================================================
          2. SUMMARY CARDS
          ===================================================================== */}
      <div className="grid-cols-3 no-print">
        <div className="stat-card">
          <span className="stat-label">Total Day-of Milestones</span>
          <span className="stat-value tabular-nums">{schedule.length}</span>
          <span className="stat-subtext">Calibrated itinerary blocks</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Event Horizon Date</span>
          <span className="stat-value tabular-nums" style={{ fontSize: '1.4rem' }}>{plan.eventDate}</span>
          <span className="stat-subtext">{plan.city} ({plan.venuePreference.replace(/_/g, ' ')})</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Assigned Vendor Roles</span>
          <span className="stat-value tabular-nums">{uniqueRoles.length}</span>
          <span className="stat-subtext">Teams synchronized</span>
        </div>
      </div>

      {/* =====================================================================
          3. 10 PM SOUND CURFEW NOTICE BANNER (Rule 9)
          ===================================================================== */}
      <div className="alert-box alert-warning no-print" role="status">
        <Volume2 size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Baraat & Sound Curfew Protocol (10:00 PM Municipal Regulation)
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.5 }}>
            In accordance with Indian municipal environmental standards, outdoor amplified music, Dhol processions, and Baraats must conclude or transition indoors by 10:00 PM. EventWise AI pre-calibrates indoor banquet switches to avoid local authority citations.
          </p>
        </div>
      </div>

      {/* =====================================================================
          4. MAIN ITINERARY CARD
          ===================================================================== */}
      <Card>
        <CardHeader
          headingLevel="h2"
          title="Run of Show & Day-of Itinerary"
          icon={<Clock size={20} color="var(--accent-primary)" />}
          subtitle="Minute-by-minute execution schedule for vendors, coordinators, and hosts."
          action={
            <div className="no-print" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCalendar}
                leadingIcon={<Calendar size={14} />}
                title="Download RFC 5545 .ics calendar file"
                id="btn-export-ical"
              >
                Export iCal (.ics)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintSheet}
                leadingIcon={<Printer size={14} />}
                title="Print Day-of Itinerary"
                id="btn-print-sheet"
              >
                Print Sheet
              </Button>
              <Button
                ref={addMilestoneBtnRef}
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                leadingIcon={<Plus size={14} />}
                id="btn-add-milestone"
              >
                Add Milestone
              </Button>
            </div>
          }
        />

        {/* Schedule List with Semantic <ol> */}
        {sortedItems.length === 0 ? (
          <EmptyState
            icon={<Clock size={38} color="var(--text-muted)" />}
            title="No Day-of Milestones Created"
            description="Outline your timeline from morning muhurats to evening reception by clicking '+ Add Milestone'."
            action={
              <Button variant="primary" size="sm" onClick={handleOpenAdd} leadingIcon={<Plus size={14} />}>
                Add Milestone
              </Button>
            }
          />
        ) : (
          <ol
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 'var(--space-3) 0 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {sortedItems.map((item, idx) => {
              const ritual = getRitualMeta(item.activity, item.notes);
              const nextItem = sortedItems[idx + 1];
              const duration = formatDuration(item.timeMins, nextItem?.timeMins);
              const isPastCurfew = item.timeMins >= CURFEW_MINUTES;

              // Check if we should render the curfew divider right before this item
              const shouldRenderCurfewBefore =
                curfewIndex !== -1 && idx === curfewIndex;

              return (
                <React.Fragment key={item.id || idx}>
                  {/* Curfew Divider at 10:00 PM */}
                  {shouldRenderCurfewBefore && (
                    <li className="curfew-divider-item" style={{ listStyle: 'none' }}>
                      <div
                        className="curfew-divider"
                        role="note"
                        aria-label="10:00 PM Municipal Sound Curfew"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-3) var(--space-4)',
                          margin: 'var(--space-2) 0',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: 'var(--color-warning-bg)',
                          border: '2px dashed var(--color-warning-border)',
                          color: 'var(--color-warning-text)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 800, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                          <Volume2 size={18} color="var(--color-warning)" />
                          <span>Curfew: Move Indoors (10:00 PM)</span>
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-warning-text)',
                            lineHeight: 1.4,
                            borderLeft: '2px solid var(--color-warning-border)',
                            paddingLeft: 'var(--space-3)',
                          }}
                          title="Rule 9 Protocol: Outdoor amplified music, Dhol processions, and Baraats must transition indoors by 10:00 PM."
                        >
                          <strong>Rule 9 Protocol:</strong> Transition all outdoor music, Dhol, and Baraat activities into soundproofed banquet halls.
                        </div>
                      </div>
                    </li>
                  )}

                  {/* Schedule Item Row */}
                  <li className="schedule-row">
                    {/* Time Column (Mobile: rendered above card via CSS) */}
                    <div className="schedule-time-col">
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isPastCurfew ? 'var(--color-warning-bg)' : 'var(--surface-subtle)',
                          border: isPastCurfew ? '1px solid var(--color-warning-border)' : '1px solid var(--border)',
                          color: isPastCurfew ? 'var(--color-warning-text)' : 'var(--text)',
                          fontWeight: 800,
                          fontSize: 'var(--text-sm)',
                          textAlign: 'center',
                        }}
                      >
                        <time dateTime={formatDateTimeAttr(item.time)}>{item.time}</time>
                      </div>
                    </div>

                    {/* Card Column with Ritual Styling */}
                    <div className="schedule-card-col">
                      <div
                        className="schedule-card"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 'var(--space-4)',
                          padding: 'var(--space-4)',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: ritual.bgColor,
                          border: `1px solid ${ritual.borderColor}`,
                          borderLeft: `5px solid ${ritual.color}`,
                          boxShadow: 'var(--shadow-xs)',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Title & Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              {renderRitualIcon(ritual.type)}
                              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                                {item.activity}
                              </h3>
                            </div>

                            <Badge variant={ritual.badgeVariant}>
                              {formatRitualLabelWithLang(ritual.label)}
                            </Badge>

                            {isPastCurfew && (
                              <Badge variant="warning" icon={<AlertTriangle size={11} />}>
                                Indoor Sound Only
                              </Badge>
                            )}
                          </div>

                          {/* Metadata row: Location, Coordinator, Duration */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-4)',
                              marginTop: 'var(--space-2)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="var(--accent-primary)" />
                              {item.location}
                            </span>

                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <UserCheck size={13} color="var(--accent-primary)" />
                              Lead: {item.responsibleRole}
                            </span>

                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} />
                              Est. Duration: {duration}
                            </span>
                          </div>

                          {/* Notes / Cues */}
                          {item.notes && (
                            <p
                              style={{
                                marginTop: 'var(--space-2)',
                                marginBottom: 0,
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--surface-raised)',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: `2px solid ${ritual.color}`,
                                lineHeight: 1.5,
                              }}
                            >
                              💡 <strong>Cue / Note:</strong> {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Action buttons (Hidden in print) */}
                        <div className="no-print" style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            style={{ padding: '4px 8px' }}
                            title="Edit milestone"
                            aria-label={`Edit milestone ${item.activity}`}
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onDeleteScheduleItem(item.id);
                              toast.showToast(`Deleted milestone: ${item.activity}`, 'info');
                            }}
                            style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                            title="Remove milestone"
                            aria-label={`Remove milestone ${item.activity}`}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}

            {/* If all items ended before 10 PM, render the curfew notice at the bottom */}
            {curfewIndex === -1 && sortedItems.length > 0 && (
              <div
                className="curfew-divider"
                role="note"
                aria-label="10:00 PM Municipal Sound Curfew"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  margin: 'var(--space-2) 0',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '2px dashed var(--color-warning-border)',
                  color: 'var(--color-warning-text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 800, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                  <Volume2 size={18} color="var(--color-warning)" />
                  <span>Curfew: Move Indoors (10:00 PM)</span>
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-warning-text)',
                    lineHeight: 1.4,
                    borderLeft: '2px solid var(--color-warning-border)',
                    paddingLeft: 'var(--space-3)',
                  }}
                  title="Rule 9 Protocol: Outdoor amplified music, Dhol processions, and Baraats must transition indoors by 10:00 PM."
                >
                  <strong>Rule 9 Protocol:</strong> Any extended festivities, after-parties, or Dhol after 10:00 PM must transition indoors.
                </div>
              </div>
            )}
          </ol>
        )}
      </Card>

      {/* =====================================================================
          5. ADD / EDIT ITINERARY MODAL
          ===================================================================== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingId ? 'Edit Day-of Milestone' : 'Add Day-of Schedule Milestone'}
        subtitle="Coordinate vendor cues, sound equipment switches, and ritual timings."
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="sch-time" className="form-label">
                <span>Time / Timing *</span>
              </label>
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
              <label htmlFor="sch-role" className="form-label">
                <span>Responsible Role / Lead *</span>
              </label>
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
            <label htmlFor="sch-act" className="form-label">
              <span>Activity Description *</span>
            </label>
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
            <label htmlFor="sch-loc" className="form-label">
              <span>Location / Zone *</span>
            </label>
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
            <label htmlFor="sch-notes" className="form-label">
              <span>Cues, Mic Checks & Notes (Optional)</span>
            </label>
            <textarea
              id="sch-notes"
              rows={2}
              className="form-control"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Ensure sound engineer switches to indoor speakers at 10 PM sharp"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {editingId ? 'Save Changes' : 'Add Milestone'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
