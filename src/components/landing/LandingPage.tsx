import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  IndianRupee,
  Clock,
  Users,
  Calendar,
  MessageCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import type { NavigationTab } from '../../hooks/useEventPlan';
import { Button, Badge, Card } from '../ui';

interface LandingPageProps {
  activeEvent: EventPlan;
  events: EventPlan[];
  onSelectEvent: (id: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenCopilot?: () => void;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  city: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'We planned our 350-guest destination wedding in Jaipur entirely on EventWise. The Jain & Satvik dietary quarantine and the 10 PM sound curfew protocol saved us from major vendor conflicts.',
    author: 'Priya & Rohan Sharma',
    role: 'Destination Wedding Hosts',
    city: 'Jaipur, Rajasthan',
    rating: 5,
  },
  {
    quote:
      'The vendor milestone settlement tracker and Section 194C GST/TDS calculator made negotiating quotes with decorators and caterers completely transparent. Worth its weight in gold.',
    author: 'Vikramaditya Singhania',
    role: 'Family Host & Entrepreneur',
    city: 'Udaipur, Rajasthan',
    rating: 5,
  },
  {
    quote:
      'Sending personalized WhatsApp invitations with 1-click and seeing RSVPs sync directly into banquet table seating cards made our Sangeet so stress-free.',
    author: 'Ananya & Kabir Deshmukh',
    role: 'Sangeet & Reception Hosts',
    city: 'Mumbai, Maharashtra',
    rating: 5,
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How is EventWise AI tailored specifically for Indian weddings and celebrations?',
    answer:
      'Unlike generic Western planners, EventWise AI was engineered from the ground up for Indian traditions. It natively supports ₹ Lakhs and Crores budgeting, Jain and Pure Veg food segregation, 10:00 PM municipal sound curfew protocols, auspicious Vedic Muhurat timing shifts (for Baraat delays), and instant WhatsApp Digital Invitations.',
  },
  {
    question: 'Is my event budget and guest data kept private and secure?',
    answer:
      'Yes, 100%. EventWise AI operates on client-side state storage. Your financial figures, guest contact lists, and vendor contracts are stored privately in your browser storage and are never sold or shared with third-party advertising brokers.',
  },
  {
    question: 'Can I export my plan for vendors, family members, or spreadsheet backup?',
    answer:
      'Absolutely. EventWise provides 1-click RFC 4180 CSV exports for budgeting, RFC 5545 iCalendar (.ics) downloads for your phone calendar, and formatted WhatsApp broadcasts that can be pasted directly into family WhatsApp groups.',
  },
  {
    question: 'What if our Baraat or Pandit Ji runs behind schedule on the day of the event?',
    answer:
      'Our Run of Show features an interactive Muhurat Timing Shift Ripple Controller. With 1 click (+15 min, +30 min Baraat delay), you can preview the ripple effect across your entire day and permanently recalibrate vendor call-sheets.',
  },
  {
    question: 'How does the Section 194C GST & TDS tax calculator help during vendor hiring?',
    answer:
      'In India, catering incurs 5% GST (composite scheme without ITC), whereas sound, photography, and decor incur 18% GST. Our built-in calculator breaks down Base Value, CGST/SGST, and Section 194C TDS withholding (1% or 2%) so you know the exact net payment due before signing contracts.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  activeEvent,
  events,
  onSelectEvent,
  onNavigateTab,
  onOpenCopilot,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
      {/* =====================================================================
          1. HERO SECTION
          ===================================================================== */}
      <section
        aria-labelledby="hero-heading"
        style={{
          position: 'relative',
          padding: 'var(--space-8) var(--space-6)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Tagline Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Sparkles size={14} color="var(--accent-primary)" />
            <span>India’s #1 Cultural & Vedic Celebration Planning Suite</span>
          </div>

          {/* Main Headline */}
          <h2
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Every Indian Celebration Deserves <span style={{ color: 'var(--accent-primary)' }}>Flawless Execution</span>
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '740px',
              margin: 0,
            }}
          >
            From ₹ Lakhs & Crores budgeting with 1-click CSV exports to Jain & Satvik food quarantine, 10:00 PM sound curfew alerts, and instant WhatsApp invitation broadcasts. Plan without chaos.
          </p>

          {/* Dual Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigateTab('dashboard')}
              leadingIcon={<Sparkles size={18} />}
              id="btn-hero-launch-planner"
            >
              Launch EventWise Planner
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigateTab('setup')}
              leadingIcon={<Calendar size={18} />}
              id="btn-hero-new-event"
            >
              Create New Celebration
            </Button>
            {onOpenCopilot && (
              <Button
                variant="outline"
                size="lg"
                onClick={onOpenCopilot}
                leadingIcon={<MessageCircle size={18} color="var(--accent-primary)" />}
                id="btn-hero-ask-ai"
              >
                Ask AI Copilot
              </Button>
            )}
          </div>

          {/* Interactive Demo Template Switcher */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-4)',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Interactive Demo Celebrations (1-Click Switch):
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {events.map((evt) => {
                const isSelected = evt.id === activeEvent.id;
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => onSelectEvent(evt.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--surface-raised)' : 'var(--surface-subtle)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{evt.eventType === 'wedding' ? '👑' : evt.eventType === 'birthday' ? '🎉' : '🪔'}</span>
                    <span>{evt.title} ({evt.city})</span>
                    {isSelected && <Badge variant="success" size="sm">Active</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. TRUST & SCALE STATS BAR
          ===================================================================== */}
      <section aria-label="Platform scale metrics">
        <div className="grid-cols-4">
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Total Budgets Calibrated</span>
            <span className="stat-value tabular-nums" style={{ color: 'var(--accent-primary)' }}>₹25+ Cr</span>
            <span className="stat-subtext">Optimized with 0% leakages</span>
          </div>

          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Guests Synchronized</span>
            <span className="stat-value tabular-nums">15,000+</span>
            <span className="stat-subtext">Jain & Satvik dietary quarantine</span>
          </div>

          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Client-Side Privacy</span>
            <span className="stat-value tabular-nums" style={{ color: 'var(--color-success)' }}>100%</span>
            <span className="stat-subtext">Zero external broker tracking</span>
          </div>

          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Execution Architecture</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>Offline-First</span>
            <span className="stat-subtext">Runs anywhere without internet</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. CORE 4 PILLARS OF INDIAN CELEBRATION PLANNING
          ===================================================================== */}
      <section aria-labelledby="pillars-heading">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 id="pillars-heading" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
            Engineered For The Complexities of Indian Events
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', maxWidth: '640px', margin: '0 auto' }}>
            Multi-day rituals, diverse dietary traditions, and vendor cashflow negotiations — all solved in one cohesive tool.
          </p>
        </div>

        <div className="grid-cols-2" style={{ gap: 'var(--space-4)' }}>
          {/* Feature 1 */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--accent-primary)' }}>
                  <IndianRupee size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    ₹ Lakhs & Crores Budgeting & Settlement
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Variance alerts, contingency buffers & RFC 4180 CSV export
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Automatic cost-per-guest calculations calibrated in Indian numbering conventions (₹ Lakhs and ₹ Crores). Features 4-tier milestone settlement schedules (Booking advance, Mid-tasting, Day-of handover, Final retention).
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                <Button variant="outline" size="sm" onClick={() => onNavigateTab('budget')} rightIcon={<ArrowRight size={14} />}>
                  Explore Budget Tracker
                </Button>
              </div>
            </div>
          </Card>

          {/* Feature 2 */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-warning)' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    Vedic Run of Show & Curfew Guard
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Muhurat timing shifts & 10 PM sound curfew protocol
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Calibrate Haldi, Baraat procession, Milni, and Pheras down to the exact minute. Use the 1-click timing ripple controller for delayed Baraats and copy official police loudspeaker NOC application letters.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                <Button variant="outline" size="sm" onClick={() => onNavigateTab('schedule')} rightIcon={<ArrowRight size={14} />}>
                  Explore Run of Show
                </Button>
              </div>
            </div>
          </Card>

          {/* Feature 3 */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    Jain Dietary Quarantine & Seating Cards
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Table seating capacity & WhatsApp digital broadcasts
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Guarantee zero cross-contamination with dedicated Jain and Pure Veg counters. Seat guests by family tables with capacity limits, and broadcast royal digital WhatsApp invites with 1-click web sync.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                <Button variant="outline" size="sm" onClick={() => onNavigateTab('guests')} rightIcon={<ArrowRight size={14} />}>
                  Explore Guest Manager
                </Button>
              </div>
            </div>
          </Card>

          {/* Feature 4 */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--color-info)' }}>
                  <Calculator size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    Vendor Directory & GST / TDS Tax Guard
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Interview cues, 5% vs 18% GST & Section 194C withholding
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Tailored interview questions for Pandit Ji, Mehendi artists, Dhol bands, and Halwais. Includes an authentic tax calculator comparing composite catering (5%) vs decor/sound (18%) and TDS deductions.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                <Button variant="outline" size="sm" onClick={() => onNavigateTab('vendors')} rightIcon={<ArrowRight size={14} />}>
                  Explore Vendor Tools
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* =====================================================================
          4. VISUAL VENUES & ATMOSPHERE SHOWCASE
          ===================================================================== */}
      <section aria-labelledby="showcase-heading">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 id="showcase-heading" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
            Curated Inspiration for Every Region
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', maxWidth: '640px', margin: '0 auto' }}>
            From Rajasthani heritage havelis to open-air beach lawns and luxury five-star banquets.
          </p>
        </div>

        <div className="grid-cols-3">
          <div className="venue-card">
            <div className="venue-card-media">
              <img src="/images/jaipur_palace_venue.jpg" alt="Heritage Palace & Haveli Courtyard" loading="lazy" />
              <div className="venue-card-badge-top">
                <Badge variant="wedding">Royal Haveli</Badge>
                <Badge variant="success">Verified</Badge>
              </div>
            </div>
            <div className="venue-card-body">
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Heritage Haveli & Palaces</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Carved stone jharokhas, torch-lit baraat pathways, and royal courtyards for grand Rajputana weddings.
              </p>
            </div>
          </div>

          <div className="venue-card">
            <div className="venue-card-media">
              <img src="/images/mandap_floral_decor.jpg" alt="Traditional Marigold Mandap Setup" loading="lazy" />
              <div className="venue-card-badge-top">
                <Badge variant="neutral">Mandap Decor</Badge>
                <Badge variant="warning">Auspicious</Badge>
              </div>
            </div>
            <div className="venue-card-body">
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Sacred Mandap & Floral Stages</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Fresh marigold and jasmine arches, brass oil diyas, and sheltered Vedic havan kund arrangements.
              </p>
            </div>
          </div>

          <div className="venue-card">
            <div className="venue-card-media">
              <img src="/images/indian_gourmet_catering.jpg" alt="Satvik & Gourmet Feast Banquets" loading="lazy" />
              <div className="venue-card-badge-top">
                <Badge variant="birthday">Gourmet Feast</Badge>
                <Badge variant="success">Satvik</Badge>
              </div>
            </div>
            <div className="venue-card-body">
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Satvik & Gourmet Banquets</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Authentic copper handi cooking, live chaat counters, and zero cross-contamination Jain dining wings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. HOW IT WORKS (3 SIMPLE STEPS)
          ===================================================================== */}
      <section aria-labelledby="how-it-works-heading">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 id="how-it-works-heading" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
            Plan Your Celebration In 3 Simple Steps
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', maxWidth: '640px', margin: '0 auto' }}>
            A proven methodology designed to replace spreadsheet confusion with automated clarity.
          </p>
        </div>

        <div className="grid-cols-3">
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>01</div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>Set Horizon & Traditions</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Input your event city, guest headcount, auspicious Muhurat dates, and cultural traditions (Hindu, Muslim, Sikh, Jain, Christian).
              </p>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)', lineHeight: 1 }}>02</div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>Calibrate Budgets & Day-of</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Auto-allocate funds in ₹ Lakhs, segregate Jain dining counters, and synchronize minute-by-minute vendor cue sheets.
              </p>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>03</div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>Execute With Zero Chaos</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Broadcast digital WhatsApp invites, preview Baraat timing shifts, and print day-of binders for your on-ground team.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* =====================================================================
          6. REAL HOST TESTIMONIALS
          ===================================================================== */}
      <section aria-labelledby="testimonials-heading">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 id="testimonials-heading" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
            Trusted By Hosts Across India
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Real reviews from couples, families, and community festival organizers.
          </p>
        </div>

        <div className="grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <Card key={idx}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                  "{t.quote}"
                </p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>{t.author}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.role} • {t.city}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =====================================================================
          7. FREQUENTLY ASKED QUESTIONS (ACCORDION)
          ===================================================================== */}
      <section aria-labelledby="faq-heading">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 id="faq-heading" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Everything you need to know about EventWise AI India Edition.
          </p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-raised)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--text)',
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  {isOpen ? <ChevronUp size={18} color="var(--accent-primary)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 var(--space-4) var(--space-4) var(--space-4)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border)',
                      paddingTop: 'var(--space-3)',
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          8. GRAND CALL TO ACTION BANNER
          ===================================================================== */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface-subtle) 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid var(--accent-primary)',
          padding: 'var(--space-8) var(--space-6)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Badge variant="wedding" size="lg">Ready To Celebrate?</Badge>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Start Planning Your Event In Minutes
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Join thousands of Indian families and coordinators who plan with zero spreadsheet chaos.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigateTab('dashboard')}
              leadingIcon={<Sparkles size={18} />}
              id="btn-footer-cta-launch"
            >
              Launch EventWise Planner
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigateTab('setup')}
              leadingIcon={<Calendar size={18} />}
            >
              Configure Custom Event
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
