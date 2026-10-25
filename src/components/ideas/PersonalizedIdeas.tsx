import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Sparkles,
  PlusCircle,
  CalendarPlus,
} from 'lucide-react';
import type { PersonalizedIdea, EventPlan, BudgetItem, TaskItem, BudgetCategory, TaskCategory } from '../../types/event';
import { Card, CardHeader, Button, Badge, EmptyState, useToast } from '../ui';

interface PersonalizedIdeasProps {
  plan: EventPlan;
  onRegenerateIdeas: () => void;
  onAddBudgetItem?: (item: Omit<BudgetItem, 'id'>) => void;
  onAddTask?: (task: Omit<TaskItem, 'id'>) => void;
  isGenerating?: boolean;
}

type IdeaTierFilter = 'all' | 'budget' | 'balanced' | 'premium';

function parseCostFromImpact(costImpact: string, tier: 'budget' | 'balanced' | 'premium'): number {
  const match = costImpact.match(/(\d+[\d,]*)/);
  if (match) {
    const raw = parseInt(match[1].replace(/,/g, ''), 10);
    if (!isNaN(raw) && raw > 0) {
      if (costImpact.toLowerCase().includes('lakh') || costImpact.toLowerCase().includes('l')) {
        return raw * 100000;
      }
      if (costImpact.toLowerCase().includes('k')) {
        return raw * 1000;
      }
      return raw;
    }
  }
  if (tier === 'budget') return 5000;
  if (tier === 'premium') return 35000;
  return 15000;
}

function mapIdeaCategoryToBudget(cat: string): BudgetCategory {
  switch (cat) {
    case 'food':
      return 'catering';
    case 'decor':
      return 'decor';
    case 'entertainment':
    case 'activity':
      return 'entertainment';
    case 'invitation':
      return 'invitations';
    default:
      return 'other';
  }
}

function mapIdeaCategoryToTask(cat: string): TaskCategory {
  switch (cat) {
    case 'food':
      return 'catering';
    case 'decor':
      return 'decor';
    case 'entertainment':
    case 'activity':
      return 'vendors';
    case 'invitation':
      return 'guests';
    default:
      return 'logistics';
  }
}

