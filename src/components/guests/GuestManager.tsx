import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Utensils,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { GuestItem, RsvpStatus, DietaryRequirement, EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge, Modal, EmptyState } from '../common';

interface GuestManagerProps {
  plan: EventPlan;
  onAddGuest: (guest: Omit<GuestItem, 'id'>) => void;
  onUpdateGuest: (id: string, updates: Partial<GuestItem>) => void;
  onDeleteGuest: (id: string) => void;
}

const DIETARY_LABELS: Record<DietaryRequirement, string> = {
  none: 'Standard / None',
  vegetarian: 'Vegetarian',
  jain: 'Jain (No Onion/Garlic/Roots)',
  pure_veg: 'Pure Vegetarian (Sattvic)',
  vegan: 'Vegan',
  gluten_free: 'Gluten-Free (Celiac)',
  halal: 'Halal',
  kosher: 'Kosher',
  nut_allergy: 'Nut Allergy (Severe)',
};

const DIETARY_BADGE_COLORS: Record<DietaryRequirement, string> = {
  none: '#64748b',
  vegetarian: '#10b981',
  jain: '#ea580c',
  pure_veg: '#16a34a',
  vegan: '#059669',
  gluten_free: '#f59e0b',
  halal: '#8b5cf6',
  kosher: '#3b82f6',
  nut_allergy: '#ef4444',
};

