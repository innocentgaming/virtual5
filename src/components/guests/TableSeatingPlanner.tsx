import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
} from 'lucide-react';
import type { GuestItem, DietaryRequirement } from '../../types/event';
import { Card, Button, Badge } from '../ui';

interface TableSeatingPlannerProps {
  guests: GuestItem[];
  onUpdateGuest: (id: string, updates: Partial<GuestItem>) => void;
  defaultTableCapacity?: number;
}

const DIETARY_ICONS: Record<DietaryRequirement, string> = {
  none: '',
  vegetarian: '🥦',
  jain: '🌱',
  pure_veg: '🥗',
  vegan: '🥑',
  gluten_free: '🌾',
  halal: '🌙',
  kosher: '✡️',
  nut_allergy: '⚠️',
};

export const TableSeatingPlanner: React.FC<TableSeatingPlannerProps> = ({
  guests,
  onUpdateGuest,
  defaultTableCapacity = 10,
}) => {
  const [newTableName, setNewTableName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTable, setShowAddTable] = useState(false);
  const [customTables, setCustomTables] = useState<string[]>([]);

  // Collect all unique table identifiers
  const tableNames = useMemo(() => {
    const existing = new Set<string>();
    guests.forEach((g) => {
      if (g.tableNumber && g.tableNumber.trim()) {
        existing.add(g.tableNumber.trim());
      }
    });
    customTables.forEach((t) => existing.add(t));
    return Array.from(existing).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [guests, customTables]);

  // Group guests by table
  const { tableGroups, unassigned } = useMemo(() => {
    const groups: Record<string, GuestItem[]> = {};
    tableNames.forEach((t) => {
      groups[t] = [];
    });

    const unassignedList: GuestItem[] = [];

    guests.forEach((g) => {
      const t = g.tableNumber?.trim();
      if (t && groups[t]) {
        groups[t].push(g);
      } else if (t) {
        if (!groups[t]) groups[t] = [];
        groups[t].push(g);
      } else {
        unassignedList.push(g);
      }
    });

    return { tableGroups: groups, unassigned: unassignedList };
  }, [guests, tableNames]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTableName.trim();
    if (!trimmed) return;
    if (!tableNames.includes(trimmed)) {
      setCustomTables((prev) => [...prev, trimmed]);
    }
    setNewTableName('');
    setShowAddTable(false);
  };

  const handleAssign = (guestId: string, table: string) => {
    onUpdateGuest(guestId, { tableNumber: table === 'unassigned' ? '' : table });
  };

  // Filter unassigned by search
  const filteredUnassigned = useMemo(() => {
    if (!searchTerm.trim()) return unassigned;
    const q = searchTerm.toLowerCase();
    return unassigned.filter((g) => g.name.toLowerCase().includes(q) || g.notes?.toLowerCase().includes(q));
  }, [unassigned, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Controls: Add Table & Summary Metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
              Total Tables: {tableNames.length}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Seated: <strong style={{ color: 'var(--color-success)' }}>{guests.length - unassigned.length}</strong> / {guests.length}
            </span>
          </div>

          {unassigned.length > 0 && (
            <Badge variant="warning" dot>
              {unassigned.length} Guests Unassigned
            </Badge>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {!showAddTable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddTable(true)}
              leadingIcon={<Plus size={14} />}
            >
              Add Table
            </Button>
          ) : (
            <form onSubmit={handleAddTable} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Table 4, VIP Mandap"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                style={{ height: '32px', minHeight: '32px', fontSize: 'var(--text-xs)', width: '160px' }}
              />
              <Button variant="primary" size="sm" type="submit">
                Save
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddTable(false)}>
                Cancel
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Banquet Grid of Tables */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {tableNames.map((tableName) => {
          const tableGuests = tableGroups[tableName] || [];
          const count = tableGuests.reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0);
          const pct = Math.min(Math.round((count / defaultTableCapacity) * 100), 100);
          const isFull = count >= defaultTableCapacity;

          // Dietary breakdown at this table
          const jain = tableGuests.filter((g) => g.dietary === 'jain').length;
          const pureVeg = tableGuests.filter((g) => g.dietary === 'pure_veg').length;
          const specialDiet = tableGuests.filter((g) => g.dietary && g.dietary !== 'none' && g.dietary !== 'jain' && g.dietary !== 'pure_veg').length;

          return (
            <Card
              key={tableName}
              variant="subtle"
              style={{
                border: isFull ? '1px solid var(--border)' : '1px solid var(--border)',
                background: 'var(--surface-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-4)',
              }}
            >
              <div>
                {/* Table Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {tableName}
                    </h4>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Capacity: {count} / {defaultTableCapacity} seats
                    </span>
                  </div>
                  <Badge variant={isFull ? 'danger' : count > 0 ? 'success' : 'neutral'}>
                    {isFull ? 'Full' : `${defaultTableCapacity - count} Open`}
                  </Badge>
                </div>

                {/* Capacity Progress Bar */}
                <div
                  style={{
                    height: '6px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--border)',
                    overflow: 'hidden',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isFull ? 'var(--color-danger)' : 'var(--accent-primary)',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'width var(--transition-normal)',
                    }}
                  />
                </div>

                {/* Dietary Isolation Badges */}
                {(jain > 0 || pureVeg > 0 || specialDiet > 0) && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    {jain > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                        🌱 {jain} Jain
                      </span>
                    )}
                    {pureVeg > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
                        🥗 {pureVeg} Pure Veg
                      </span>
                    )}
                    {specialDiet > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--surface-subtle)', color: 'var(--text-muted)' }}>
                        ⚠️ {specialDiet} Special Diet
                      </span>
                    )}
                  </div>
                )}

                {/* Guest Chips inside Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {tableGuests.length === 0 ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', padding: 'var(--space-3) 0', textAlign: 'center' }}>
                      No guests assigned yet. Assign from tray below.
                    </div>
                  ) : (
                    tableGuests.map((guest) => (
                      <div
                        key={guest.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span>{DIETARY_ICONS[guest.dietary] || '👤'}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {guest.name}
                            {guest.plusOne && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (+1)</span>}
                          </span>
                        </div>

                        {/* Reassign Dropdown */}
                        <select
                          className="form-control"
                          style={{
                            fontSize: '0.68rem',
                            height: '24px',
                            minHeight: '24px',
                            padding: '0 4px',
                            width: '95px',
                            cursor: 'pointer',
                          }}
                          value={tableName}
                          onChange={(e) => handleAssign(guest.id, e.target.value)}
                          aria-label={`Reassign ${guest.name} to another table`}
                        >
                          <option value={tableName}>✓ Here</option>
                          {tableNames
                            .filter((t) => t !== tableName)
                            .map((t) => (
                              <option key={t} value={t}>
                                Move to {t}
                              </option>
                            ))}
                          <option value="unassigned">Unassign</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Unassigned Guests Tray */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--accent-primary)" />
              <span>Unassigned Guests Tray ({unassigned.length})</span>
            </h4>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Assign confirmed attendees to tables to balance hall capacity and catering lines.
            </span>
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search unassigned..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '30px', height: '32px', minHeight: '32px', fontSize: 'var(--text-xs)' }}
            />
          </div>
        </div>

        {filteredUnassigned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            🎉 All guests have been assigned to tables! Seating chart is 100% complete.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-2)' }}>
            {filteredUnassigned.map((guest) => (
              <div
                key={guest.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span>{DIETARY_ICONS[guest.dietary] || '👤'}</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {guest.name}
                    </div>
                    {guest.dietary && guest.dietary !== 'none' && (
                      <div style={{ fontSize: '0.65rem', color: '#ea580c', fontWeight: 600 }}>
                        {guest.dietary.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>

                <select
                  className="form-control"
                  style={{
                    fontSize: '0.7rem',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0 6px',
                    width: '110px',
                    cursor: 'pointer',
                  }}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(guest.id, e.target.value);
                    }
                  }}
                  aria-label={`Assign ${guest.name} to table`}
                >
                  <option value="" disabled>
                    Assign to...
                  </option>
                  {tableNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
