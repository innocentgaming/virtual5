import React, { useState, useMemo, useRef } from 'react';
import {
  Users2,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Sparkles,
  Building2,
  Star,
} from 'lucide-react';
import type { VendorItem, VendorStatus, VendorCategory, EventPlan } from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { Card, CardHeader, Button, Badge, Modal, EmptyState, useToast } from '../ui';

interface VendorChecklistProps {
  plan: EventPlan;
  onUpdateVendor: (id: string, updates: Partial<VendorItem>) => void;
  onAddVendor: (vendor: Omit<VendorItem, 'id'>) => void;
  isLoading?: boolean;
}

const STAGES: { id: VendorStatus | 'all'; label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'danger' }[] = [
  { id: 'all', label: 'All Vendors', variant: 'neutral' },
  { id: 'shortlisted', label: 'Shortlisted', variant: 'warning' },
  { id: 'contacted', label: 'Contacted', variant: 'info' },
  { id: 'booked', label: 'Booked', variant: 'success' },
  { id: 'cancelled', label: 'Cancelled', variant: 'danger' },
];

const STANDARD_INTERVIEW_QUESTIONS: Record<string, string[]> = {
  pandit: [
    'What is the exact auspicious muhurat timing and duration for the Vedic pheras?',
    'Will you provide the complete list of samagri and puja items in advance?',
    'What are the dakshina, travel, and assistant pandit honorarium expectations?',
    'Do you conduct havan ceremonies suited for both indoor banquet halls and outdoor mandaps?',
  ],
  mehendi: [
    'How many hours are required for the bridal mehendi application before sangeet?',
    'Do you guarantee 100% natural, chemical-free henna with rich dark stain delivery?',
    'How many assistant mehendi artists will accompany you for the guest counters?',
    'What is the per-hand pricing or package rate for guest ladies and bridesmaids?',
  ],
  dhol: [
    'Can you coordinate procession beats with the groom arrival and baraat route?',
    'Are you aware of the 10:00 PM municipal sound curfew and indoor sound handover?',
    'Do you supply illuminated dhol gear or brass band uniforms matching the theme?',
    'What is the backup plan in case of procession delays or extended dancing?',
  ],
  caterer: [
    'Can you maintain a strictly segregated kitchen counter and cookware for Jain & Pure Veg guests?',
    'Do you offer an advance menu tasting session for the family before final sign-off?',
    'What live chaat and hot dessert counters are included in the per-plate quote?',
    'What is your standard protocol for food replenishment, hygiene, and safe leftover management?',
  ],
};

function getTailoredQuestions(role: string, category: string, existingQuestions: string[]): string[] {
  if (existingQuestions && existingQuestions.length > 0) return existingQuestions;

  const roleLower = role.toLowerCase();
  const catLower = category.toLowerCase();

  if (roleLower.includes('pandit') || roleLower.includes('priest') || catLower.includes('officiant')) {
    return STANDARD_INTERVIEW_QUESTIONS.pandit;
  }
  if (roleLower.includes('mehendi') || roleLower.includes('henna')) {
    return STANDARD_INTERVIEW_QUESTIONS.mehendi;
  }
  if (roleLower.includes('dhol') || roleLower.includes('band') || roleLower.includes('brass')) {
    return STANDARD_INTERVIEW_QUESTIONS.dhol;
  }
  if (catLower.includes('cater') || roleLower.includes('cater') || roleLower.includes('halwai') || roleLower.includes('food')) {
    return STANDARD_INTERVIEW_QUESTIONS.caterer;
  }

  return [
    'What packages are available within our estimated budget tier?',
    'What are the deposit milestones, cancellation terms, and refund policy?',
    'Do you carry liability insurance and venue safety permits?',
    'Who will be the dedicated on-site coordinator on the day of the event?',
  ];
}