export const GuestManager: React.FC<GuestManagerProps> = ({
  plan,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
}) => {
  const guests = useMemo(() => plan.guests || [], [plan.guests]);

  const [statusFilter, setStatusFilter] = useState<'all' | RsvpStatus | 'jain' | 'pure_veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRsvp, setFormRsvp] = useState<RsvpStatus>('pending');
  const [formDietary, setFormDietary] = useState<DietaryRequirement>('none');
  const [formPlusOne, setFormPlusOne] = useState(false);
  const [formPlusOneName, setFormPlusOneName] = useState('');
  const [formTable, setFormTable] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Metrics
  const stats = useMemo(() => {
    let attending = 0;
    let pending = 0;
    let declined = 0;
    let totalHeadcount = 0;
    const dietaryMap: Partial<Record<DietaryRequirement, number>> = {};

    guests.forEach((g) => {
      const seats = g.plusOne ? 2 : 1;
      if (g.rsvpStatus === 'attending') {
        attending += seats;
        totalHeadcount += seats;
        if (g.dietary && g.dietary !== 'none') {
          dietaryMap[g.dietary] = (dietaryMap[g.dietary] || 0) + 1;
        }
      } else if (g.rsvpStatus === 'pending') {
        pending += seats;
        totalHeadcount += seats;
      } else if (g.rsvpStatus === 'declined') {
        declined += seats;
      }
    });

    return { attending, pending, declined, totalHeadcount, dietaryMap };
  }, [guests]);

  // Filtered list
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (statusFilter === 'jain') {
        if (g.dietary !== 'jain') return false;
      } else if (statusFilter === 'pure_veg') {
        if (g.dietary !== 'pure_veg' && g.dietary !== 'vegetarian' && g.dietary !== 'jain') return false;
      } else if (statusFilter !== 'all') {
        if (g.rsvpStatus !== statusFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesPlusOne = g.plusOneName?.toLowerCase().includes(q);
        const matchesTable = g.tableNumber?.toLowerCase().includes(q);
        if (!matchesName && !matchesPlusOne && !matchesTable) return false;
      }
      return true;
    });
  }, [guests, statusFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingGuestId(null);
    setFormName('');
    setFormEmail('');
    setFormRsvp('pending');
    setFormDietary('none');
    setFormPlusOne(false);
    setFormPlusOneName('');
    setFormTable('');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (guest: GuestItem) => {
    setEditingGuestId(guest.id);
    setFormName(guest.name);
    setFormEmail(guest.email || '');
    setFormRsvp(guest.rsvpStatus);
    setFormDietary(guest.dietary);
    setFormPlusOne(guest.plusOne);
    setFormPlusOneName(guest.plusOneName || '');
    setFormTable(guest.tableNumber || '');
    setFormNotes(guest.notes || '');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingGuestId) {
      onUpdateGuest(editingGuestId, {
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        rsvpStatus: formRsvp,
        dietary: formDietary,
        plusOne: formPlusOne,
        plusOneName: formPlusOne ? formPlusOneName.trim() || undefined : undefined,
        tableNumber: formTable.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddGuest({
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        rsvpStatus: formRsvp,
        dietary: formDietary,
        plusOne: formPlusOne,
        plusOneName: formPlusOne ? formPlusOneName.trim() || undefined : undefined,
        tableNumber: formTable.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }

    setShowAddModal(false);
  };

  const jainCount = (stats.dietaryMap['jain'] || 0);
  const pureVegCount = (stats.dietaryMap['pure_veg'] || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Overview Cards */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Confirmed Attending</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {stats.attending}
          </span>
          <span className="stat-subtext">Target: {plan.guestCount} guests</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Awaiting Response</span>
          <span className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {stats.pending}
          </span>
          <span className="stat-subtext">Invitations sent</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Declined / Regrets</span>
          <span className="stat-value" style={{ color: 'var(--text-muted)' }}>
            {stats.declined}
          </span>
          <span className="stat-subtext">Seats released</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Special Dietary Needs</span>
          <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {Object.values(stats.dietaryMap).reduce((a, b) => a + (b || 0), 0)}
          </span>
          <span className="stat-subtext">
            {jainCount > 0 ? `${jainCount} Jain` : ''} {pureVegCount > 0 ? `${pureVegCount} Pure Veg` : ''}
          </span>
        </div>
      </div>

      {/* Cultural Dietary Isolation Alert if Jain or Pure Veg Guests Exist */}
      {(jainCount > 0 || pureVegCount > 0) && (
        <div className="alert-box alert-warning" role="status">
          <AlertTriangle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Cultural Guardrail Active: Dedicated Kitchen Counters Required
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>
              You have {jainCount} Jain and {pureVegCount} Pure Veg attending guests. In accordance with Vedic dietary protocols, ensure the catering team designates an isolated preparation counter and separate serving ladles (No onion, garlic, or root vegetables).
            </p>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title="Guest List & RSVP Manager"
          icon={<Users size={20} color="var(--accent-primary)" />}
          subtitle="Track attendance, plus-ones, meal preferences, and seating assignments."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus size={15} />}
            >
              Add Guest
            </Button>
          }
        />

        {/* Filter and Search Bar with Quick Chips */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({guests.length})
            </Button>
            <Button
              variant={statusFilter === 'attending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('attending')}
            >
              Attending ({guests.filter((g) => g.rsvpStatus === 'attending').length})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({guests.filter((g) => g.rsvpStatus === 'pending').length})
            </Button>
            <Button
              variant={statusFilter === 'declined' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('declined')}
            >
              Declined ({guests.filter((g) => g.rsvpStatus === 'declined').length})
            </Button>
            <Button
              variant={statusFilter === 'jain' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('jain')}
              style={{ borderColor: '#ea580c' }}
            >
              🥗 Jain ({guests.filter((g) => g.dietary === 'jain').length})
            </Button>
            <Button
              variant={statusFilter === 'pure_veg' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('pure_veg')}
              style={{ borderColor: '#16a34a' }}
            >
              🌱 Pure Veg
            </Button>
          </div>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search guest or table..."
              className="form-control"
              style={{ paddingLeft: '32px', height: '36px', minHeight: '36px', fontSize: '0.8125rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Guests Table */}
        {filteredGuests.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={36} color="var(--color-success)" />}
            title="No guests found"
            description="No guests match your current filter criteria. Clear filters or add a new guest."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Guest Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>RSVP Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Dietary Protocol</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Plus One</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Table / Group</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => {
                  return (
                    <tr
                      key={guest.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{guest.name}</div>
                        {guest.email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{guest.email}</div>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <select
                          className="form-control"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '125px', height: '32px', minHeight: '32px' }}
                          value={guest.rsvpStatus}
                          onChange={(e) => onUpdateGuest(guest.id, { rsvpStatus: e.target.value as RsvpStatus })}
                        >
                          <option value="attending">✓ Attending</option>
                          <option value="pending">⏳ Pending</option>
                          <option value="declined">✕ Declined</option>
                        </select>
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {guest.dietary && guest.dietary !== 'none' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: `${DIETARY_BADGE_COLORS[guest.dietary]}18`,
                              color: DIETARY_BADGE_COLORS[guest.dietary],
                              border: `1px solid ${DIETARY_BADGE_COLORS[guest.dietary]}50`,
                            }}
                          >
                            <Utensils size={11} />
                            {DIETARY_LABELS[guest.dietary]}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standard</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {guest.plusOne ? (
                          <Badge variant="info" size="sm">
                            +1 {guest.plusOneName ? `(${guest.plusOneName})` : ''}
                          </Badge>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solo</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {guest.tableNumber ? (
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                            {guest.tableNumber}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(guest)}
                          style={{ padding: '4px 8px', marginRight: '4px' }}
                          title="Edit guest details"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDeleteGuest(guest.id)}
                          style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                          title="Remove guest"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal using accessible Modal primitive */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingGuestId ? 'Edit Guest Details' : 'Add New Guest to Event'}
        subtitle="Manage RSVPs, seating assignments, and cultural dietary needs."
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="gst-name" className="form-label">Full Name *</label>
            <input
              id="gst-name"
              type="text"
              className="form-control"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Maya Lin"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="gst-email" className="form-label">Email Address (Optional)</label>
            <input
              id="gst-email"
              type="email"
              className="form-control"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. maya@example.com"
            />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="gst-rsvp" className="form-label">RSVP Status</label>
              <select
                id="gst-rsvp"
                className="form-control"
                value={formRsvp}
                onChange={(e) => setFormRsvp(e.target.value as RsvpStatus)}
              >
                <option value="attending">Attending</option>
                <option value="pending">Pending Response</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gst-diet" className="form-label">Dietary Requirement</label>
              <select
                id="gst-diet"
                className="form-control"
                value={formDietary}
                onChange={(e) => setFormDietary(e.target.value as DietaryRequirement)}
              >
                <option value="none">Standard / None</option>
                <option value="jain">Jain (No Onion/Garlic/Roots)</option>
                <option value="pure_veg">Pure Vegetarian (Sattvic)</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten_free">Gluten-Free (Celiac)</option>
                <option value="halal">Halal</option>
                <option value="kosher">Kosher</option>
                <option value="nut_allergy">Nut Allergy (Severe)</option>
              </select>
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formPlusOne}
                onChange={(e) => setFormPlusOne(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Allow Plus One (+1 Guest)</span>
            </label>

            {formPlusOne && (
              <div style={{ marginTop: '0.6rem' }}>
                <label htmlFor="gst-plusname" className="form-label" style={{ fontSize: '0.8125rem' }}>Plus One Name (if known)</label>
                <input
                  id="gst-plusname"
                  type="text"
                  className="form-control"
                  value={formPlusOneName}
                  onChange={(e) => setFormPlusOneName(e.target.value)}
                  placeholder="e.g. Partner / Guest Name"
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="gst-table" className="form-label">Table / Seating Group</label>
            <input
              id="gst-table"
              type="text"
              className="form-control"
              value={formTable}
              onChange={(e) => setFormTable(e.target.value)}
              placeholder="e.g. Table 4 (College Friends) or VIP Booth"
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
              {editingGuestId ? 'Save Changes' : 'Add Guest'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
