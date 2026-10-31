import React, { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Utensils,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  MessageCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { GuestItem, RsvpStatus, DietaryRequirement, EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge, Modal, EmptyState, useToast } from '../ui';
import { useVirtualList } from '../../hooks/useVirtualList';
import { WhatsAppInviteModal } from './WhatsAppInviteModal';
import { TableSeatingPlanner } from './TableSeatingPlanner';

interface GuestManagerProps {
  plan: EventPlan;
  onAddGuest: (guest: Omit<GuestItem, 'id'>) => void;
  onUpdateGuest: (id: string, updates: Partial<GuestItem>) => void;
  onDeleteGuest: (id: string) => void;
  isLoading?: boolean;
}

const DIETARY_LABELS: Record<DietaryRequirement, string> = {
  none: 'Standard / None',
  vegetarian: 'Vegetarian',
  jain: 'Jain (No Root Veg)',
  pure_veg: 'Pure Veg (Sattvic)',
  vegan: 'Vegan',
  gluten_free: 'Gluten-Free',
  halal: 'Halal',
  kosher: 'Kosher',
  nut_allergy: 'Nut Allergy',
};

const DIETARY_TOOLTIPS: Record<DietaryRequirement, string> = {
  none: 'Standard meal options',
  vegetarian: 'Standard vegetarian meal',
  jain: 'No onion, garlic or root vegetables',
  pure_veg: 'Pure vegetarian Sattvic preparation without meat or eggs',
  vegan: '100% plant-based, dairy-free',
  gluten_free: 'Gluten-free / Celiac safe preparation',
  halal: 'Halal certified meat and utensils',
  kosher: 'Kosher certified preparation',
  nut_allergy: 'Severe nut allergy - cross contamination safeguard',
};

const DIETARY_BADGE_COLORS: Record<DietaryRequirement, string> = {
  none: 'var(--text-muted)',
  vegetarian: '#047857',
  jain: '#c2410c',
  pure_veg: '#15803d',
  vegan: '#047857',
  gluten_free: '#b45309',
  halal: '#6d28d9',
  kosher: '#1d4ed8',
  nut_allergy: '#b91c1c',
};

type FilterChip =
  | 'all'
  | 'confirmed'
  | 'pending'
  | 'declined'
  | 'jain'
  | 'pure_veg'
  | 'halal'
  | 'gluten_free'
  | 'has_plus_one';

type SortOption = 'name_asc' | 'name_desc' | 'status' | 'table';

interface GuestTableRowProps {
  guest: GuestItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onQuickRsvpChange: (guest: GuestItem, status: RsvpStatus) => void;
  onOpenEdit: (guest: GuestItem) => void;
  onDeleteGuest: (id: string, name: string) => void;
}

const GuestTableRow = React.memo<GuestTableRowProps>(({
  guest,
  isSelected,
  onToggleSelect,
  onQuickRsvpChange,
  onOpenEdit,
  onDeleteGuest,
}) => {
  return (
    <tr
      key={guest.id}
      style={{
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--accent-subtle)' : 'transparent',
        transition: 'background var(--transition-fast)',
      }}
    >
      <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(guest.id)}
          aria-label={`Select ${guest.name}`}
          style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
        />
      </td>
      <th scope="row" style={{ padding: 'var(--space-3) var(--space-2)', fontWeight: 'normal', textAlign: 'left' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{guest.name}</div>
        {guest.email && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{guest.email}</div>
        )}
        {guest.notes && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {guest.notes}
          </div>
        )}
      </th>
      <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
        <select
          className="form-control"
          style={{
            fontSize: 'var(--text-xs)',
            height: '32px',
            minHeight: '32px',
            width: '125px',
            fontWeight: 600,
            color:
              guest.rsvpStatus === 'attending'
                ? 'var(--color-success)'
                : guest.rsvpStatus === 'declined'
                ? 'var(--color-danger)'
                : 'var(--color-warning)',
          }}
          value={guest.rsvpStatus}
          onChange={(e) => onQuickRsvpChange(guest, e.target.value as RsvpStatus)}
          aria-label={`Change RSVP status for ${guest.name}`}
        >
          <option value="attending">✓ Confirmed</option>
          <option value="pending">⏳ Pending</option>
          <option value="declined">✕ Declined</option>
        </select>
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
        {guest.dietary && guest.dietary !== 'none' ? (
          <span role="note"
            aria-label={`${DIETARY_LABELS[guest.dietary]}: ${DIETARY_TOOLTIPS[guest.dietary]}`}
            title={DIETARY_TOOLTIPS[guest.dietary]}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              backgroundColor: 'var(--surface-subtle)',
              color: DIETARY_BADGE_COLORS[guest.dietary],
              border: `1px solid ${DIETARY_BADGE_COLORS[guest.dietary]}60`,
              cursor: 'help',
            }}
          >
            <Utensils size={12} />
            {DIETARY_LABELS[guest.dietary]}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Standard</span>
        )}
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
        {guest.plusOne ? (
          <Badge variant="info">
            +1 {guest.plusOneName ? `(${guest.plusOneName})` : ''}
          </Badge>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Solo</span>
        )}
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
        {guest.tableNumber ? (
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 'var(--text-xs)' }}>
            {guest.tableNumber}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Unassigned
          </span>
        )}
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenEdit(guest)}
            style={{ padding: '4px 8px' }}
            title="Edit guest details"
            aria-label={`Edit ${guest.name}`}
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteGuest(guest.id, guest.name)}
            style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
            title="Delete guest"
            aria-label={`Delete ${guest.name}`}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  );
});

