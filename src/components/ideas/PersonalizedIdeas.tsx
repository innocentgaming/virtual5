import React, { useState } from 'react';
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
} from 'lucide-react';
import type { PersonalizedIdea, EventPlan } from '../../types/event';

interface PersonalizedIdeasProps {
  plan: EventPlan;
  onRegenerateIdeas: () => void;
  isGenerating?: boolean;
}

export const PersonalizedIdeas: React.FC<PersonalizedIdeasProps> = ({
  plan,
  onRegenerateIdeas,
  isGenerating = false,
}) => {
  const [selectedTier, setSelectedTier] = useState<'all' | 'budget' | 'balanced' | 'premium'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredIdeas = plan.ideas.filter((idea) => {
    if (selectedTier !== 'all' && idea.tier !== selectedTier) return false;
    if (selectedCategory !== 'all' && idea.category !== selectedCategory) return false;
    return true;
  });

  const getTierBadge = (tier: PersonalizedIdea['tier']) => {
    switch (tier) {
      case 'budget':
        return (
          <span className="badge badge-success" style={{ gap: '0.2rem' }}>
            <TrendingDown size={12} /> Cost Saver
          </span>
        );
      case 'premium':
        return (
          <span className="badge badge-wedding" style={{ gap: '0.2rem' }}>
            <TrendingUp size={12} /> Premium
          </span>
        );
      default:
        return (
          <span className="badge badge-info" style={{ gap: '0.2rem' }}>
            <Scale size={12} /> Balanced
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Lightbulb size={20} color="var(--accent-primary)" />
              Personalized Event Concepts & Alternatives
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Tailored specifically to your {plan.eventType} for {plan.guestCount} guests in {plan.city}.
              {plan.accessibilityNeeds.length > 0 && ` Factoring in: ${plan.accessibilityNeeds.join(', ')}.`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onRegenerateIdeas}
            disabled={isGenerating}
            id="btn-regen-ideas-page"
          >
            <RefreshCw size={14} className={isGenerating ? 'spin' : ''} />
            <span>{isGenerating ? 'Refreshing Ideas...' : 'Regenerate Suggestions'}</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Tier Filters */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'all', label: 'All Tiers' },
                { id: 'budget', label: 'Cost Savers' },
                { id: 'balanced', label: 'Balanced' },
                { id: 'premium', label: 'Elevated / Luxe' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn btn-sm ${selectedTier === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedTier(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="idea-cat-filter" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
              Category
            </label>
            <select
              id="idea-cat-filter"
              className="form-control"
              style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="theme">Themes</option>
              <option value="decor">Decor & Florals</option>
              <option value="food">Food & Catering</option>
              <option value="activity">Activities</option>
              <option value="entertainment">Entertainment</option>
              <option value="invitation">Invitations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid-cols-2">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
              borderLeft:
                idea.tier === 'budget'
                  ? '5px solid var(--color-success)'
                  : idea.tier === 'premium'
                  ? '5px solid #be185d'
                  : '5px solid var(--accent-primary)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {idea.category}
                </span>
                {getTierBadge(idea.tier)}
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {idea.title}
              </h4>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                {idea.description}
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div>
                <strong>Estimated Cost Impact:</strong> {idea.costImpact}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                <strong>Why this fits:</strong> {idea.reasoning}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
