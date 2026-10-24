import React, { useState } from 'react';
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { PersonalizedIdea, EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge, EmptyState } from '../ui';

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
          <Badge variant="success" icon={<TrendingDown size={12} />}>
            Cost Saver
          </Badge>
        );
      case 'premium':
        return (
          <Badge variant="wedding" icon={<TrendingUp size={12} />}>
            Premium
          </Badge>
        );
      default:
        return (
          <Badge variant="info" icon={<Scale size={12} />}>
            Balanced
          </Badge>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <Card>
        <CardHeader
          title="Personalized Event Concepts & Alternatives"
          icon={<Lightbulb size={20} color="var(--accent-primary)" />}
          subtitle={`Tailored specifically to your ${plan.eventType} for ${plan.guestCount} guests in ${plan.city}.${
            plan.accessibilityNeeds.length > 0 ? ` Factoring in: ${plan.accessibilityNeeds.join(', ')}.` : ''
          }`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onRegenerateIdeas}
              disabled={isGenerating}
              isLoading={isGenerating}
              id="btn-regen-ideas-page"
              leftIcon={<RefreshCw size={14} className={isGenerating ? 'spin' : ''} />}
            >
              {isGenerating ? 'Refreshing Ideas...' : 'Regenerate Suggestions'}
            </Button>
          }
        />

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
              <Button
                key={t.id}
                variant={selectedTier === t.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedTier(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              htmlFor="idea-cat-filter"
              className="sr-only"
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
            >
              Category
            </label>
            <select
              id="idea-cat-filter"
              className="form-control"
              style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.8125rem', height: '34px', minHeight: '34px' }}
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
      </Card>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={36} color="var(--text-muted)" />}
          title="No Concepts Found"
          description="Try selecting 'All Tiers' or 'All Categories' to view recommended ideas."
        />
      ) : (
        <div className="grid-cols-2">
          {filteredIdeas.map((idea) => (
            <Card
              key={idea.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.875rem',
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    {idea.category}
                  </span>
                  {getTierBadge(idea.tier)}
                </div>

                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                  {idea.title}
                </h4>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '0.5rem', lineHeight: 1.55 }}>
                  {idea.description}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div>
                  <strong>Estimated Cost Impact:</strong> {idea.costImpact}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <strong>Why this fits:</strong> {idea.reasoning}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
