import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Info,
  Sliders,
  ShieldAlert,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { BudgetItem, BudgetCategory, BudgetSummary, EventPlan } from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { InteractiveBudgetChart } from './InteractiveBudgetChart';
import { Card, CardHeader, Button, Badge, EmptyState } from '../common';

interface BudgetManagerProps {
  plan: EventPlan;
  budgetSummary: BudgetSummary;
  onAddExpense: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdateExpense: (id: string, updates: Partial<BudgetItem>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateContingency: (rate: number) => void;
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  venue: 'Venue & Location',
  catering: 'Catering & Beverages',
  decor: 'Decor & Florals',
  photography: 'Photography & Video',
  entertainment: 'Music & Entertainment',
  logistics: 'Logistics & Rentals',
  invitations: 'Invitations & Stationery',
  contingency: 'Contingency Reserve',
  other: 'Miscellaneous & Other',
};

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  venue: '#4f46e5',
  catering: '#06b6d4',
  decor: '#ec4899',
  photography: '#8b5cf6',
  entertainment: '#f59e0b',
  logistics: '#10b981',
  invitations: '#64748b',
  contingency: '#94a3b8',
  other: '#a855f7',
};

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  plan,
  budgetSummary,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateContingency,
}) => {
  // New item modal or inline state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('venue');
  const [newCost, setNewCost] = useState<number>(500);
  const [newPriority, setNewPriority] = useState<'essential' | 'recommended' | 'optional'>('recommended');
  const [newNotes, setNewNotes] = useState('');
  const [newIsPerGuest, setNewIsPerGuest] = useState(false);

  // In-place editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState<number>(0);
  const [editActualCost, setEditActualCost] = useState<number | ''>('');
  const [editIsPaid, setEditIsPaid] = useState<boolean>(false);
  const [editCategory, setEditCategory] = useState<BudgetCategory>('venue');

  // Filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | BudgetCategory>('all');

  const startEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCost(item.estimatedCost);
    setEditActualCost(item.actualCost !== undefined ? item.actualCost : '');
    setEditIsPaid(!!item.isPaid);
    setEditCategory(item.category);
  };

  const saveEdit = (id: string) => {
    const validCost = Math.max(0, isNaN(editCost) ? 0 : editCost);
    onUpdateExpense(id, {
      name: editName.trim() || 'Custom Expense',
      estimatedCost: validCost,
      actualCost: editActualCost !== '' ? Math.max(0, Number(editActualCost)) : undefined,
      isPaid: editIsPaid,
      category: editCategory,
    });
    setEditingId(null);
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const validCost = Math.max(0, isNaN(newCost) ? 0 : newCost);
    onAddExpense({
      name: newName.trim(),
      category: newCategory,
      estimatedCost: validCost,
      priority: newPriority,
      notes: newNotes.trim(),
      isPerGuest: newIsPerGuest,
    });

    setNewName('');
    setNewCost(500);
    setNewNotes('');
    setNewIsPerGuest(false);
    setShowAddForm(false);
  };

  const filteredItems = useMemo(() => {
    return plan.budgetItems.filter((item) => {
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !(item.notes && item.notes.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [plan.budgetItems, selectedCategoryFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Over-budget Warning Banner */}
      {budgetSummary.isOverBudget && (
        <div className="alert-box alert-danger" role="alert">
          <ShieldAlert size={26} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Warning: Budget Exceeded by {formatCurrency(Math.abs(budgetSummary.remainingBalance))} ({formatIndianShort(Math.abs(budgetSummary.remainingBalance))})
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Your current estimated expenses ({formatCurrency(budgetSummary.totalEstimated)}) exceed your planned budget ({formatCurrency(budgetSummary.totalBudget)}) by {Math.round(budgetSummary.utilizationPercentage - 100)}%.
            </p>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', fontWeight: 600 }}>
              💡 Quick Cost-Saving Suggestions:
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.2rem', fontWeight: 400 }}>
                <li>Change meal service from plated to buffet (est. 18-25% savings on catering).</li>
                <li>Reduce floral centerpieces in favor of floating candles or greenery sprigs.</li>
                <li>Utilize digital invitations with QR codes instead of heavyweight cardstock print runs.</li>
                <li>Adjust contingency reserve slider below to match tighter budget constraints.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Top Summary KPI Cards */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Total Event Budget</span>
          <span className="stat-value">{formatCurrency(budgetSummary.totalBudget)}</span>
          <span className="stat-subtext">
            {formatCurrency(budgetSummary.perGuestCost)} / guest ({plan.guestCount} guests) · {formatIndianShort(budgetSummary.totalBudget)}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Estimated Expenses</span>
          <span className="stat-value" style={{ color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text-main)' }}>
            {formatCurrency(budgetSummary.totalEstimated)}
          </span>
          <span className="stat-subtext">Sum of categories + reserve</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Remaining Balance</span>
          <span className="stat-value" style={{ color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {formatCurrency(budgetSummary.remainingBalance)}
          </span>
          <span className="stat-subtext">
            {budgetSummary.isOverBudget ? 'Deficit' : 'Unallocated funds'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Contingency Reserve</span>
          <span className="stat-value">{formatCurrency(budgetSummary.contingencyAmount)}</span>
          <span className="stat-subtext">{Math.round(plan.contingencyRate * 100)}% safety cushion</span>
        </div>
      </div>

      {/* Contingency Buffer Controller */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--accent-primary)" />
              Configurable Contingency Buffer
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Industry best practice allocates 8-15% of your event budget for unforeseen fees, overtime, and weather contingencies.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
              {Math.round(plan.contingencyRate * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={Math.round(plan.contingencyRate * 100)}
              onChange={(e) => onUpdateContingency(parseInt(e.target.value) / 100)}
              style={{ width: '180px', accentColor: 'var(--accent-primary)' }}
              aria-label="Contingency percentage slider"
            />
          </div>
        </div>
      </Card>

      {/* Actual Contract Invoiced Spend vs Budget */}
      <Card variant="subtle" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Actual Contract Invoices & Realized Spend
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Track signed contracts and paid invoices against your estimated planning targets.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Invoiced / Paid:</span>
              <strong style={{ fontSize: '1.25rem', color: budgetSummary.isActualOverBudget ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {formatCurrency(budgetSummary.totalActual)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Remaining Cash Buffer:</span>
              <strong style={{ fontSize: '1.25rem', color: budgetSummary.variance < 0 ? 'var(--color-danger)' : 'var(--text-main)' }}>
                {formatCurrency(budgetSummary.variance)}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Visual Category Distribution Interactive Chart */}
      <Card>
        <CardHeader
          title="Expense Distribution by Category"
          subtitle="Hover slices to inspect proportion of budget committed across services."
          action={
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {budgetSummary.utilizationPercentage}% committed
            </span>
          }
        />

        <InteractiveBudgetChart
          budgetSummary={budgetSummary}
          categoryLabels={CATEGORY_LABELS}
          categoryColors={CATEGORY_COLORS}
        />
      </Card>

      {/* Expense Line Items List */}
      <Card>
        <CardHeader
          title="Expense Line Items"
          subtitle="Add, edit, or adjust estimates. All amounts are strictly validated against negative or invalid values."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              leftIcon={<Plus size={16} />}
              id="btn-add-expense-modal"
            >
              Add Custom Expense
            </Button>
          }
        />

        {/* Add Item Modal / Inline Dropdown */}
        {showAddForm && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-card-subtle)',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Add New Expense Item
            </h4>
            <form onSubmit={handleAddNewItem}>
              <div className="grid-cols-3">
                <div className="form-group">
                  <label htmlFor="new-exp-name" className="form-label">Expense Description *</label>
                  <input
                    id="new-exp-name"
                    type="text"
                    className="form-control"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Acoustic Guitarist for Ceremony"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-exp-cat" className="form-label">Category</label>
                  <select
                    id="new-exp-cat"
                    className="form-control"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BudgetCategory)}
                  >
                    <option value="venue">Venue</option>
                    <option value="catering">Catering</option>
                    <option value="decor">Decor</option>
                    <option value="photography">Photography</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="logistics">Logistics</option>
                    <option value="invitations">Invitations</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="new-exp-cost" className="form-label">Estimated Amount ({plan.currency || '₹'}) *</label>
                  <input
                    id="new-exp-cost"
                    type="number"
                    min="0"
                    step="10"
                    className="form-control"
                    value={newCost}
                    onChange={(e) => setNewCost(Math.max(0, parseInt(e.target.value) || 0))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-exp-priority" className="form-label">Priority</label>
                  <select
                    id="new-exp-priority"
                    className="form-control"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'essential' | 'recommended' | 'optional')}
                  >
                    <option value="essential">Essential</option>
                    <option value="recommended">Recommended</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newIsPerGuest}
                    onChange={(e) => setNewIsPerGuest(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span>Scale cost dynamically if guest count changes</span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Save Expense
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter expenses..."
              className="form-control"
              style={{ paddingLeft: '32px', height: '36px', minHeight: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Button
              variant={selectedCategoryFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategoryFilter('all')}
            >
              All ({plan.budgetItems.length})
            </Button>
            {(['venue', 'catering', 'decor', 'photography', 'entertainment'] as BudgetCategory[]).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategoryFilter === cat ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedCategoryFilter(cat)}
              >
                {CATEGORY_LABELS[cat].split('&')[0].trim()}
              </Button>
            ))}
          </div>
        </div>

        {/* Expense Items Table */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={36} color="var(--color-success)" />}
            title="No matching expense items"
            description="Clear your search filters or click 'Add Custom Expense' to track new line items."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Item Description</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Priority</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Estimated Cost</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actual / Paid</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSpike = item.actualCost !== undefined && item.actualCost > item.estimatedCost;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        backgroundColor: isEditing
                          ? 'var(--bg-card-subtle)'
                          : isSpike
                          ? 'var(--color-danger-bg)'
                          : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {isEditing ? (
                        <>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <input
                              type="text"
                              className="form-control"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <select
                              className="form-control"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as BudgetCategory)}
                            >
                              <option value="venue">Venue</option>
                              <option value="catering">Catering</option>
                              <option value="decor">Decor</option>
                              <option value="photography">Photography</option>
                              <option value="entertainment">Entertainment</option>
                              <option value="logistics">Logistics</option>
                              <option value="invitations">Invitations</option>
                              <option value="other">Other</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <Badge variant="info">{item.priority}</Badge>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              className="form-control"
                              style={{ width: '115px', marginLeft: 'auto', textAlign: 'right' }}
                              value={editCost}
                              onChange={(e) => setEditCost(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                placeholder={`Actual ${plan.currency || '₹'}`}
                                className="form-control"
                                style={{ width: '105px', textAlign: 'right', fontSize: '0.8125rem' }}
                                value={editActualCost}
                                onChange={(e) => setEditActualCost(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                              />
                              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '2px', cursor: 'pointer' }} title="Mark as Paid">
                                <input
                                  type="checkbox"
                                  checked={editIsPaid}
                                  onChange={(e) => setEditIsPaid(e.target.checked)}
                                  style={{ accentColor: 'var(--accent-primary)' }}
                                />
                                Paid
                              </label>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                              style={{ marginRight: '4px', padding: '4px 8px' }}
                            >
                              <Check size={14} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              style={{ padding: '4px 8px' }}
                            >
                              <X size={14} />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                            {item.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.notes}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--bg-card-subtle)',
                                color: CATEGORY_COLORS[item.category] || 'inherit',
                                border: '1px solid var(--border-light)',
                              }}
                            >
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <Badge
                              variant={
                                item.priority === 'essential'
                                  ? 'danger'
                                  : item.priority === 'recommended'
                                  ? 'warning'
                                  : 'info'
                              }
                            >
                              {item.priority}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                            {formatCurrency(item.estimatedCost)}
                            {item.isPerGuest && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per-guest scale</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            {item.actualCost !== undefined ? (
                              <div>
                                <strong style={{ color: item.actualCost > item.estimatedCost ? 'var(--color-danger)' : 'var(--text-main)' }}>
                                  {formatCurrency(item.actualCost)}
                                </strong>
                                {item.actualCost > item.estimatedCost && (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: '0.6875rem',
                                      color: 'var(--color-danger)',
                                      fontWeight: 800,
                                    }}
                                    title="Quote escalated above initial estimate"
                                  >
                                    ↑ +{formatCurrency(item.actualCost - item.estimatedCost)} Spike
                                  </span>
                                )}
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '0.7rem',
                                    color: item.isPaid ? 'var(--color-success)' : 'var(--text-muted)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.isPaid ? '✓ Paid' : '⏳ Invoiced'}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onUpdateExpense(item.id, { isPaid: !item.isPaid })}
                                className={`badge ${item.isPaid ? 'badge-success' : 'badge-neutral'}`}
                                style={{ cursor: 'pointer', border: 'none' }}
                              >
                                {item.isPaid ? '✓ Paid' : 'Mark Paid'}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => startEdit(item)}
                              style={{ padding: '4px 8px', marginRight: '4px' }}
                              title="Edit this item"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Edit2 size={13} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onDeleteExpense(item.id)}
                              style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                              title="Delete this item"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Disclaimer */}
        <div className="estimate-disclaimer">
          <Info size={14} />
          <span>
            <strong>Pricing Notice:</strong> All figures above are planning estimates based on regional averages in {plan.city}. Actual vendor quotes will vary based on dates, taxes, gratuities, and specific contract terms.
          </span>
        </div>
      </Card>
    </div>
  );
};