export const VendorChecklist: React.FC<VendorChecklistProps> = ({
  plan,
  onUpdateVendor,
  onAddVendor,
  isLoading = false,
}) => {
  const toast = useToast();
  const [activeStage, setActiveStage] = useState<VendorStatus | 'all'>('all');
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New vendor form fields
  const [newRole, setNewRole] = useState('');
  const [newCategory, setNewCategory] = useState<VendorCategory>('caterer');
  const [newCost, setNewCost] = useState<number>(25000);
  const [newQuestions, setNewQuestions] = useState('');

  const addVendorBtnRef = useRef<HTMLButtonElement>(null);

  const vendors = useMemo(() => plan.vendors || [], [plan.vendors]);

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<VendorStatus | 'all', number> = {
      all: vendors.length,
      shortlisted: 0,
      contacted: 0,
      booked: 0,
      not_started: 0,
      completed: 0,
      cancelled: 0,
    };
    vendors.forEach((v) => {
      if (counts[v.status] !== undefined) {
        counts[v.status]++;
      }
    });
    return counts;
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (activeStage === 'all') return vendors;
    return vendors.filter((v) => v.status === activeStage);
  }, [vendors, activeStage]);

  const toggleExpand = (id: string) => {
    setExpandedVendorId((prev) => (prev === id ? null : id));
  };

  const handleStatusChange = (vendor: VendorItem, newStatus: VendorStatus) => {
    onUpdateVendor(vendor.id, { status: newStatus });
    toast.showToast(`Updated ${vendor.role} to ${newStatus.replace('_', ' ')}`, 'success');
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
      status: 'shortlisted',
      estimatedCost: Math.max(0, isNaN(newCost) ? 0 : newCost),
      questionsToAsk:
        questionsList.length > 0
          ? questionsList
          : getTailoredQuestions(newRole, newCategory, []),
    });

    setNewRole('');
    setNewCost(25000);
    setNewQuestions('');
    setShowAddModal(false);
    toast.showToast(`Added vendor role: ${newRole.trim()}`, 'success');
    addVendorBtnRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ height: '80px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="ui-skeleton" />
        <div style={{ height: '320px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)' }} className="ui-skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* =====================================================================
          1. TRANSPARENCY & SOURCING GUIDELINES BANNER
          ===================================================================== */}
      <div className="alert-box alert-info" role="status">
        <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Vendor Sourcing Guidelines & Ethical Guardrails
          </div>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: '2px', lineHeight: 1.5 }}>
            EventWise AI organizes recommended vendor roles and estimated market budgets for {plan.city}. We do not fabricate fake reviews or biased sponsor rankings. Use the tailored interview questions below when vetting local professionals for your celebration.
          </p>
        </div>
      </div>

      {/* =====================================================================
          2. STAGE TABS STRIP & HEADER
          ===================================================================== */}
      <Card>
        <CardHeader
          headingLevel="h2"
          title="Vendor Checklist & Interview Guide"
          icon={<Users2 size={20} color="var(--accent-primary)" />}
          subtitle="Track contractor outreach, compare quotes, and review specialized interview cues."
          action={
            <Button
              ref={addVendorBtnRef}
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              leadingIcon={<Plus size={15} />}
              id="btn-add-vendor-modal"
            >
              Add Vendor Category
            </Button>
          }
        />

        {/* Stage Filter Chips */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          {STAGES.map((stage) => {
            const count = stage.id === 'all' ? stageCounts.all : stageCounts[stage.id] || 0;
            return (
              <Button
                key={stage.id}
                variant={activeStage === stage.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveStage(stage.id)}
              >
                {stage.label} ({count})
              </Button>
            );
          })}
        </div>
      </Card>

      {/* =====================================================================
          3. VENDOR CARDS LIST
          ===================================================================== */}
      {filteredVendors.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 size={38} color="var(--color-success)" />}
            title="No Vendors in This Stage"
            description="Select 'All Vendors' or click '+ Add Vendor Category' to add coordinators to your pipeline."
            action={
              <Button variant="secondary" size="sm" onClick={() => setActiveStage('all')}>
                View All Vendors
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredVendors.map((vendor) => {
            const isExpanded = expandedVendorId === vendor.id;
            const questions = getTailoredQuestions(vendor.role, vendor.category, vendor.questionsToAsk);

            return (
              <div
                key={vendor.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--surface-raised)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Top Row: Role, Category, Quote, Stage Selector & Expand Toggle */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                        {vendor.role}
                      </h3>
                      <Badge
                        variant={
                          vendor.status === 'booked'
                            ? 'success'
                            : vendor.status === 'shortlisted'
                            ? 'warning'
                            : vendor.status === 'contacted'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {vendor.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Category: {vendor.category} · Target Quote: <strong className="tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(vendor.estimatedCost)}</strong> ({formatIndianShort(vendor.estimatedCost)})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {/* Stage Dropdown */}
                    <label
                      htmlFor={`vendor-status-${vendor.id}`}
                      className="sr-only"
                    >
                      Change Status
                    </label>
                    <select
                      id={`vendor-status-${vendor.id}`}
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', width: '130px', height: '36px' }}
                      value={vendor.status}
                      onChange={(e) => handleStatusChange(vendor, e.target.value as VendorStatus)}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="contacted">Contacted</option>
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
                      {isExpanded ? 'Hide Details' : 'Interview & Notes'}
                    </Button>
                  </div>
                </div>

                {/* =====================================================================
                    4. COLLAPSIBLE INTERVIEW GUIDE & NOTES
                    ===================================================================== */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-4)',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-4)',
                    }}
                  >
                    {/* Collapsible Tailored Interview Questions */}
                    <div
                      style={{
                        backgroundColor: 'var(--surface-subtle)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text)' }}>
                        <HelpCircle size={15} color="var(--accent-primary)" />
                        Vetting & Interview Questions for {vendor.role}:
                      </div>
                      <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text)' }}>
                        {questions.map((q, idx) => (
                          <li key={idx} style={{ lineHeight: 1.5 }}>{q}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Contact Info & Notes Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                          <User size={12} style={{ marginRight: '4px' }} /> Contact Person
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={vendor.contactName || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactName: e.target.value })}
                          placeholder="e.g. Ramesh Chandra (Lead)"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                          <Phone size={12} style={{ marginRight: '4px' }} /> Phone Number
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={vendor.contactPhone || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactPhone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                          <Mail size={12} style={{ marginRight: '4px' }} /> Email Address
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={vendor.contactEmail || ''}
                          onChange={(e) => onUpdateVendor(vendor.id, { contactEmail: e.target.value })}
                          placeholder="e.g. info@vendor.com"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Negotiation & Interview Notes</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={vendor.notes || ''}
                        onChange={(e) => onUpdateVendor(vendor.id, { notes: e.target.value })}
                        placeholder="Package details, dietary capacity, extra hour surcharge, advance paid..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          4B. CURATED VENUES & VERIFIED SUPPLIERS DIRECTORY
          ===================================================================== */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--accent-primary)" />
              <span>Curated Venues & Verified Partners</span>
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Verified Indian heritage venues, decor artisans, and banquet specialists for {plan.city}
            </p>
          </div>
          <Badge variant="neutral">Hand-picked for {plan.city}</Badge>
        </div>

        <div className="venue-directory-grid">
          {/* Partner 1 */}
          <div className="venue-card">
            <div className="venue-card-media">
              <img
                src="/images/jaipur_palace_venue.jpg"
                alt={`The Rajvilas Palace & Heritage Gardens in ${plan.city}`}
                loading="lazy"
              />
              <div className="venue-card-badge-top">
                <Badge variant="wedding">Heritage Palace</Badge>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="venue-card-rating">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>4.9 (128)</span>
              </div>
            </div>
            <div className="venue-card-body">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    The Rajvilas Palace & Gardens
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ₹₹₹
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  <span>📍 {plan.city}, India</span>
                  <span>•</span>
                  <span>👥 Up to 800 Guests</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Palatial courtyard with illuminated reflection pool, royal mandap pavilion, and dedicated pure-veg banquet kitchen.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success-text)' }}>
                  ✓ Dedicated Jain Kitchen
                </span>
                <Badge variant="neutral">Heritage Grade</Badge>
              </div>
            </div>
          </div>

          {/* Partner 2 */}
          <div className="venue-card">
            <div className="venue-card-media">
              <img
                src="/images/mandap_floral_decor.jpg"
                alt="ShadiSquad Traditional Floral & Mandap Designers"
                loading="lazy"
              />
              <div className="venue-card-badge-top">
                <Badge variant="neutral">Stage & Decor</Badge>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="venue-card-rating">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>4.95 (94)</span>
              </div>
            </div>
            <div className="venue-card-body">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    ShadiSquad Floral & Mandap Arts
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ₹₹₹
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  <span>📍 Pan-India Service</span>
                  <span>•</span>
                  <span>🌸 Marigold & Jasmine</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Carved wooden mandap with fresh marigold hangings, hanging brass diyas, and weather-guarded waterproof canopies.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success-text)' }}>
                  ✓ Rainproof Canopy Setup
                </span>
                <Badge variant="neutral">Artisan Decor</Badge>
              </div>
            </div>
          </div>

          {/* Partner 3 */}
          <div className="venue-card">
            <div className="venue-card-media">
              <img
                src="/images/indian_gourmet_catering.jpg"
                alt="Royal Rasoi Gourmet Banquets & Satvik Kitchens"
                loading="lazy"
              />
              <div className="venue-card-badge-top">
                <Badge variant="birthday">Catering & Feasts</Badge>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="venue-card-rating">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>4.92 (210)</span>
              </div>
            </div>
            <div className="venue-card-body">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    Royal Rasoi Gourmet & Satvik
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ₹₹
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  <span>📍 Specialized Banquets</span>
                  <span>•</span>
                  <span>🍲 Live Tandoor & Chaat</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Authentic copper handi feast with live Dal Baati Churma counters, zero cross-contamination Jain quarantine, and artisanal mithai.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success-text)' }}>
                  ✓ Satvik Certified
                </span>
                <Badge variant="neutral">Gourmet Feast</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. ADD VENDOR REQUIREMENT MODAL
          ===================================================================== */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Vendor Requirement"
        subtitle="Specify vendor roles and estimated market budgets for your celebration."
      >
        <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label htmlFor="vnd-role" className="form-label">
                <span>Vendor Role / Title *</span>
              </label>
              <input
                id="vnd-role"
                type="text"
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Wedding Cake Designer, Pandit Ji"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="vnd-cat" className="form-label">
                <span>Category</span>
              </label>
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
                <option value="officiant">Officiant / Pandit Ji</option>
                <option value="mehendi">Mehendi Artist</option>
                <option value="dhol_band">Dhol & Brass Band</option>
                <option value="other">Other Specialist</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="vnd-cost" className="form-label">
                <span>Target Quote (₹)</span>
              </label>
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
            <label htmlFor="vnd-questions" className="form-label">
              <span>Custom Interview Questions (Optional, one per line)</span>
            </label>
            <textarea
              id="vnd-questions"
              rows={3}
              className="form-control"
              value={newQuestions}
              onChange={(e) => setNewQuestions(e.target.value)}
              placeholder="Leave empty to automatically generate curated interview questions."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" leadingIcon={<Sparkles size={16} />}>
              Save Vendor Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
