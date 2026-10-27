import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Globe,
  Search,
  Compass,
  ShieldCheck,
  Building2,
  ChevronRight,
} from 'lucide-react';
import type { AuthUser } from '../../types/auth';
import { Button, Badge } from '../ui';

interface EmptyStateOnboardingProps {
  user: AuthUser | null;
  onCreateNew: () => void;
  onOpenAIPlanner: () => void;
  onOpenWebsiteBuilder: () => void;
  onLoadSampleData: () => void;
  onQuickStartWithCategory: (template: {
    title: string;
    eventType: 'wedding' | 'birthday' | 'community';
    eventDate: string;
    city: string;
    guestCount: number;
    totalBudget: number;
    theme: string;
  }) => void;
}

const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

const CELEBRATION_IDEAS = [
  {
    id: 'destination-wedding',
    title: 'Royal Destination Wedding',
    eventType: 'wedding' as const,
    eventDate: futureDate,
    city: 'Udaipur, Rajasthan',
    guestCount: 250,
    totalBudget: 2800000,
    theme: 'Mughal Elegance & Lake Palace Lights',
    tags: ['Wedding', 'Heritage', 'Palace'],
    icon: '👑',
  },
  {
    id: 'rooftop-birthday',
    title: 'Neon Rooftop Birthday Party',
    eventType: 'birthday' as const,
    eventDate: futureDate,
    city: 'Mumbai, Maharashtra',
    guestCount: 65,
    totalBudget: 250000,
    theme: 'Retro Synthwave & Sundowner Cocktails',
    tags: ['Birthday', 'Rooftop', 'Nightlife'],
    icon: '🎉',
  },
  {
    id: 'community-diwali',
    title: 'Grand Diwali & Dandiya Mela',
    eventType: 'community' as const,
    eventDate: futureDate,
    city: 'Bengaluru, Karnataka',
    guestCount: 500,
    totalBudget: 600000,
    theme: 'Traditional Diyas & Eco-Friendly Fireworks',
    tags: ['Festival', 'Community', 'Utsav'],
    icon: '🪔',
  },
  {
    id: 'beachside-anniversary',
    title: 'Sunset Beachside Anniversary Gala',
    eventType: 'wedding' as const,
    eventDate: futureDate,
    city: 'Goa',
    guestCount: 120,
    totalBudget: 1200000,
    theme: 'Bohemian White Sands & Acoustic Strings',
    tags: ['Anniversary', 'Beach', 'Intimate'],
    icon: '🏖️',
  },
];

export const EmptyStateOnboarding: React.FC<EmptyStateOnboardingProps> = ({
  user,
  onCreateNew,
  onOpenAIPlanner,
  onOpenWebsiteBuilder,
  onLoadSampleData,
  onQuickStartWithCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIdeas = CELEBRATION_IDEAS.filter((idea) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(q) ||
      idea.city.toLowerCase().includes(q) ||
      idea.theme.toLowerCase().includes(q) ||
      idea.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="onboarding-hub" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      {/* Welcome & Profile Header Banner */}
      <section
        className="card"
        style={{
          padding: '2.5rem 2rem',
          background: 'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface-subtle) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-label="User workspace welcome banner"
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                ✨ Fresh Private Database
              </span>
              {user?.roleLabel && (
                <Badge variant="wedding" size="sm">
                  <ShieldCheck size={12} style={{ marginRight: 4 }} />
                  {user.roleLabel}
                </Badge>
              )}
              {user?.organization && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} />
                  {user.organization}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem', lineHeight: 1.2 }}>
              Welcome, {user?.name || 'Celebration Host'}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
              Your workspace is clean and ready. There are no pre-saved plans in your account. You can create your first personalized celebration,
              explore tailored concepts, or build an interactive invitation website.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              onClick={onCreateNew}
              leftIcon={<Plus size={16} />}
              id="btn-onboarding-new"
            >
              Create New Celebration
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={onOpenWebsiteBuilder}
              leftIcon={<Globe size={16} color="var(--accent-primary)" />}
              id="btn-onboarding-website"
            >
              Event Website
            </Button>
          </div>
        </div>
      </section>

      {/* 3 Pillars Action Grid */}
      <section style={{ marginBottom: '2.5rem' }} aria-label="Creation methods">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>
          Start Your Celebration
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Action 1: AI Planner */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
              cursor: 'pointer',
            }}
            onClick={onOpenAIPlanner}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenAIPlanner();
            }}
          >
            <div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(231, 111, 81, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Sparkles size={22} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
                ✨ AI Celebration Planner
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Describe your vision in plain words. Gemini GenAI automatically computes localized itemized budgets, Muhurat timelines, vendor checklists, and contingency buffers.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
              Launch AI Planner <ChevronRight size={14} />
            </div>
          </div>

          {/* Action 2: Manual Setup */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
              cursor: 'pointer',
            }}
            onClick={onCreateNew}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onCreateNew();
            }}
          >
            <div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(42, 157, 143, 0.2), rgba(38, 70, 83, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Plus size={22} color="#2a9d8f" />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
                📝 Custom Event Wizard
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Configure dates, city, guest capacity, venue preferences, catering style, and cultural traditions step-by-step with real-time budget forecasting.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2a9d8f', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
              Open Setup Wizard <ChevronRight size={14} />
            </div>
          </div>

          {/* Action 3: Event Website Builder */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
              cursor: 'pointer',
            }}
            onClick={onOpenWebsiteBuilder}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenWebsiteBuilder();
            }}
          >
            <div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Globe size={22} color="#6366f1" />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
                🌐 Event Website & RSVP Portal
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Build a shareable invitation website with live countdown, Muhurat schedule, venue map, and interactive online RSVP for your guests.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
              Launch Website Builder <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Search & Celebration Concepts Explorer */}
      <section style={{ marginBottom: '2.5rem' }} aria-label="Celebration concepts explorer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Explore Celebration Concepts
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Search themes, venues, or locations to quick-start a plan customized for you.
            </p>
          </div>

          {/* Search Input Bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts (e.g. Udaipur, Beach, Neon)..."
              className="form-control"
              style={{
                paddingLeft: '2.4rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-xs)',
              }}
              aria-label="Search celebration ideas"
            />
          </div>
        </div>

        {/* Ideas Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className="card"
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{idea.icon}</span>
                  <Badge variant={idea.eventType === 'wedding' ? 'wedding' : idea.eventType === 'birthday' ? 'birthday' : 'community'} size="sm">
                    {idea.eventType}
                  </Badge>
                </div>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text)' }}>
                  {idea.title}
                </h4>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>📍 {idea.city}</span>
                  <span>👥 {idea.guestCount} Guests • 💰 ₹{(idea.totalBudget / 100000).toFixed(1)} Lakh</span>
                  <span style={{ fontStyle: 'italic', marginTop: '2px' }}>"{idea.theme}"</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onQuickStartWithCategory(idea)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Use this concept
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Explicit Demo Data Fallback Option */}
      <section
        style={{
          borderTop: '1px dashed var(--border)',
          paddingTop: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
        aria-label="Starter templates notice"
      >
        <div>
          <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--text)' }}>
            Looking for pre-filled demo data?
          </strong>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            If you want to inspect a complete pre-filled wedding, birthday, and community mela template, you can load them into this browser.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLoadSampleData}
          leftIcon={<Compass size={14} />}
          id="btn-onboarding-load-sample"
        >
          Load sample demo templates
        </Button>
      </section>
    </div>
  );
};
