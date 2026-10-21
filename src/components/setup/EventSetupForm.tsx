import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Cake,
  Users,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import type {
  EventType,
  VenuePreference,
  FoodPreference,
  PriorityArea,
  EventPlan,
} from '../../types/event';
import { formatCurrency } from '../../utils/formatters';

interface EventSetupFormProps {
  initialPlan?: EventPlan;
  isEditing?: boolean;
  onSave: (
    data: {
      title: string;
      eventType: EventType;
      eventDate: string;
      city: string;
      guestCount: number;
      totalBudget: number;
      venuePreference: VenuePreference;
      foodPreference: FoodPreference;
      theme: string;
      priorities: PriorityArea[];
      accessibilityNeeds: string[];
      culturalTraditions: string;
      specialNotes: string;
      contingencyRate: number;
    },
    useAI: boolean
  ) => void;
  onCancel?: () => void;
  isGenerating?: boolean;
}

export const EventSetupForm: React.FC<EventSetupFormProps> = ({
  initialPlan,
  isEditing = false,
  onSave,
  onCancel,
  isGenerating = false,
}) => {
  const [eventType, setEventType] = useState<EventType>(initialPlan?.eventType || 'wedding');
  const [title, setTitle] = useState(initialPlan?.title || '');
  const [eventDate, setEventDate] = useState(() =>
    initialPlan?.eventDate ||
      new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  );
  const [city, setCity] = useState(initialPlan?.city || 'San Francisco, CA');
  const [guestCount, setGuestCount] = useState<number>(initialPlan?.guestCount || 100);
  const [totalBudget, setTotalBudget] = useState<number>(initialPlan?.totalBudget || 25000);
  const [venuePreference, setVenuePreference] = useState<VenuePreference>(
    initialPlan?.venuePreference || 'banquet_hall'
  );
  const [foodPreference, setFoodPreference] = useState<FoodPreference>(
    initialPlan?.foodPreference || 'buffet'
  );
  const [theme, setTheme] = useState(initialPlan?.theme || 'Modern Elegant');
  const [contingencyRate, setContingencyRate] = useState<number>(
    initialPlan?.contingencyRate !== undefined ? Math.round(initialPlan.contingencyRate * 100) : 10
  );
  const [priorities, setPriorities] = useState<PriorityArea[]>(
    initialPlan?.priorities || ['venue', 'catering']
  );
  const [accessibilityInput, setAccessibilityInput] = useState(
    initialPlan?.accessibilityNeeds?.join(', ') || 'Wheelchair step-free access'
  );
  const [culturalTraditions, setCulturalTraditions] = useState(
    initialPlan?.culturalTraditions || ''
  );
  const [specialNotes, setSpecialNotes] = useState(initialPlan?.specialNotes || '');
  const [useAI, setUseAI] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const togglePriority = (p: PriorityArea) => {
    if (priorities.includes(p)) {
      setPriorities(priorities.filter((item) => item !== p));
    } else {
      setPriorities([...priorities, p]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!city.trim()) errors.push('Please enter a City or location.');
    if (!eventDate) errors.push('Please select a target Event Date.');
    if (guestCount <= 0 || isNaN(guestCount)) errors.push('Guest count must be at least 1.');
    if (totalBudget < 0 || isNaN(totalBudget)) errors.push('Budget cannot be negative.');

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);

    const accessibilityList = accessibilityInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const generatedTitle =
      title.trim() ||
      `${theme} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;

    onSave(
      {
        title: generatedTitle,
        eventType,
        eventDate,
        city: city.trim(),
        guestCount: Number(guestCount),
        totalBudget: Number(totalBudget),
        venuePreference,
        foodPreference,
        theme: theme.trim() || 'Modern Elegant',
        priorities,
        accessibilityNeeds: accessibilityList,
        culturalTraditions: culturalTraditions.trim(),
        specialNotes: specialNotes.trim(),
        contingencyRate: contingencyRate / 100,
      },
      useAI
    );
  };

  return (
    <div className="card" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">
          <Sparkles size={20} color="var(--accent-primary)" />
          {isEditing ? 'Edit Event Parameters' : 'Create & Personalize New Event'}
        </h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">
            Cancel
          </button>
        )}
      </div>

      {formErrors.length > 0 && (
        <div className="alert-box alert-danger" role="alert">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Please resolve the following:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
              {formErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Step 1: Event Type Selector */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Event Type</label>
          <div className="grid-cols-3" style={{ marginTop: '0.25rem' }}>
            <button
              type="button"
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '1.25rem 1rem',
                borderColor: eventType === 'wedding' ? 'var(--accent-primary)' : 'var(--border-light)',
                backgroundColor: eventType === 'wedding' ? 'var(--accent-subtle)' : 'var(--bg-card)',
              }}
              onClick={() => {
                setEventType('wedding');
                if (!title || title.includes('Birthday') || title.includes('Festival')) {
                  setTitle('Timeless Romantic Wedding');
                }
              }}
            >
              <Heart size={28} color="#be185d" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Wedding</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ceremony, reception, banquet</div>
            </button>

            <button
              type="button"
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '1.25rem 1rem',
                borderColor: eventType === 'birthday' ? 'var(--accent-primary)' : 'var(--border-light)',
                backgroundColor: eventType === 'birthday' ? 'var(--accent-subtle)' : 'var(--bg-card)',
              }}
              onClick={() => {
                setEventType('birthday');
                if (!title || title.includes('Wedding') || title.includes('Festival')) {
                  setTitle('Milestone Birthday Party');
                }
              }}
            >
              <Cake size={28} color="#7c3aed" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Birthday</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parties, milestones & kids</div>
            </button>

            <button
              type="button"
              className="card"
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '1.25rem 1rem',
                borderColor: eventType === 'community' ? 'var(--accent-primary)' : 'var(--border-light)',
                backgroundColor: eventType === 'community' ? 'var(--accent-subtle)' : 'var(--bg-card)',
              }}
              onClick={() => {
                setEventType('community');
                if (!title || title.includes('Wedding') || title.includes('Birthday')) {
                  setTitle('Community Gala & Festival');
                }
              }}
            >
              <Users size={28} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Community</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Galas, fundraisers, town hall</div>
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid-cols-2">
          <div className="form-group">
            <label htmlFor="evt-title" className="form-label">Event Title / Name</label>
            <input
              id="evt-title"
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Garden Wedding"
            />
          </div>

          <div className="form-group">
            <label htmlFor="evt-date" className="form-label">Target Event Date *</label>
            <input
              id="evt-date"
              type="date"
              className="form-control"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid-cols-3">
          <div className="form-group">
            <label htmlFor="evt-city" className="form-label">City / Location *</label>
            <input
              id="evt-city"
              type="text"
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin, TX"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="evt-guests" className="form-label">Guest Count *</label>
            <input
              id="evt-guests"
              type="number"
              min="1"
              max="5000"
              className="form-control"
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="evt-budget" className="form-label">Approximate Budget ($) *</label>
            <input
              id="evt-budget"
              type="number"
              min="0"
              step="100"
              className="form-control"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Math.max(0, parseInt(e.target.value) || 0))}
              required
            />
          </div>
        </div>

        {/* Venue & Food Preferences */}
        <div className="grid-cols-2" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label htmlFor="evt-venue" className="form-label">Venue Preference</label>
            <select
              id="evt-venue"
              className="form-control"
              value={venuePreference}
              onChange={(e) => setVenuePreference(e.target.value as VenuePreference)}
            >
              <option value="indoor">Indoor Hall / Ballroom</option>
              <option value="outdoor">Outdoor Lawn</option>
              <option value="banquet_hall">Banquet Hall</option>
              <option value="garden_park">Botanical Garden / Public Park</option>
              <option value="community_center">Community Civic Center</option>
              <option value="beach">Beach / Waterfront</option>
              <option value="rooftop">Rooftop Lounge</option>
              <option value="hotel">Hotel Conference Ballroom</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="evt-food" className="form-label">Food & Beverage Style</label>
            <select
              id="evt-food"
              className="form-control"
              value={foodPreference}
              onChange={(e) => setFoodPreference(e.target.value as FoodPreference)}
            >
              <option value="buffet">Buffet Service (Balanced Cost)</option>
              <option value="plated">Plated Multi-Course Dinner (Premium)</option>
              <option value="cocktail">Hors d'oeuvres & Cocktail Reception</option>
              <option value="food_trucks">Food Trucks & Casual Stalls</option>
              <option value="family_style">Family Style Sharing Platters</option>
              <option value="potluck">Community Potluck / Self-Catering</option>
            </select>
          </div>
        </div>

        {/* Theme & Contingency */}
        <div className="grid-cols-2" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label htmlFor="evt-theme" className="form-label">Theme / Atmosphere</label>
            <input
              id="evt-theme"
              type="text"
              className="form-control"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Rustic Elegance, Bohemian Chic, Retro 80s"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="evt-contingency" className="form-label">Contingency Reserve: {contingencyRate}%</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reserve: {formatCurrency(Math.round((totalBudget * contingencyRate) / 100))}
              </span>
            </div>
            <input
              id="evt-contingency"
              type="range"
              min="0"
              max="25"
              step="1"
              value={contingencyRate}
              onChange={(e) => setContingencyRate(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* Priority Areas */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Top Priorities (Budget will favor selected areas)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
            {(
              [
                { id: 'venue', label: 'Venue & Ambiance' },
                { id: 'catering', label: 'Food & Gourmet Dining' },
                { id: 'photography', label: 'Photography & Memories' },
                { id: 'entertainment', label: 'Music & Entertainment' },
                { id: 'decor', label: 'Floral & Visual Decor' },
                { id: 'budget_savings', label: 'Cost Savings / DIY' },
                { id: 'guest_experience', label: 'Guest Comfort & Fun' },
              ] as { id: PriorityArea; label: string }[]
            ).map((item) => {
              const active = priorities.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => togglePriority(item.id)}
                >
                  {active && <Check size={14} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accessibility & Traditions */}
        <div className="grid-cols-2" style={{ marginTop: '0.75rem' }}>
          <div className="form-group">
            <label htmlFor="evt-accessibility" className="form-label">Accessibility & Dietary Requirements</label>
            <input
              id="evt-accessibility"
              type="text"
              className="form-control"
              value={accessibilityInput}
              onChange={(e) => setAccessibilityInput(e.target.value)}
              placeholder="e.g. Wheelchair ramp, Gluten-free, Quiet room"
            />
            <span className="form-hint">Comma separated. Injects specific vendor checks.</span>
          </div>

          <div className="form-group">
            <label htmlFor="evt-traditions" className="form-label">Cultural Traditions / Rituals</label>
            <input
              id="evt-traditions"
              type="text"
              className="form-control"
              value={culturalTraditions}
              onChange={(e) => setCulturalTraditions(e.target.value)}
              placeholder="e.g. Tea ceremony, Ring exchange, Blessing"
            />
          </div>
        </div>

        {/* Special Notes */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label htmlFor="evt-notes" className="form-label">Special Preferences or Instructions</label>
          <textarea
            id="evt-notes"
            rows={2}
            className="form-control"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="Any specific requests, favorite styles, or must-haves..."
          />
        </div>

        {/* Planner Mode Selection */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card-subtle)',
            marginTop: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="#059669" />
              Planner Engine Option
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Deterministic Rule Engine runs offline instantly. AI uses Gemini API if configured.
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span>Attempt GenAI Generation</span>
          </label>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isGenerating}
            id="btn-save-event-plan"
          >
            {isGenerating ? (
              <span>Analyzing & Generating Plan...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{isEditing ? 'Save Changes & Recalculate' : 'Generate Event Plan'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
