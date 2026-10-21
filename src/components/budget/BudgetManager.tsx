import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Info,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import type { BudgetItem, BudgetCategory, BudgetSummary, EventPlan } from '../../types/event';

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
  const [editCategory, setEditCategory] = useState<BudgetCategory>('venue');

  const startEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCost(item.estimatedCost);
    setEditCategory(item.category);
  };

  const saveEdit = (id: string) => {
    const validCost = Math.max(0, isNaN(editCost) ? 0 : editCost);
    onUpdateExpense(id, {
      name: editName.trim() || 'Custom Expense',
      estimatedCost: validCost,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Over-budget Warning Banner */}
      {budgetSummary.isOverBudget && (
        <div className="alert-box alert-danger" role="alert">
          <ShieldAlert size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              Warning: Budget Exceeded by ${Math.abs(budgetSummary.remainingBalance).toLocaleString()}
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Your current estimated expenses (${budgetSummary.totalEstimated.toLocaleString()}) exceed your planned budget (${budgetSummary.totalBudget.toLocaleString()}) by {Math.round(budgetSummary.utilizationPercentage - 100)}%.
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

      {/* Top Summary Cards */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <span className="stat-label">Total Event Budget</span>
          <span className="stat-value">${budgetSummary.totalBudget.toLocaleString()}</span>
          <span className="stat-subtext">${budgetSummary.perGuestCost} / guest ({plan.guestCount} guests)</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Estimated Expenses</span>
          <span className="stat-value" style={{ color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text-main)' }}>
            ${budgetSummary.totalEstimated.toLocaleString()}
          </span>
          <span className="stat-subtext">Sum of categories + reserve</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Remaining Balance</span>
          <span className="stat-value" style={{ color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--color-success)' }}>
            ${budgetSummary.remainingBalance.toLocaleString()}
          </span>
          <span className="stat-subtext">
            {budgetSummary.isOverBudget ? 'Deficit' : 'Unallocated funds'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Contingency Reserve</span>
          <span className="stat-value">${budgetSummary.contingencyAmount.toLocaleString()}</span>
          <span className="stat-subtext">{Math.round(plan.contingencyRate * 100)}% safety cushion</span>
        </div>
      </div>

      {/* Contingency Controller */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={16} color="var(--accent-primary)" />
              Configurable Contingency Buffer
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Industry best practice allocates 8-15% of your event budget for unforeseen fees, overtime, and weather contingencies.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{Math.round(plan.contingencyRate * 100)}%</span>
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
      </div>

      {/* Visual Category Distribution Bar */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expense Distribution by Category</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {budgetSummary.utilizationPercentage}% of budget committed
          </span>
        </div>

        {/* Stacked bar */}
        <div
          style={{
            display: 'flex',
            height: '24px',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-card-subtle)',
            marginBottom: '1rem',
          }}
          role="progressbar"
          aria-valuenow={budgetSummary.utilizationPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {(Object.keys(budgetSummary.categoryTotals) as BudgetCategory[]).map((cat) => {
            const amount = budgetSummary.categoryTotals[cat];
            if (amount <= 0 || budgetSummary.totalEstimated <= 0) return null;
            const pct = (amount / budgetSummary.totalEstimated) * 100;
            return (
              <div
                key={cat}
                style={{
                  width: `${pct}%`,
                  backgroundColor: CATEGORY_COLORS[cat] || '#64748b',
                  transition: 'width 0.3s ease',
                }}
                title={`${CATEGORY_LABELS[cat]}: $${amount.toLocaleString()} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem' }}>
          {(Object.keys(budgetSummary.categoryTotals) as BudgetCategory[]).map((cat) => {
            const amount = budgetSummary.categoryTotals[cat];
            if (amount <= 0) return null;
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: CATEGORY_COLORS[cat] || '#64748b',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: 'var(--text-muted)' }}>{CATEGORY_LABELS[cat]}:</span>
                <span style={{ fontWeight: 600 }}>${amount.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense Line Items List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Expense Line Items</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Add, edit, or adjust estimates. All amounts are strictly validated against negative or invalid values.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(true)}
            id="btn-add-expense-modal"
          >
            <Plus size={16} />
            <span>Add Custom Expense</span>
          </button>
        </div>

        {/* Add Item Modal / Inline Dropdown */}
        {showAddForm && (
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
                  <label htmlFor="new-exp-cost" className="form-label">Estimated Amount ($) *</label>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={newIsPerGuest}
                    onChange={(e) => setNewIsPerGuest(e.target.checked)}
                  />
                  <span>Scale cost dynamically if guest count changes</span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Expense
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Expense Items Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Item Description</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Priority</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Estimated Cost</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plan.budgetItems.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: isEditing ? 'var(--bg-card-subtle)' : 'transparent',
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
                          <span className="badge badge-info">{item.priority}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            className="form-control"
                            style={{ width: '120px', marginLeft: 'auto', textAlign: 'right' }}
                            value={editCost}
                            onChange={(e) => setEditCost(Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => saveEdit(item.id)}
                            style={{ marginRight: '4px' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingId(null)}
                          >
                            ✕
                          </button>
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
                              fontWeight: 600,
                              backgroundColor: 'var(--bg-card-subtle)',
                              color: CATEGORY_COLORS[item.category] || 'inherit',
                            }}
                          >
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            className={`badge ${
                              item.priority === 'essential'
                                ? 'badge-danger'
                                : item.priority === 'recommended'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                          ${item.estimatedCost.toLocaleString()}
                          {item.isPerGuest && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per-guest scale</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', marginRight: '4px' }}
                            title="Edit this item"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(item.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                            title="Delete this item"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div className="estimate-disclaimer">
          <Info size={14} />
          <span>
            <strong>Pricing Notice:</strong> All figures above are planning estimates based on regional averages in {plan.city}. Actual vendor quotes will vary based on dates, taxes, gratuities, and specific contract terms.
          </span>
        </div>
      </div>
    </div>
  );
};
