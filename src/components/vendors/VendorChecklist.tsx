import React, { useState } from 'react';
import {
  Users2,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import type { VendorItem, VendorStatus, VendorCategory, EventPlan } from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { Card, CardHeader, Button, Badge, Modal } from '../common';

interface VendorChecklistProps {
  plan: EventPlan;
  onUpdateVendor: (id: string, updates: Partial<VendorItem>) => void;
  onAddVendor: (vendor: Omit<VendorItem, 'id'>) => void;
}

const STATUS_LABELS: Record<VendorStatus, { label: string; variant: 'info' | 'warning' | 'wedding' | 'success' | 'community' }> = {
  not_started: { label: 'Not Started', variant: 'info' },
  contacted: { label: 'Contacted', variant: 'warning' },
  shortlisted: { label: 'Shortlisted', variant: 'wedding' },
  booked: { label: 'Booked', variant: 'success' },
  completed: { label: 'Completed', variant: 'community' },
};

export const VendorChecklist: React.FC<VendorChecklistProps> = ({
  plan,
  onUpdateVendor,
  onAddVendor,
}) => {
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New vendor form state
  const [newRole, setNewRole] = useState('');
  const [newCategory, setNewCategory] = useState<VendorCategory>('caterer');
  const [newCost, setNewCost] = useState<number>(1000);
  const [newQuestions, setNewQuestions] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedVendorId(expandedVendorId === id ? null : id);
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    const questionsList = newQuestions
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);

    onAddVendor({
      role: newRole.trim(),
      category: newCategory,
      status: 'not_started',
      estimatedCost: Math.max(0, isNaN(newCost) ? 0 : newCost),
      questionsToAsk:
        questionsList.length > 0
          ? questionsList
          : [
              'What packages are available within our estimated budget?',
              'What are the deposit and cancellation refund terms?',
              'Do you carry liability insurance?',
            ],
    });

    setNewRole('');
    setNewCost(1000);
    setNewQuestions('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Transparency Banner */}
      <div className="alert-box alert-info">
        <ShieldCheck size={22} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700 }}>Vendor Sourcing Guidelines & Ethical Guardrails</div>
          <p style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>
            EventWise AI organizes recommended vendor roles and estimated budgets for {plan.city}. We do not fabricate fake reviews, false availability, or pre-arranged contact directories. Use the tailored interview questions below when vetting local professionals.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Vendor Checklist & Interview Guide"
          icon={<Users2 size={20} color="var(--accent-primary)" />}
          subtitle="Track outreach, negotiate quotes, and store verified contact details."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus size={15} />}
              id="btn-add-vendor-modal"
            >
              Add Vendor Category
            </Button>
          }
        />

        {/* Vendor Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {plan.vendors.map((vendor) => {
            const isExpanded = expandedVendorId === vendor.id;
            const statusConfig = STATUS_LABELS[vendor.status] || STATUS_LABELS.not_started;

            return (
              <div
                key={vendor.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.18s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {vendor.role}
                      </h4>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Category: {vendor.category} · Budget Estimate: <strong>{formatCurrency(vendor.estimatedCost)}</strong> ({formatIndianShort(vendor.estimatedCost)})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {/* Status Dropdown */}
                    <label
                      htmlFor={`vendor-status-${vendor.id}`}
                      className="sr-only"
                      style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
                    >
                      Change Status
                    </label>
                    <select
                      id={`vendor-status-${vendor.id}`}
                      className="form-control"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', width: '135px', height: '34px', minHeight: '34px' }}
                      value={vendor.status}
                      onChange={(e) => onUpdateVendor(vendor.id, { status: e.target.value as VendorStatus })}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="contacted">Contacted</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="booked">Booked</option>
                      <option value="completed">Completed</option>
                    </select>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleExpand(vendor.id)}
                      aria-expanded={isExpanded}
                      aria-label="Toggle vendor questions and notes"
                      rightIcon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    >
                      {isExpanded ? 'Hide Details' : 'Questions & Notes'}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details: Questions to Ask & Contact Form */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {/* Questions to Ask */}
                    <div style={{ backgroundColor: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                        <HelpCircle size={16} color="var(--accent-primary)" />
                        Essential Questions to Ask {vendor.role}:
                      </div>
                      <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-main)' }}>
                        {vendor.questionsToAsk.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Contact Info & Notes */}
                    <div className="grid-cols-3">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>Contact Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={vendor.contactName || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactName: e.target.value })}
                          placeholder="e.g. Sarah Jenkins"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={vendor.contactPhone || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactPhone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          value={vendor.contactEmail || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactEmail: e.target.value })}
                          placeholder="e.g. vendor@example.com"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8125rem' }}>Negotiation & Interview Notes</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={vendor.notes || ''}
                        onChange={(e) => onUpdateVendor(vendor.id, { notes: e.target.value })}
                        placeholder="Package details, dietary capacity, extra hour surcharge..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Vendor Requirement Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Vendor Requirement"
        subtitle="Specify vendor roles and estimated budgets for your celebration."
      >
        <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-cols-3">
            <div className="form-group">
              <label htmlFor="vnd-role" className="form-label">Vendor Role / Title *</label>
              <input
                id="vnd-role"
                type="text"
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Wedding Cake Designer"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="vnd-cat" className="form-label">Category</label>
              <select
                id="vnd-cat"
                className="form-control"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as VendorCategory)}
              >
                <option value="caterer">Catering & Bar</option>
                <option value="photographer">Photography & Video</option>
                <option value="venue">Venue Coordinator</option>
                <option value="decorator">Florals & Decor</option>
                <option value="entertainment">Music & DJ</option>
                <option value="baker">Cake & Bakery</option>
                <option value="transport">Transportation</option>
                <option value="officiant">Officiant / Host</option>
                <option value="other">Other Specialist</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="vnd-cost" className="form-label">Target Budget (₹)</label>
              <input
                id="vnd-cost"
                type="number"
                min="0"
                step="500"
                className="form-control"
                value={newCost}
                onChange={(e) => setNewCost(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="vnd-questions" className="form-label">Custom Questions to Ask (one per line)</label>
            <textarea
              id="vnd-questions"
              rows={2}
              className="form-control"
              value={newQuestions}
              onChange={(e) => setNewQuestions(e.target.value)}
              placeholder="Ask about tastings, insurance, deposit refund terms..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Vendor Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
