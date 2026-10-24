import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Cake,
  Users,
  ShieldCheck,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Layers,
} from 'lucide-react';
import type {
  EventType,
  VenuePreference,
  FoodPreference,
  PriorityArea,
  EventPlan,
} from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { Card, CardHeader, Button } from '../ui';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [eventType, setEventType] = useState<EventType>(initialPlan?.eventType || 'wedding');
  const [title, setTitle] = useState(initialPlan?.title || '');
  const [eventDate, setEventDate] = useState(() =>
    initialPlan?.eventDate ||
      new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  );
  const [city, setCity] = useState(initialPlan?.city || 'Jaipur, Rajasthan');
  const [guestCount, setGuestCount] = useState<number>(initialPlan?.guestCount || 250);
  const [totalBudget, setTotalBudget] = useState<number>(initialPlan?.totalBudget || 1500000);
  const [venuePreference, setVenuePreference] = useState<VenuePreference>(
    initialPlan?.venuePreference || 'heritage_haveli'
  );
  const [foodPreference, setFoodPreference] = useState<FoodPreference>(
    initialPlan?.foodPreference || 'royal_thali'
  );
  const [theme, setTheme] = useState(initialPlan?.theme || 'Royal Marigold & Antique Gold');
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

  const validateStep = (stepNumber: number): boolean => {
    const errors: string[] = [];
    if (stepNumber === 1 || stepNumber === 0) {
      if (!eventDate) errors.push('Please select a target Event Date.');
    }
    if (stepNumber === 2 || stepNumber === 0) {
      if (!city.trim()) errors.push('Please enter a City or location.');
      if (guestCount <= 0 || isNaN(guestCount)) errors.push('Guest count must be at least 1.');
      if (totalBudget < 0 || isNaN(totalBudget)) errors.push('Budget cannot be negative.');
    }
    if (errors.length > 0) {
      setFormErrors(errors);
      return false;
    }
    setFormErrors([]);
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (Math.min(prev + 1, 3) as 1 | 2 | 3));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(0)) {
      // Jump to step with missing info
      if (!city.trim() || guestCount <= 0 || totalBudget < 0) {
        setCurrentStep(2);
      } else if (!eventDate) {
        setCurrentStep(1);
      }
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
    <Card style={{ maxWidth: '880px', margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
      <CardHeader
        title={isEditing ? 'Edit Event Parameters' : 'Create & Personalize New Event'}
        icon={<Sparkles size={22} color="var(--accent-primary)" />}
        subtitle="Culturally ground your event plan with authentic Indian budgets, Vedic rituals & dietary controls."
        action={
          onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )
        }
      />

      {/* Stepper Wizard Progress Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
        role="tablist"
        aria-label="Setup Wizard Steps"
      >
        {[
          { step: 1, label: '1. Vision & Date', icon: <Heart size={16} /> },
          { step: 2, label: '2. Location & Scale', icon: <MapPin size={16} /> },
          { step: 3, label: '3. Cultural Guardrails', icon: <Layers size={16} /> },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            role="tab"
            aria-selected={currentStep === item.step}
            onClick={() => {
              // validate current before jumping forward
              if (item.step > currentStep && !validateStep(currentStep)) return;
              setCurrentStep(item.step as 1 | 2 | 3);
            }}
            className={`btn btn-sm ${currentStep === item.step ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
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
        {/* STEP 1: Event Type & Basics */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Event Type & Celebration Style</label>
            <div className="grid-cols-3" style={{ marginTop: '0.5rem' }}>
              <div
                className="card card-interactive"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '1.25rem 1rem',
                  borderColor: eventType === 'wedding' ? 'var(--accent-primary)' : 'var(--border-light)',
                  backgroundColor: eventType === 'wedding' ? 'var(--accent-subtle)' : 'var(--bg-card)',
                  boxShadow: eventType === 'wedding' ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                }}
                onClick={() => {
                  setEventType('wedding');
                  if (!title || title.includes('Birthday') || title.includes('Festival')) {
                    setTitle('Timeless Romantic Wedding');
                  }
                }}
              >
                <Heart size={30} color="#be185d" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Wedding</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Baraat, Pheras, Sangeet & Reception
                </div>
              </div>

              <div
                className="card card-interactive"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '1.25rem 1rem',
                  borderColor: eventType === 'birthday' ? 'var(--accent-primary)' : 'var(--border-light)',
                  backgroundColor: eventType === 'birthday' ? 'var(--accent-subtle)' : 'var(--bg-card)',
                  boxShadow: eventType === 'birthday' ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                }}
                onClick={() => {
                  setEventType('birthday');
                  if (!title || title.includes('Wedding') || title.includes('Festival')) {
                    setTitle('Milestone Birthday Party');
                  }
                }}
              >
                <Cake size={30} color="#7c3aed" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Birthday</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Bollywood themes, milestones & music
                </div>
              </div>

              <div
                className="card card-interactive"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '1.25rem 1rem',
                  borderColor: eventType === 'community' ? 'var(--accent-primary)' : 'var(--border-light)',
                  backgroundColor: eventType === 'community' ? 'var(--accent-subtle)' : 'var(--bg-card)',
                  boxShadow: eventType === 'community' ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                }}
                onClick={() => {
                  setEventType('community');
                  if (!title || title.includes('Wedding') || title.includes('Birthday')) {
                    setTitle('Community Gala & Festival');
                  }
                }}
              >
                <Users size={30} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Community</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Melas, Diwali galas & Samaj celebrations
                </div>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="evt-title" className="form-label">Event Title / Name</label>
              <input
                id="evt-title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Aarav & Ananya's Royal Rajasthan Wedding"
              />
            </div>

            <div className="form-group">
              <label htmlFor="evt-date" className="form-label">
                <span>Target Event Date *</span>
                <span className="form-hint">Used for muhurat and milestone lead times</span>
              </label>
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

          <div className="form-group">
            <label htmlFor="evt-theme" className="form-label">Atmosphere & Visual Theme</label>
            <input
              id="evt-theme"
              type="text"
              className="form-control"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Royal Marigold & Antique Gold, Jaipur Palace Heritage"
            />
          </div>
        </div>

        {/* STEP 2: Location, Scale & Budget (Contains City / Location * and live Lakh/Crore preview) */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <div className="grid-cols-3">
            <div className="form-group">
              <label htmlFor="evt-city" className="form-label">
                <span>City / Location *</span>
              </label>
              <input
                id="evt-city"
                type="text"
                className="form-control"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Jaipur, Rajasthan"
                list="indian-cities-list"
                required
              />
              <datalist id="indian-cities-list">
                <option value="Jaipur, Rajasthan" />
                <option value="Udaipur, Rajasthan" />
                <option value="New Delhi" />
                <option value="Mumbai, Maharashtra" />
                <option value="Bengaluru, Karnataka" />
                <option value="Pune, Maharashtra" />
                <option value="Hyderabad, Telangana" />
                <option value="Goa" />
                <option value="Ahmedabad, Gujarat" />
                <option value="Kolkata, West Bengal" />
                <option value="Chandigarh" />
                <option value="Lucknow, Uttar Pradesh" />
              </datalist>
            </div>

            <div className="form-group">
              <label htmlFor="evt-guests" className="form-label">
                <span>Guest Count *</span>
              </label>
              <input
                id="evt-guests"
                type="number"
                min="1"
                max="10000"
                className="form-control"
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="evt-budget" className="form-label">
                  <span>Approximate Budget (₹) *</span>
                </label>
                {/* Live Lakh / Crore Preview Badge */}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    backgroundColor: 'var(--accent-subtle)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--accent-glow)',
                  }}
                  title="Live Indian Currency Conversion"
                >
                  {formatCurrency(totalBudget)} ({formatIndianShort(totalBudget)})
                </span>
              </div>
              <input
                id="evt-budget"
                type="number"
                min="0"
                step="5000"
                className="form-control"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Math.max(0, parseInt(e.target.value) || 0))}
                required
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label htmlFor="evt-venue" className="form-label">Venue Style & Ambiance</label>
              <select
                id="evt-venue"
                className="form-control"
                value={venuePreference}
                onChange={(e) => setVenuePreference(e.target.value as VenuePreference)}
              >
                <option value="heritage_haveli">Heritage Haveli / Palace (Royal Rajasthan / Goa)</option>
                <option value="farmhouse_lawn">Farmhouse / Wedding Lawn (NCR / Punjab)</option>
                <option value="resort_lawn">Destination Resort & Lawn</option>
                <option value="banquet_hall">Grand Banquet Hall</option>
                <option value="indoor">Indoor Hall / Ballroom</option>
                <option value="outdoor">Outdoor Lawn</option>
                <option value="garden_park">Botanical Garden / Public Park</option>
                <option value="community_center">Community / Samaj Bhavan</option>
                <option value="beach">Beach / Waterfront</option>
                <option value="rooftop">Rooftop Lounge</option>
                <option value="hotel">5-Star Luxury Hotel</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="evt-food" className="form-label">Food & Catering Format</label>
              <select
                id="evt-food"
                className="form-control"
                value={foodPreference}
                onChange={(e) => setFoodPreference(e.target.value as FoodPreference)}
              >
                <option value="royal_thali">Royal Sit-Down Thali Service</option>
                <option value="live_chaat_counters">Live Chaat & Tandoor Counters</option>
                <option value="buffet">Grand Multi-Cuisine Buffet</option>
                <option value="plated">Plated Multi-Course Dinner</option>
                <option value="cocktail">Cocktail & Hors d'oeuvres</option>
                <option value="food_trucks">Food Trucks & Casual Stalls</option>
                <option value="family_style">Family Style Sharing Platters</option>
                <option value="potluck">Community Potluck / Langar</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="evt-contingency" className="form-label">
                Contingency Reserve: {contingencyRate}%
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Safety Cushion: {formatCurrency(Math.round((totalBudget * contingencyRate) / 100))}
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

        {/* STEP 3: Priorities, Traditions & Engine Option */}
        <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
          <div className="form-group">
            <label className="form-label">Top Priorities (Budget will favor selected areas)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem' }}>
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
                  <Button
                    key={item.id}
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => togglePriority(item.id)}
                    leftIcon={active ? <Check size={14} /> : undefined}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid-cols-2" style={{ marginTop: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="evt-accessibility" className="form-label">
                Dietary & Accessibility Requirements
              </label>
              <input
                id="evt-accessibility"
                type="text"
                className="form-control"
                value={accessibilityInput}
                onChange={(e) => setAccessibilityInput(e.target.value)}
                placeholder="e.g. Jain dietary counter, Pure veg, Wheelchair ramp"
              />
              <span className="form-hint">Comma separated. Injects specific vendor checks.</span>
            </div>

            <div className="form-group">
              <label htmlFor="evt-traditions" className="form-label">
                Cultural Traditions / Rituals
              </label>
              <input
                id="evt-traditions"
                type="text"
                className="form-control"
                value={culturalTraditions}
                onChange={(e) => setCulturalTraditions(e.target.value)}
                placeholder="e.g. Agni Kund Pheras, Baraat procession, Haldi"
              />
            </div>
          </div>

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

          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
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
                Planner Engine Mode
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Offline Deterministic Rule Engine is instant & reliable. GenAI uses Gemini API if available.
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span>Attempt GenAI Generation</span>
            </label>
          </div>
        </div>

        {/* Wizard Controls Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '2rem',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '1.25rem',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            {currentStep > 1 && (
              <Button
                variant="secondary"
                size="md"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft size={16} />}
              >
                Back
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {currentStep < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNextStep}
                rightIcon={<ArrowRight size={16} />}
              >
                Next Step
              </Button>
            ) : null}

            {/* Submit button is always rendered so tests and planners can submit directly */}
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isGenerating}
              isLoading={isGenerating}
              id="btn-save-event-plan"
              leftIcon={<Sparkles size={16} />}
            >
              {isGenerating
                ? 'Analyzing & Generating Plan...'
                : isEditing
                ? 'Save Changes & Recalculate'
                : 'Generate Event Plan'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