export const GuestManager: React.FC<GuestManagerProps> = ({
  plan,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
  isLoading = false,
}) => {
  const toast = useToast();
  const guests = useMemo(() => plan.guests || [], [plan.guests]);

  // Filters & Search & Sort
  const [filterChip, setFilterChip] = useState<FilterChip>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');

  const deferredFilterChip = useDeferredValue(filterChip);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignTableModal, setShowAssignTableModal] = useState(false);
  const [bulkTableValue, setBulkTableValue] = useState('');

  // Add/Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  // WhatsApp Invite and View Mode state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [viewMode, setViewMode] = useState<'directory' | 'seating'>('directory');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRsvp, setFormRsvp] = useState<RsvpStatus>('pending');
  const [formDietary, setFormDietary] = useState<DietaryRequirement>('none');
  const [formPlusOne, setFormPlusOne] = useState(false);
  const [formPlusOneName, setFormPlusOneName] = useState('');
  const [formTable, setFormTable] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTouched, setFormTouched] = useState(false);

  // Focus restore ref
  const addGuestButtonRef = useRef<HTMLButtonElement>(null);

  // Metrics and filter counts in a single pass (+1s included for headcount)
  const { stats, filterCounts } = useMemo(() => {
    let confirmedHeads = 0;
    let pendingCount = 0;
    let declinedCount = 0;
    let jainOrPureVegCount = 0;

    const counts = {
      all: guests.length,
      confirmed: 0,
      pending: 0,
      declined: 0,
      jain: 0,
      pure_veg: 0,
      halal: 0,
      gluten_free: 0,
      has_plus_one: 0,
    };

    for (const g of guests) {
      const seats = g.plusOne ? 2 : 1;
      if (g.rsvpStatus === 'attending') {
        confirmedHeads += seats;
        counts.confirmed += 1;
        if (g.dietary === 'jain' || g.dietary === 'pure_veg') {
          jainOrPureVegCount += 1;
        }
      } else if (g.rsvpStatus === 'pending') {
        pendingCount += seats;
        counts.pending += 1;
      } else if (g.rsvpStatus === 'declined') {
        declinedCount += seats;
        counts.declined += 1;
      }

      if (g.dietary === 'jain') counts.jain += 1;
      if (g.dietary === 'pure_veg' || g.dietary === 'vegetarian') counts.pure_veg += 1;
      if (g.dietary === 'halal') counts.halal += 1;
      if (g.dietary === 'gluten_free') counts.gluten_free += 1;
      if (g.plusOne) counts.has_plus_one += 1;
    }

    const targetCapacity = Math.max(1, plan.guestCount);
    const capacityPct = Math.round((confirmedHeads / targetCapacity) * 100);

    return {
      stats: {
        invited: plan.guestCount,
        confirmedHeads,
        pendingCount,
        declinedCount,
        jainOrPureVegCount,
        capacityPct,
        isCapacityWarning: capacityPct > 90 && capacityPct <= 100,
        isCapacityDanger: capacityPct > 100,
      },
      filterCounts: counts,
    };
  }, [guests, plan.guestCount]);

  // Filtered & Sorted guests list using deferred inputs for responsiveness
  const filteredGuests = useMemo(() => {
    let list = guests.filter((g) => {
      // Filter chip
      if (deferredFilterChip === 'confirmed' && g.rsvpStatus !== 'attending') return false;
      if (deferredFilterChip === 'pending' && g.rsvpStatus !== 'pending') return false;
      if (deferredFilterChip === 'declined' && g.rsvpStatus !== 'declined') return false;
      if (deferredFilterChip === 'jain' && g.dietary !== 'jain') return false;
      if (deferredFilterChip === 'pure_veg' && g.dietary !== 'pure_veg' && g.dietary !== 'vegetarian' && g.dietary !== 'jain') return false;
      if (deferredFilterChip === 'halal' && g.dietary !== 'halal') return false;
      if (deferredFilterChip === 'gluten_free' && g.dietary !== 'gluten_free') return false;
      if (deferredFilterChip === 'has_plus_one' && !g.plusOne) return false;

      // Search query
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesPlusOne = g.plusOneName?.toLowerCase().includes(q);
        const matchesTable = g.tableNumber?.toLowerCase().includes(q);
        const matchesNotes = g.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesPlusOne && !matchesTable && !matchesNotes) return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'status') return a.rsvpStatus.localeCompare(b.rsvpStatus);
      if (sortBy === 'table') return (a.tableNumber || '').localeCompare(b.tableNumber || '');
      return 0;
    });

    return list;
  }, [guests, deferredFilterChip, deferredSearchQuery, sortBy]);

  // Windowing for large guest sets (>100 items)
  const {
    visibleItems,
    isVirtual,
    topSpacerHeight,
    bottomSpacerHeight,
    containerRef,
    onScroll,
  } = useVirtualList(filteredGuests, { itemHeight: 64, threshold: 100 });

  // Bulk Selection Handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredGuests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGuests.map((g) => g.id)));
    }
  }, [selectedIds.size, filteredGuests]);

  const handleBulkMarkConfirmed = () => {
    selectedIds.forEach((id) => {
      onUpdateGuest(id, { rsvpStatus: 'attending' });
    });
    toast.showToast(`Marked ${selectedIds.size} guests as Confirmed`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkAssignTable = (table: string) => {
    selectedIds.forEach((id) => {
      onUpdateGuest(id, { tableNumber: table.trim() || undefined });
    });
    toast.showToast(`Assigned ${selectedIds.size} guests to ${table}`, 'success');
    setSelectedIds(new Set());
    setShowAssignTableModal(false);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} guests?`)) {
      selectedIds.forEach((id) => onDeleteGuest(id));
      toast.showToast(`Deleted ${selectedIds.size} guests`, 'info');
      setSelectedIds(new Set());
    }
  };

  // Modal Handlers
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
    setFormTouched(false);
    setShowModal(true);
  };

  const handleOpenEdit = useCallback((guest: GuestItem) => {
    setEditingGuestId(guest.id);
    setFormName(guest.name);
    setFormEmail(guest.email || '');
    setFormRsvp(guest.rsvpStatus);
    setFormDietary(guest.dietary);
    setFormPlusOne(guest.plusOne);
    setFormPlusOneName(guest.plusOneName || '');
    setFormTable(guest.tableNumber || '');
    setFormNotes(guest.notes || '');
    setFormTouched(false);
    setShowModal(true);
  }, []);

  const handleModalClose = () => {
    setShowModal(false);
    addGuestButtonRef.current?.focus();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormTouched(true);
      return;
    }

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
      toast.showToast(`Updated guest ${formName.trim()}`, 'success');
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
      toast.showToast(`Added ${formName.trim()} to guest list`, 'success');
    }

    handleModalClose();
  };

  const handleQuickRsvpChange = useCallback((guest: GuestItem, newStatus: RsvpStatus) => {
    onUpdateGuest(guest.id, { rsvpStatus: newStatus });
    toast.showToast(`RSVP updated to ${newStatus === 'attending' ? 'Confirmed' : newStatus}`, 'info');
  }, [onUpdateGuest, toast]);

  const handleDeleteGuest = useCallback((id: string, name: string) => {
    onDeleteGuest(id);
    toast.showToast(`Removed ${name}`, 'info');
  }, [onDeleteGuest, toast]);

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
          1. STATS STRIP & CAPACITY BAR (Rule 6: Amber > 90%, Red > 100%)
          ===================================================================== */}
      <div
        className="guest-stats-strip"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {/* Target Invited */}
        <div
          className="stat-card"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Target Headcount
          </span>
          <div className="stat-value tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text)', margin: '4px 0' }}>
            {stats.invited}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Planned venue capacity
          </span>
        </div>

        {/* Confirmed (+1s included) */}
        <div
          className="stat-card"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Confirmed (+1s included)
          </span>
          <div
            className="stat-value tabular-nums"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: stats.isCapacityDanger ? 'var(--color-danger)' : stats.isCapacityWarning ? 'var(--color-warning)' : 'var(--color-success)',
              margin: '4px 0',
            }}
          >
            {stats.confirmedHeads}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {stats.capacityPct}% of venue target
          </span>
        </div>

        {/* Pending */}
        <div
          className="stat-card"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Pending Awaiting RSVP
          </span>
          <div className="stat-value tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-warning)', margin: '4px 0' }}>
            {stats.pendingCount}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Follow-ups needed
          </span>
        </div>

        {/* Declined */}
        <div
          className="stat-card"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Declined / Regrets
          </span>
          <div className="stat-value tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-muted)', margin: '4px 0' }}>
            {stats.declinedCount}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Released seating capacity
          </span>
        </div>
      </div>

      {/* Capacity Progress Bar with Thresholds */}
      <Card variant="subtle" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Users size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
              RSVP Headcount Capacity Bar
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 800,
              color: stats.isCapacityDanger ? 'var(--color-danger)' : stats.isCapacityWarning ? 'var(--color-warning)' : 'var(--color-success)',
            }}
          >
            {stats.confirmedHeads} / {stats.invited} ({stats.capacityPct}%)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, stats.capacityPct)}%`,
              height: '100%',
              background: stats.isCapacityDanger
                ? 'var(--color-danger)'
                : stats.isCapacityWarning
                ? 'var(--color-warning)'
                : 'var(--color-success)',
              transition: 'width var(--transition-normal)',
            }}
          />
        </div>

        {stats.isCapacityDanger ? (
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 600 }}>
            ⚠ Rule 6 Triggered: RSVP headcount exceeds planned venue capacity by {stats.confirmedHeads - stats.invited} attendees. Recalculate catering portions, table rentals, and fire safety limits.
          </div>
        ) : stats.isCapacityWarning ? (
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontWeight: 600 }}>
            ⚠ Approaching planned capacity ({stats.capacityPct}%). Prepare to lock guest confirmations soon.
          </div>
        ) : null}
      </Card>

      {/* =====================================================================
          2. PERSISTENT JAIN / PURE VEG KITCHEN COUNTER BANNER (Rule 8)
          ===================================================================== */}
      {stats.jainOrPureVegCount > 0 && (
        <Card variant="subtle" style={{ borderLeft: '4px solid #ea580c', background: 'rgba(234, 88, 12, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <AlertTriangle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#ea580c', margin: '0 0 2px 0' }}>
                Dedicated Pure Veg / Jain Kitchen Counter Required
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                <strong>{stats.jainOrPureVegCount} guests</strong> require Jain (no onion/garlic/root veg) or Sattvic Pure Vegetarian preparation. Ensure your caterer sets up an isolated preparation counter, distinct serving ladles, and clear signage.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* =====================================================================
          3. MAIN GUEST LIST CARD: Toolbar, Real Table, Bulk Actions
          ===================================================================== */}
      <Card>
        <CardHeader
          headingLevel="h2"
          title="Guest List & RSVP Manager"
          icon={<Users size={20} color="var(--accent-primary)" />}
          subtitle="Track invitations, dietary protocols, plus-ones, and seating arrangements."
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWhatsAppModal(true)}
                leadingIcon={<MessageCircle size={15} color="#25d366" />}
              >
                WhatsApp Invites
              </Button>
              <Button
                ref={addGuestButtonRef}
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                leadingIcon={<Plus size={16} />}
                id="btn-add-guest"
              >
                Add Guest
              </Button>
            </div>
          }
        />

        {/* View Switcher: Directory vs Table Seating */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
          <button
            type="button"
            className={`chip ${viewMode === 'directory' ? 'chip-active' : ''}`}
            onClick={() => setViewMode('directory')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 14px' }}
          >
            <List size={14} />
            <span>Guest Directory ({guests.length})</span>
          </button>
          <button
            type="button"
            className={`chip ${viewMode === 'seating' ? 'chip-active' : ''}`}
            onClick={() => setViewMode('seating')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 14px' }}
          >
            <LayoutGrid size={14} />
            <span>Table Seating Planner</span>
          </button>
        </div>

        {viewMode === 'seating' ? (
          <TableSeatingPlanner guests={guests} onUpdateGuest={onUpdateGuest} />
        ) : (
          <>
            {/* Toolbar: Search, Filters, Sort */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <label htmlFor="guest-search-input" className="sr-only">
                Search guest list
              </label>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                id="guest-search-input"
                type="text"
                placeholder="Search guest, table, or notes..."
                className="form-control"
                style={{ paddingLeft: '32px', height: '36px', minHeight: '36px', fontSize: 'var(--text-xs)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search guest list"
              />
            </div>

            {/* Sort Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label htmlFor="guest-sort" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                Sort:
              </label>
              <select
                id="guest-sort"
                className="form-control"
                style={{ height: '36px', minHeight: '36px', fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort guest list"
              >
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="status">RSVP Status</option>
                <option value="table">Table Number</option>
              </select>
            </div>
          </div>

          {/* Filter Chips: All, Confirmed, Pending, Declined, Jain, Pure Veg, Halal, Gluten-free, Has +1 */}
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant={filterChip === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('all')}
              aria-pressed={filterChip === 'all'}
            >
              All ({filterCounts.all})
            </Button>
            <Button
              variant={filterChip === 'confirmed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('confirmed')}
              leadingIcon={<UserCheck size={13} />}
              aria-pressed={filterChip === 'confirmed'}
            >
              Confirmed ({filterCounts.confirmed})
            </Button>
            <Button
              variant={filterChip === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('pending')}
              leadingIcon={<Clock size={13} />}
              aria-pressed={filterChip === 'pending'}
            >
              Pending ({filterCounts.pending})
            </Button>
            <Button
              variant={filterChip === 'declined' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('declined')}
              leadingIcon={<UserX size={13} />}
              aria-pressed={filterChip === 'declined'}
            >
              Declined ({filterCounts.declined})
            </Button>
            <Button
              variant={filterChip === 'jain' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('jain')}
              style={filterChip === 'jain' ? {} : { borderColor: '#ea580c', color: '#ea580c' }}
              aria-pressed={filterChip === 'jain'}
            >
              🥗 Jain ({filterCounts.jain})
            </Button>
            <Button
              variant={filterChip === 'pure_veg' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('pure_veg')}
              style={filterChip === 'pure_veg' ? {} : { borderColor: '#16a34a', color: '#16a34a' }}
              aria-pressed={filterChip === 'pure_veg'}
            >
              🌱 Pure Veg ({filterCounts.pure_veg})
            </Button>
            <Button
              variant={filterChip === 'halal' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('halal')}
              aria-pressed={filterChip === 'halal'}
            >
              Halal ({filterCounts.halal})
            </Button>
            <Button
              variant={filterChip === 'gluten_free' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('gluten_free')}
              aria-pressed={filterChip === 'gluten_free'}
            >
              Gluten-free ({filterCounts.gluten_free})
            </Button>
            <Button
              variant={filterChip === 'has_plus_one' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterChip('has_plus_one')}
              aria-pressed={filterChip === 'has_plus_one'}
            >
              Has +1 ({filterCounts.has_plus_one})
            </Button>
          </div>
        </div>

        {/* Screen Reader Live Region announcing filter count */}
        <div aria-live="polite" role="status" className="sr-only">
          Showing {filteredGuests.length} of {guests.length} guests for {filterChip} filter
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-text)' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'guest' : 'guests'} selected
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button variant="primary" size="sm" onClick={handleBulkMarkConfirmed}>
                Mark Confirmed
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowAssignTableModal(true)}>
                Assign Table
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Main Table (Semantic HTML) */}
        {filteredGuests.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={36} color="var(--color-success)" />}
            title="No guests found"
            description="No guests match your current search and filter settings. Clear filters or add a new guest."
            action={
              filterChip !== 'all' || searchQuery ? (
                <Button variant="secondary" size="sm" onClick={() => { setFilterChip('all'); setSearchQuery(''); }}>
                  Reset Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            ref={containerRef}
            onScroll={onScroll}
            style={{
              overflowX: 'auto',
              maxHeight: isVirtual ? '600px' : undefined,
              overflowY: isVirtual ? 'auto' : undefined,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <caption className="sr-only">Guest list with RSVP status, dietary preferences, and seating assignments</caption>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredGuests.length && filteredGuests.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all guests in view"
                      style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                  </th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)' }}>Guest Name</th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)' }}>RSVP Status</th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)' }}>Dietary Protocol</th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)' }}>Plus-One (+1)</th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)' }}>Table Number</th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isVirtual && topSpacerHeight > 0 && (
                  <tr style={{ height: `${topSpacerHeight}px` }} aria-hidden="true">
                    <td colSpan={7} aria-hidden="true" style={{ padding: 0, border: 'none' }}>Spacer</td>
                  </tr>
                )}
                {visibleItems.map((guest) => {
                  const isSelected = selectedIds.has(guest.id);
                  return (
                    <GuestTableRow
                      key={guest.id}
                      guest={guest}
                      isSelected={isSelected}
                      onToggleSelect={handleToggleSelect}
                      onQuickRsvpChange={handleQuickRsvpChange}
                      onOpenEdit={handleOpenEdit}
                      onDeleteGuest={handleDeleteGuest}
                    />
                  );
                })}
                {isVirtual && bottomSpacerHeight > 0 && (
                  <tr style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true">
                    <td colSpan={7} aria-hidden="true" style={{ padding: 0, border: 'none' }}>Spacer</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}
  </Card>

      {/* =====================================================================
          4. ADD / EDIT GUEST MODAL (Stepper, Segmented Control, Chips)
          ===================================================================== */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={editingGuestId ? 'Edit Guest Details' : 'Add New Guest to Event'}
      >
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="gst-name" className="form-label">
                <span>Guest Full Name *</span>
              </label>
              <input
                id="gst-name"
                type="text"
                className="form-control"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onBlur={() => setFormTouched(true)}
                placeholder="e.g. Vikramaditya Rathore"
                aria-describedby="gst-name-error"
                required
              />
              {formTouched && !formName.trim() && (
                <span id="gst-name-error" role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Guest name is required.
                </span>
              )}
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="gst-email" className="form-label">
                <span>Email Address (Optional for RSVP Tracking)</span>
              </label>
              <input
                id="gst-email"
                type="email"
                className="form-control"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. vikram@example.com"
              />
            </div>

            {/* RSVP Segmented Control */}
            <div className="form-group">
              <span className="form-label">
                <span>RSVP Response Status</span>
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                {(['attending', 'pending', 'declined'] as RsvpStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFormRsvp(st)}
                    style={{
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `2px solid ${formRsvp === st ? 'var(--accent-primary)' : 'var(--border)'}`,
                      background: formRsvp === st ? 'var(--accent-subtle)' : 'var(--surface-raised)',
                      color: formRsvp === st ? 'var(--accent-text)' : 'var(--text)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {st === 'attending' ? '✓ Confirmed' : st === 'pending' ? '⏳ Pending' : '✕ Declined'}
                  </button>
                ))}
              </div>
            </div>

            {/* Plus-One Stepper & Name */}
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
                  Plus-One Companion (+1)
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <Button
                    type="button"
                    variant={!formPlusOne ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setFormPlusOne(false)}
                  >
                    Solo (+0)
                  </Button>
                  <Button
                    type="button"
                    variant={formPlusOne ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setFormPlusOne(true)}
                  >
                    With Companion (+1)
                  </Button>
                </div>
              </div>

              {formPlusOne && (
                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                  <label htmlFor="gst-plus-name" className="form-label">
                    <span>Companion's Full Name</span>
                  </label>
                  <input
                    id="gst-plus-name"
                    type="text"
                    className="form-control"
                    value={formPlusOneName}
                    onChange={(e) => setFormPlusOneName(e.target.value)}
                    placeholder="e.g. Radhika Rathore"
                  />
                </div>
              )}
            </div>

            {/* Dietary Requirement Chips */}
            <div className="form-group">
              <span className="form-label">
                <span>Dietary Requirement & Guardrails</span>
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {(['none', 'pure_veg', 'jain', 'halal', 'gluten_free', 'vegan', 'nut_allergy'] as DietaryRequirement[]).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormDietary(d)}
                      title={DIETARY_TOOLTIPS[d]}
                      style={{
                        padding: 'var(--space-1) var(--space-3)',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${formDietary === d ? 'var(--accent-primary)' : 'var(--border)'}`,
                        background: formDietary === d ? 'var(--accent-subtle)' : 'var(--surface-raised)',
                        color: formDietary === d ? 'var(--accent-text)' : 'var(--text)',
                        transition: 'all var(--transition-fast)',
                        minHeight: '36px',
                      }}
                    >
                      {formDietary === d ? '✓ ' : '+ '}
                      {DIETARY_LABELS[d]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Table Number & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label htmlFor="gst-table" className="form-label">
                  <span>Table Number</span>
                </label>
                <input
                  id="gst-table"
                  type="text"
                  className="form-control"
                  value={formTable}
                  onChange={(e) => setFormTable(e.target.value)}
                  placeholder="e.g. Table 4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gst-notes" className="form-label">
                  <span>Seating Notes / Family Group</span>
                </label>
                <input
                  id="gst-notes"
                  type="text"
                  className="form-control"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Bride's maternal side, needs elder priority seat"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="secondary" size="md" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" leadingIcon={<Sparkles size={16} />}>
                {editingGuestId ? 'Save Changes' : 'Add Guest'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          5. ASSIGN TABLE MODAL (Bulk action)
          ===================================================================== */}
      <Modal
        isOpen={showAssignTableModal}
        onClose={() => setShowAssignTableModal(false)}
        title="Assign Table to Selected Guests"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Assigning table number to <strong>{selectedIds.size}</strong> selected guests.
          </p>
          <div className="form-group">
            <label htmlFor="bulk-table-input" className="form-label">
              <span>Table Designation</span>
            </label>
            <input
              id="bulk-table-input"
              type="text"
              className="form-control"
              value={bulkTableValue}
              onChange={(e) => setBulkTableValue(e.target.value)}
              placeholder="e.g. Table 5 — Royal Haveli Terrace"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="secondary" size="md" onClick={() => setShowAssignTableModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={() => handleBulkAssignTable(bulkTableValue)}>
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Invite Broadcast Modal */}
      <WhatsAppInviteModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        plan={plan}
      />
    </div>
  );
};
