import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import type { BudgetItem, BudgetCategory, BudgetSummary, EventPlan } from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { InteractiveBudgetChart } from './InteractiveBudgetChart';
import { Card, CardHeader, Button, Badge, EmptyState, Modal, useToast } from '../ui';

interface BudgetManagerProps {
  plan: EventPlan;
  budgetSummary: BudgetSummary;
  onAddExpense: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdateExpense: (id: string, updates: Partial<BudgetItem>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateContingency: (rate: number) => void;
  isLoading?: boolean;
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

type SortField = 'name' | 'category' | 'estimatedCost' | 'actualCost' | 'variance';
type SortDirection = 'asc' | 'desc';

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  plan,
  budgetSummary,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateContingency,
  isLoading = false,
}) => {
  const toast = useToast();

  // Add Item Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('venue');
  const [newCost, setNewCost] = useState<number>(50000);
  const [newPriority, setNewPriority] = useState<'essential' | 'recommended' | 'optional'>('recommended');
  const [newNotes, setNewNotes] = useState('');
  const [newIsPerGuest, setNewIsPerGuest] = useState(false);

  // In-place inline row editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState<number>(0);
  const [editActualCost, setEditActualCost] = useState<number | ''>('');
  const [editIsPaid, setEditIsPaid] = useState<boolean>(false);
  const [editCategory, setEditCategory] = useState<BudgetCategory>('venue');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Filter & search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | BudgetCategory>('all');
  const [sortField, setSortField] = useState<SortField>('estimatedCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Focus inline edit input when editing begins
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const startEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCost(item.estimatedCost);
    setEditActualCost(item.actualCost !== undefined ? item.actualCost : '');
    setEditIsPaid(!!item.isPaid);
    setEditCategory(item.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const validCost = Math.max(0, isNaN(editCost) ? 0 : editCost);
    const validActual =
      editActualCost === '' || isNaN(Number(editActualCost))
        ? undefined
        : Math.max(0, Number(editActualCost));

    onUpdateExpense(id, {
      name: editName.trim() || 'Custom Expense',
      estimatedCost: validCost,
      actualCost: validActual,
      isPaid: editIsPaid,
      category: editCategory,
    });

    setEditingId(null);
    toast.showToast('Expense updated successfully', 'success');
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
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
    setNewCost(50000);
    setNewNotes('');
    setNewIsPerGuest(false);
    setShowAddModal(false);
    toast.showToast('Expense added successfully', 'success');
  };

  // Check if cost spike exists for trade-off callout
  const costSpikeItems = useMemo(() => {
    return plan.budgetItems.filter(
      (item) => item.actualCost !== undefined && item.actualCost > item.estimatedCost
    );
  }, [plan.budgetItems]);

  const totalSpike = useMemo(() => {
    return costSpikeItems.reduce(
      (sum, item) => sum + ((item.actualCost || 0) - item.estimatedCost),
      0
    );
  }, [costSpikeItems]);

  const decorItem = plan.budgetItems.find((b) => b.category === 'decor');
  const decorCut = decorItem
    ? Math.round(decorItem.estimatedCost * 0.35)
    : Math.round(totalSpike * 0.5);

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    const list = plan.budgetItems.filter((item) => {
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !(item.notes && item.notes.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'estimatedCost') {
        comparison = a.estimatedCost - b.estimatedCost;
      } else if (sortField === 'actualCost') {
        const aAct = a.actualCost ?? a.estimatedCost;
        const bAct = b.actualCost ?? b.estimatedCost;
        comparison = aAct - bAct;
      } else if (sortField === 'variance') {
        const aVar = a.actualCost !== undefined ? a.actualCost - a.estimatedCost : 0;
        const bVar = b.actualCost !== undefined ? b.actualCost - b.estimatedCost : 0;
        comparison = aVar - bVar;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [plan.budgetItems, selectedCategoryFilter, searchQuery, sortField, sortDirection]);

  // Current calculated contingency amount
  const liveContingencyAmount = Math.round(plan.totalBudget * plan.contingencyRate);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ height: '90px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <div style={{ height: '300px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <div style={{ height: '400px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* =====================================================================
          1. SUMMARY KPI STRIP: Total, Estimated, Actual, Remaining, Per-Guest
          ===================================================================== */}
      <div
        className="budget-summary-strip"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {/* Total Budget */}
        <div
          className="stat-card"
          title={`Full Amount: ${formatCurrency(budgetSummary.totalBudget)}`}
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Event Budget
          </span>
          <div className="stat-value tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text)', margin: '4px 0' }}>
            {formatIndianShort(budgetSummary.totalBudget)}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Full Target: {formatCurrency(budgetSummary.totalBudget)}
          </span>
        </div>

        {/* Estimated Expenses */}
        <div
          className="stat-card"
          title={`Full Estimated: ${formatCurrency(budgetSummary.totalEstimated)}`}
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Estimated Planned
          </span>
          <div
            className="stat-value tabular-nums"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: budgetSummary.isOverBudget ? 'var(--color-danger)' : 'var(--text)',
              margin: '4px 0',
            }}
          >
            {formatIndianShort(budgetSummary.totalEstimated)}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {budgetSummary.utilizationPercentage}% of budget committed
          </span>
        </div>

        {/* Actual / Realized Spend */}
        <div
          className="stat-card"
          title={`Realized Contracted Spend: ${formatCurrency(budgetSummary.totalActual)}`}
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Actual / Invoiced
          </span>
          <div
            className="stat-value tabular-nums"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: budgetSummary.isActualOverBudget ? 'var(--color-danger)' : 'var(--text)',
              margin: '4px 0',
            }}
          >
            {formatIndianShort(budgetSummary.totalActual)}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Signed contracts & paid receipts
          </span>
        </div>

        {/* Remaining / Variance */}
        <div
          className="stat-card"
          title={
            budgetSummary.remainingBalance < 0
              ? `Deficit: ${formatCurrency(Math.abs(budgetSummary.remainingBalance))} over planned budget`
              : `Available: ${formatCurrency(budgetSummary.remainingBalance)} remaining`
          }
          style={{
            background: budgetSummary.remainingBalance < 0 ? 'var(--color-danger-bg)' : 'var(--surface-raised)',
            border: `1px solid ${budgetSummary.remainingBalance < 0 ? 'var(--color-danger-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Remaining Buffer
          </span>
          <div
            className="stat-value tabular-nums"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: budgetSummary.remainingBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)',
              margin: '4px 0',
            }}
          >
            {budgetSummary.remainingBalance < 0
              ? `${formatIndianShort(Math.abs(budgetSummary.remainingBalance))} over`
              : formatIndianShort(budgetSummary.remainingBalance)}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: budgetSummary.remainingBalance < 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
            {budgetSummary.remainingBalance < 0 ? 'Exceeds budget cap' : 'Unallocated funds'}
          </span>
        </div>

        {/* Per-Guest Cost */}
        <div
          className="stat-card"
          title={`Per Guest Allocation: ${formatCurrency(budgetSummary.perGuestCost)} (${plan.guestCount} invited guests)`}
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
        >
          <span className="stat-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Per-Guest Cost
          </span>
          <div className="stat-value tabular-nums" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent-primary)', margin: '4px 0' }}>
            {formatIndianShort(budgetSummary.perGuestCost)}
          </div>
          <span className="stat-subtext" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {formatCurrency(budgetSummary.perGuestCost)} / guest ({plan.guestCount} guests)
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. TRADE-OFF CALLOUT (Reusing Decision Engine Vendor Spike Rule)
          ===================================================================== */}
      {costSpikeItems.length > 0 && (
        <Card variant="subtle" style={{ borderLeft: '4px solid var(--color-warning)', background: 'var(--color-warning-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minWidth: '280px' }}>
              <ShieldAlert size={22} color="var(--color-warning-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-warning-text)', margin: '0 0 4px 0' }}>
                  Vendor Cost Escalation & Decision Trade-off
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)', margin: 0, lineHeight: 1.5 }}>
                  Actual vendor quotes escalated expenses by <strong>{formatCurrency(totalSpike)}</strong> ({formatIndianShort(totalSpike)}).
                  Dynamic Decision Tradeoff: Trim decoration budget by <strong>{formatCurrency(decorCut)}</strong> to offset the price spike, or reduce guest headcount by ~{Math.max(5, Math.ceil(totalSpike / Math.max(500, budgetSummary.perGuestCost)))} attendees.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedCategoryFilter('decor')}
              style={{ alignSelf: 'center' }}
            >
              Jump to decor
            </Button>
          </div>
        </Card>
      )}

      {/* =====================================================================
          3. CONTINGENCY BUFFER CONTROLLER (0-25% with Live ₹ Readout)
          ===================================================================== */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: '0 0 4px 0' }}>
              <Sliders size={18} color="var(--accent-primary)" />
              Configurable Contingency Buffer
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Indian celebration safeguard: 10%–15% reserve for unexpected baraat delays, sound curfews, and logistics.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <span className="tabular-nums" style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--accent-primary)', display: 'block' }}>
                {Math.round(plan.contingencyRate * 100)}% ({formatIndianShort(liveContingencyAmount)})
              </span>
              <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {formatCurrency(liveContingencyAmount)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={Math.round(plan.contingencyRate * 100)}
              onChange={(e) => onUpdateContingency(parseInt(e.target.value, 10) / 100)}
              style={{ width: '160px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              aria-label="Contingency percentage slider"
            />
          </div>
        </div>
      </Card>

      {/* =====================================================================
          4. SVG DONUT CHART (Legend, Tooltips, Slice Click to Filter)
          ===================================================================== */}
      <Card>
        <CardHeader
          title="Expense Distribution by Category"
          subtitle="Click any slice or category in the legend to filter line items below."
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {selectedCategoryFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategoryFilter('all')}
                  leadingIcon={<X size={14} />}
                >
                  Clear Filter
                </Button>
              )}
              <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700 }}>
                {budgetSummary.utilizationPercentage}% committed
              </span>
            </div>
          }
        />

        <InteractiveBudgetChart
          budgetSummary={budgetSummary}
          categoryLabels={CATEGORY_LABELS}
          categoryColors={CATEGORY_COLORS}
          selectedCategory={selectedCategoryFilter}
          onSelectCategory={(cat) => setSelectedCategoryFilter(cat)}
        />
      </Card>

      {/* =====================================================================
          5. EXPENSE TABLE & CONTROLS (Sort, Filter, Inline Edit, Spikes)
          ===================================================================== */}
      <Card>
        <CardHeader
          title="Expense Line Items"
          subtitle="Inline edit amounts (Enter to save, Esc to cancel). Variance chips indicate cost escalations."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leadingIcon={<Plus size={16} />}
              id="btn-add-expense-modal"
            >
              Add Custom Expense
            </Button>
          }
        />

        {/* Toolbar: Search & Filter Chips */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter expenses..."
              className="form-control"
              style={{ paddingLeft: '32px', height: '36px', minHeight: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search and filter expenses"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
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
                onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat ? 'all' : cat)}
              >
                {CATEGORY_LABELS[cat].split('&')[0].trim()}
              </Button>
            ))}
          </div>
        </div>

        {/* Expenses: Desktop Table & Mobile Card Layout */}
        {filteredAndSortedItems.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={36} color="var(--color-success)" />}
            title="No matching expense items"
            description="Clear your search filters or click 'Add Custom Expense' to track new line items."
            action={
              selectedCategoryFilter !== 'all' || searchQuery ? (
                <Button variant="secondary" size="sm" onClick={() => { setSelectedCategoryFilter('all'); setSearchQuery(''); }}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Item Description <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => handleSort('category')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Category <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleSort('estimatedCost')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                    >
                      Estimated Cost <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleSort('actualCost')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                    >
                      Actual / Paid <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleSort('variance')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                    >
                      Variance <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const hasActual = item.actualCost !== undefined;
                  const diff = hasActual ? item.actualCost! - item.estimatedCost : 0;
                  const diffPct = item.estimatedCost > 0 ? (diff / item.estimatedCost) * 100 : 0;
                  const isSpike = diffPct >= 20;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isEditing
                          ? 'var(--surface-subtle)'
                          : isSpike
                          ? 'var(--color-danger-bg)'
                          : 'transparent',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      {isEditing ? (
                        <>
                          <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
                            <input
                              ref={editInputRef}
                              type="text"
                              className="form-control"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => handleInlineKeyDown(e, item.id)}
                              aria-label="Edit item name"
                              required
                            />
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
                            <select
                              className="form-control"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as BudgetCategory)}
                              onKeyDown={(e) => handleInlineKeyDown(e, item.id)}
                              aria-label="Edit category"
                            >
                              {(Object.keys(CATEGORY_LABELS) as BudgetCategory[]).map((c) => (
                                <option key={c} value={c}>
                                  {CATEGORY_LABELS[c]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              className="form-control tabular-nums"
                              style={{ width: '120px', marginLeft: 'auto', textAlign: 'right' }}
                              value={editCost}
                              onChange={(e) => setEditCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              onKeyDown={(e) => handleInlineKeyDown(e, item.id)}
                              aria-label="Edit estimated cost"
                            />
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                              <input
                                type="number"
                                min="0"
                                step="500"
                                placeholder="Actual ₹"
                                className="form-control tabular-nums"
                                style={{ width: '110px', textAlign: 'right', fontSize: 'var(--text-xs)' }}
                                value={editActualCost}
                                onChange={(e) =>
                                  setEditActualCost(
                                    e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                                  )
                                }
                                onKeyDown={(e) => handleInlineKeyDown(e, item.id)}
                                aria-label="Edit actual cost"
                              />
                            </div>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={editIsPaid}
                                onChange={(e) => setEditIsPaid(e.target.checked)}
                                style={{ accentColor: 'var(--accent-primary)' }}
                              />
                              Paid
                            </label>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => saveEdit(item.id)}
                                style={{ padding: '4px 8px' }}
                                aria-label="Save changes"
                              >
                                <Check size={14} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={cancelEdit}
                                style={{ padding: '4px 8px' }}
                                aria-label="Cancel editing"
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
                            {item.notes && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.notes}</div>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                backgroundColor: 'var(--surface-subtle)',
                                color: CATEGORY_COLORS[item.category] || 'inherit',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                            {formatCurrency(item.estimatedCost)}
                            {item.isPerGuest && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per-guest scale</div>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }} className="tabular-nums">
                            {hasActual ? (
                              <strong style={{ color: diff > 0 ? 'var(--color-danger)' : 'var(--text)' }}>
                                {formatCurrency(item.actualCost!)}
                              </strong>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Pending quote</span>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            {!hasActual ? (
                              <Badge variant="neutral">Estimated</Badge>
                            ) : diff <= 0 ? (
                              <Badge variant="success">✓ On budget</Badge>
                            ) : diffPct <= 10 ? (
                              <Badge variant="warning">+{formatIndianShort(diff)} (+{Math.round(diffPct)}%)</Badge>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Badge variant="danger">+{formatIndianShort(diff)} (+{Math.round(diffPct)}%)</Badge>
                                {isSpike && (
                                  <Badge variant="danger" title="Quote escalated >= 20% above estimate">
                                    ↑ Spike
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateExpense(item.id, { isPaid: !item.isPaid });
                                toast.showToast(item.isPaid ? 'Marked as unpaid' : 'Marked as paid', 'info');
                              }}
                              className={`badge ${item.isPaid ? 'badge-success' : 'badge-neutral'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                              title="Click to toggle paid status"
                            >
                              {item.isPaid ? '✓ Paid' : '⏳ Invoiced'}
                            </button>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-2)', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startEdit(item)}
                                style={{ padding: '4px 8px' }}
                                title="Edit this item"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Edit2 size={13} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  onDeleteExpense(item.id);
                                  toast.showToast(`Deleted ${item.name}`, 'info');
                                }}
                                style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                                title="Delete this item"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
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

        {/* Pricing Notice */}
        <div className="estimate-disclaimer" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Pricing Notice:</strong> All figures above are planning estimates based on regional averages in {plan.city}. Actual vendor quotes will vary based on dates, taxes, gratuities, and specific contract terms.
          </span>
        </div>
      </Card>

      {/* =====================================================================
          6. ADD EXPENSE MODAL (Live Lakh/Crore Preview, Accessible Modal)
          ===================================================================== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Expense Item"
      >
        <form onSubmit={handleAddNewItem}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="new-exp-name" className="form-label">
                <span>Expense Description *</span>
              </label>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="new-exp-cat" className="form-label">
                  <span>Category</span>
                </label>
                <select
                  id="new-exp-cat"
                  className="form-control"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as BudgetCategory)}
                >
                  {(Object.keys(CATEGORY_LABELS) as BudgetCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="new-exp-priority" className="form-label">
                  <span>Priority</span>
                </label>
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

            {/* Amount with Live Lakh / Crore Preview */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="new-exp-cost" className="form-label">
                  <span>Estimated Amount ({plan.currency || '₹'}) *</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {formatIndianShort(newCost)}
                </span>
              </div>
              <input
                id="new-exp-cost"
                type="number"
                min="0"
                step="500"
                className="form-control tabular-nums"
                value={isNaN(newCost) ? '' : newCost}
                onChange={(e) => setNewCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                required
              />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Live Preview: <strong className="tabular-nums">{formatCurrency(newCost)}</strong> ({formatIndianShort(newCost)})
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-exp-notes" className="form-label">
                <span>Vendor or Logistics Notes</span>
              </label>
              <input
                id="new-exp-notes"
                type="text"
                className="form-control"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Includes sound system and microphones"
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newIsPerGuest}
                onChange={(e) => setNewIsPerGuest(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Scale cost dynamically if guest count changes</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" size="md" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" onClick={handleAddNewItem} leadingIcon={<Sparkles size={16} />}>
                Save Expense
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