export const PersonalizedIdeas: React.FC<PersonalizedIdeasProps> = ({
  plan,
  onRegenerateIdeas,
  onAddBudgetItem,
  onAddTask,
  isGenerating = false,
}) => {
  const toast = useToast();
  const [selectedTier, setSelectedTier] = useState<IdeaTierFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const ideas = useMemo(() => plan.ideas || [], [plan.ideas]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      if (selectedTier !== 'all' && idea.tier !== selectedTier) return false;
      if (selectedCategory !== 'all' && idea.category !== selectedCategory) return false;
      return true;
    });
  }, [ideas, selectedTier, selectedCategory]);

  const handleAddToBudget = (idea: PersonalizedIdea) => {
    if (onAddBudgetItem) {
      const estimatedCost = parseCostFromImpact(idea.costImpact, idea.tier);
      onAddBudgetItem({
        name: idea.title,
        category: mapIdeaCategoryToBudget(idea.category),
        estimatedCost,
        priority: idea.tier === 'premium' ? 'optional' : idea.tier === 'budget' ? 'recommended' : 'essential',
        notes: `Idea source: ${idea.description}`,
      });
    }
    toast.showToast(`Added "${idea.title}" to budget!`, 'success');
  };

  const handleAddToTasks = (idea: PersonalizedIdea) => {
    if (onAddTask) {
      const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      onAddTask({
        title: `Plan: ${idea.title}`,
        category: mapIdeaCategoryToTask(idea.category),
        dueDate,
        completed: false,
        priority: idea.tier === 'premium' ? 'low' : idea.tier === 'budget' ? 'high' : 'medium',
        notes: idea.reasoning,
      });
    }
    toast.showToast(`Added "${idea.title}" to preparation tasks!`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* =====================================================================
          1. HEADER BANNER & TIER TABS
          ===================================================================== */}
      <Card>
        <CardHeader
          headingLevel="h2"
          title="Personalized Event Concepts & Alternatives"
          icon={<Lightbulb size={20} color="var(--accent-primary)" />}
          subtitle={`Tailored specifically for ${plan.eventType} celebrations with ${plan.guestCount} guests in ${plan.city}.${
            plan.accessibilityNeeds && plan.accessibilityNeeds.length > 0 ? ` Factoring in: ${plan.accessibilityNeeds.join(', ')}.` : ''
          }`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onRegenerateIdeas}
              disabled={isGenerating}
              isLoading={isGenerating}
              id="btn-regen-ideas-page"
              leadingIcon={<RefreshCw size={14} className={isGenerating ? 'spin' : ''} />}
            >
              {isGenerating ? 'Refreshing Ideas...' : 'Regenerate Suggestions'}
            </Button>
          }
        />

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {/* Low/Mid/High Tier Tabs */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant={selectedTier === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTier('all')}
              aria-pressed={selectedTier === 'all'}
            >
              All Tiers ({ideas.length})
            </Button>
            <Button
              variant={selectedTier === 'budget' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTier('budget')}
              leadingIcon={<TrendingDown size={13} color="var(--color-success)" />}
              aria-pressed={selectedTier === 'budget'}
            >
              Low (Cost Savers)
            </Button>
            <Button
              variant={selectedTier === 'balanced' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTier('balanced')}
              leadingIcon={<Scale size={13} />}
              aria-pressed={selectedTier === 'balanced'}
            >
              Mid (Balanced)
            </Button>
            <Button
              variant={selectedTier === 'premium' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTier('premium')}
              leadingIcon={<TrendingUp size={13} color="var(--accent-primary)" />}
              aria-pressed={selectedTier === 'premium'}
            >
              High (Luxe / Elevated)
            </Button>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label htmlFor="idea-cat-filter" className="sr-only">
              Category
            </label>
            <select
              id="idea-cat-filter"
              className="form-control"
              style={{ width: '160px', padding: '4px 8px', fontSize: 'var(--text-xs)', height: '36px' }}
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

      {/* =====================================================================
          2. IDEAS GRID (Or Loading Skeleton / Empty State)
          ===================================================================== */}
      {isGenerating ? (
        <div className="grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                height: '240px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-raised)',
              }}
              className="ui-skeleton"
            />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles size={38} color="var(--text-muted)" />}
            title="No Concepts Found"
            description="Try selecting 'All Tiers' or 'All Categories' to view recommended ideas."
            action={
              <Button variant="secondary" size="sm" onClick={() => { setSelectedTier('all'); setSelectedCategory('all'); }}>
                Reset Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid-cols-2">
          {filteredIdeas.map((idea) => {
            const isCostSaver = idea.tier === 'budget';
            const isPremium = idea.tier === 'premium';

            return (
              <Card
                key={idea.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                  borderLeft: isCostSaver
                    ? '5px solid var(--color-success)'
                    : isPremium
                    ? '5px solid var(--accent-primary)'
                    : '5px solid var(--color-info)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {idea.category}
                    </span>

                    {/* ₹ Cost-Impact Badge */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Badge
                        variant={isCostSaver ? 'success' : isPremium ? 'warning' : 'info'}
                      >
                        {idea.costImpact}
                      </Badge>
                      <Badge variant="neutral">
                        {idea.tier === 'budget' ? 'Cost Saver' : idea.tier === 'premium' ? 'Elevated' : 'Balanced'}
                      </Badge>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', marginTop: 'var(--space-2)' }}>
                    {idea.title}
                  </h3>

                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', lineHeight: 1.6 }}>
                    {idea.description}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      backgroundColor: 'var(--surface-subtle)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      border: '1px solid var(--border)',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    <div style={{ color: 'var(--text)' }}>
                      <strong>Why this fits:</strong> {idea.reasoning}
                    </div>
                  </div>

                  {/* Actions: "Add to budget" and "Add to tasks" with toasts */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddToBudget(idea)}
                      leadingIcon={<PlusCircle size={13} />}
                      aria-label={`Add ${idea.title} to budget`}
                    >
                      Add to budget
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddToTasks(idea)}
                      leadingIcon={<CalendarPlus size={13} />}
                      aria-label={`Add ${idea.title} to tasks`}
                    >
                      Add to tasks
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
