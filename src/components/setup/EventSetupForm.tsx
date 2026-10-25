import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  Sparkles,
  Heart,
  Cake,
  Users,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import type {
  EventType,
  VenuePreference,
  FoodPreference,
  PriorityArea,
  EventPlan,
} from '../../types/event';
import { formatCurrency, formatIndianShort } from '../../utils/formatters';
import { Card, CardHeader, Button, Badge } from '../ui';

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

const INDIAN_CITIES = [
  'Jaipur, Rajasthan',
  'Udaipur, Rajasthan',
  'Jodhpur, Rajasthan',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Bengaluru, Karnataka',
  'Delhi NCR',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Surat, Gujarat',
  'Goa',
  'Chandigarh, Punjab',
  'Lucknow, Uttar Pradesh',
  'Varanasi, Uttar Pradesh',
  'Indore, Madhya Pradesh',
  'Kochi, Kerala',
];

const ROTATING_STATUS_MESSAGES = [
  'Analyzing venue capacity & seasonal logistics...',
  'Calculating auspicious muhurat ceremony windows...',
  'Curating authentic caterers & dietary guardrails...',
  'Balancing contingency reserves and vendor budgets...',
  'Generating personalized Indian celebration plan...',
];

const CEREMONY_STRUCTURES = [
  { id: 'hindu_vedic', label: 'Vedic Hindu (Pheras, Mandap, Muhurat)', note: 'Vedic Pheras at auspicious Muhurat, Mandap havan kund, Baraat and Sangeet' },
  { id: 'sikh_anand_karaj', label: 'Sikh (Anand Karaj & Laavan)', note: 'Morning Anand Karaj at Gurdwara, 4 Laavan hymns, followed by Langar and evening reception' },
  { id: 'muslim_nikah', label: 'Muslim (Nikah & Walima)', note: 'Nikah ceremony with Ijab-e-Qubool and Mehr, followed by lavish Walima feast' },
  { id: 'christian_ceremony', label: 'Christian (Church Vows)', note: 'Church wedding vows, ring exchange, choir processional, followed by banquet dinner' },
  { id: 'jain_vivah', label: 'Jain (Hastamelap & Lagan Lekhan)', note: 'Strictly Satvik & Jain kitchen, Granthi blessings, Hastamelap, daytime pheras' },
  { id: 'bengali_biye', label: 'Bengali (Saat Paak & Shubho Drishti)', note: 'Saat Paak, Shubho Drishti, Sindoor Daan, and traditional feast' },
  { id: 'south_indian', label: 'South Indian (Muhurtham & Kalyanam)', note: 'Early morning auspicious Muhurtham, Kanyadaanam, traditional banana leaf feast' },
  { id: 'contemporary', label: 'Contemporary / Custom Fusion', note: 'Fusion celebration blending multicultural rituals with modern reception' },
];

const DRAFT_STORAGE_KEY = 'eventwise_setup_draft_v2';

export const EventSetupForm: React.FC<EventSetupFormProps> = ({
  initialPlan,
  isEditing = false,
  onSave,
  onCancel,
  isGenerating = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  // Read initial draft synchronously without effect
  const initialDraft = useMemo(() => {
    if (initialPlan || isEditing) return null;
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      return savedDraft ? JSON.parse(savedDraft) : null;
    } catch {
      return null;
    }
  }, [initialPlan, isEditing]);

  // Form Fields
  const [eventType, setEventType] = useState<EventType>(() => initialPlan?.eventType || initialDraft?.eventType || 'wedding');
  const [title, setTitle] = useState(() => initialPlan?.title || initialDraft?.title || '');
  const [eventDate, setEventDate] = useState(() =>
    initialPlan?.eventDate || initialDraft?.eventDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  );
  const [city, setCity] = useState(() => initialPlan?.city || initialDraft?.city || 'Jaipur, Rajasthan');
  const [guestCount, setGuestCount] = useState<number>(() => initialPlan?.guestCount || initialDraft?.guestCount || 250);
  const [totalBudget, setTotalBudget] = useState<number>(() => initialPlan?.totalBudget || initialDraft?.totalBudget || 1500000);
  const [contingencyRate, setContingencyRate] = useState<number>(() =>
    initialPlan?.contingencyRate !== undefined ? Math.round(initialPlan.contingencyRate * 100) : (initialDraft?.contingencyRate || 10)
  );
  const [venuePreference, setVenuePreference] = useState<VenuePreference>(() =>
    initialPlan?.venuePreference || initialDraft?.venuePreference || 'heritage_haveli'
  );
  const [foodPreference, setFoodPreference] = useState<FoodPreference>(() =>
    initialPlan?.foodPreference || initialDraft?.foodPreference || 'royal_thali'
  );
  const [theme, setTheme] = useState(() => initialPlan?.theme || initialDraft?.theme || 'Royal Marigold & Antique Gold');
  const [dietaryRequirements, setDietaryRequirements] = useState<string[]>(['Pure Veg', 'Jain']);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>(
    initialPlan?.accessibilityNeeds || ['Wheelchair step-free access']
  );
  const [specialNotes, setSpecialNotes] = useState(initialPlan?.specialNotes || '');
  const [culturalTraditions, setCulturalTraditions] = useState(initialPlan?.culturalTraditions || '');
  const [priorities] = useState<PriorityArea[]>(initialPlan?.priorities || ['venue', 'catering']);
  const [useAI, setUseAI] = useState(false);

  // Validation & Touched state (validation only on blur or submit, never first keystroke)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Rotating loading status
  const [statusIndex, setStatusIndex] = useState(0);

  const cityDatalistId = useId();

  // Autosave draft on change
  useEffect(() => {
    if (!isEditing) {
      try {
        const draft = {
          eventType,
          title,
          eventDate,
          city,
          guestCount,
          totalBudget,
          contingencyRate,
          venuePreference,
          foodPreference,
          theme,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Ignore localStorage error
      }
    }
  }, [eventType, title, eventDate, city, guestCount, totalBudget, contingencyRate, venuePreference, foodPreference, theme, isEditing]);

  // Rotating status message during generation
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % ROTATING_STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Focus step heading on step change for screen readers
  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [currentStep]);

  // Handlers
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const toggleDietary = (item: string) => {
    if (dietaryRequirements.includes(item)) {
      setDietaryRequirements(dietaryRequirements.filter((d) => d !== item));
    } else {
      setDietaryRequirements([...dietaryRequirements, item]);
    }
  };

  const toggleAccessibility = (item: string) => {
    if (accessibilityNeeds.includes(item)) {
      setAccessibilityNeeds(accessibilityNeeds.filter((a) => a !== item));
    } else {
      setAccessibilityNeeds([...accessibilityNeeds, item]);
    }
  };

  // Step Validations
  const nextStepDisabledReason = useMemo(() => {
    if (currentStep === 2) {
      if (!title.trim()) return 'Please enter an event name or celebration title';
      if (!city.trim()) return 'Please specify the city or location';
      if (!eventDate) return 'Please select an event date';
    }
    if (currentStep === 3) {
      if (guestCount <= 0) return 'Guest count must be at least 1';
      if (totalBudget <= 0) return 'Total budget must be greater than ₹0';
    }
    return null;
  }, [currentStep, title, city, eventDate, guestCount, totalBudget]);

  const canAdvance = !nextStepDisabledReason;

  const handleNext = () => {
    if (!canAdvance) {
      if (currentStep === 2) {
        setTouched((prev) => ({ ...prev, title: true, city: true, eventDate: true }));
        setGeneralError(nextStepDisabledReason || 'Please fill in required fields.');
      }
      if (currentStep === 3) {
        setTouched((prev) => ({ ...prev, guestCount: true, totalBudget: true }));
        setGeneralError(nextStepDisabledReason || 'Please enter valid guest count and budget.');
      }
      return;
    }
    setGeneralError(null);
    setCurrentStep((prev) => Math.min(prev + 1, 5) as 1 | 2 | 3 | 4 | 5);
  };

  const handleBack = () => {
    setGeneralError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && currentStep < 5) {
      e.preventDefault();
      if (canAdvance) {
        handleNext();
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate all mandatory fields
    if (!title.trim()) {
      setGeneralError('Event title is required.');
      setCurrentStep(2);
      setTouched((prev) => ({ ...prev, title: true }));
      return;
    }
    if (!city.trim()) {
      setGeneralError('City / Location is required.');
      setCurrentStep(2);
      setTouched((prev) => ({ ...prev, city: true }));
      return;
    }
    if (guestCount <= 0 || isNaN(guestCount)) {
      setGeneralError('Please enter a valid guest count.');
      setCurrentStep(3);
      setTouched((prev) => ({ ...prev, guestCount: true }));
      return;
    }
    if (totalBudget <= 0 || isNaN(totalBudget)) {
      setGeneralError('Please enter a valid total budget amount.');
      setCurrentStep(3);
      setTouched((prev) => ({ ...prev, totalBudget: true }));
      return;
    }

    setGeneralError(null);
    // Clear draft on successful submission
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }

    onSave(
      {
        title: title.trim(),
        eventType,
        eventDate,
        city: city.trim(),
        guestCount: Math.max(1, guestCount),
        totalBudget: Math.max(1000, totalBudget),
        venuePreference,
        foodPreference,
        theme,
        priorities,
        accessibilityNeeds,
        culturalTraditions: [culturalTraditions, ...dietaryRequirements].filter(Boolean).join(', '),
        specialNotes,
        contingencyRate: contingencyRate / 100,
      },
      useAI
    );
  };

  // Indian Date Constraints (Block Past Dates)
  const todayDateString = new Date().toISOString().split('T')[0];

  // Calculated per-guest amount
  const calculatedPerGuest = Math.round(totalBudget / Math.max(guestCount, 1));
  const contingencyRupees = Math.round(totalBudget * (contingencyRate / 100));

  const STEPS = [
    { num: 1, label: 'Event Type' },
    { num: 2, label: 'Basics' },
    { num: 3, label: 'Budget & Scale' },
    { num: 4, label: 'Preferences' },
    { num: 5, label: 'Review & Generate' },
  ];

  return (
    <Card className="setup-wizard-card" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <CardHeader
        headingLevel="h2"
        title={isEditing ? 'Edit Event Details' : 'Create & Personalize New Event'}
        subtitle="Step-by-step Indian event planning wizard with cultural guardrails"
        action={
          onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : undefined
        }
      />

      {/* General Form Error Alert */}
      {generalError && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{generalError}</span>
        </div>
      )}

      {/* Progress Indicator */}
      <nav aria-label="Setup progress" style={{ marginBottom: 'var(--space-6)' }}>
        <ol
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            gap: 'var(--space-2)',
            overflowX: 'auto',
          }}
        >
          {STEPS.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <li
                key={s.num}
                aria-current={isActive ? 'step' : undefined}
                style={{ flex: 1, minWidth: '110px' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    // Allow navigating back or forward if valid
                    if (s.num < currentStep || canAdvance) {
                      setGeneralError(null);
                      setCurrentStep(s.num as 1 | 2 | 3 | 4 | 5);
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `3px solid ${
                      isActive ? 'var(--accent-primary)' : isCompleted ? 'var(--color-success)' : 'var(--border)'
                    }`,
                    padding: 'var(--space-2) 0',
                    textAlign: 'left',
                    cursor: s.num <= currentStep || canAdvance ? 'pointer' : 'not-allowed',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Step {s.num}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        {/* =====================================================================
            STEP 1: EVENT TYPE (Live theme preview cards)
            ===================================================================== */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <h3
            ref={currentStep === 1 ? stepHeadingRef : undefined}
            tabIndex={-1}
            style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', outline: 'none' }}
          >
            Step 1: Choose Your Celebration
          </h3>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only">Select Event Celebration Type</legend>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
              {/* Wedding Card */}
              <button
                type="button"
                aria-pressed={eventType === 'wedding'}
                onClick={() => {
                  setEventType('wedding');
                  setTheme('Royal Marigold & Antique Gold');
                  setVenuePreference('heritage_haveli');
                  setFoodPreference('royal_thali');
                }}
                style={{
                  border: `2px solid ${eventType === 'wedding' ? '#9E2A2B' : 'var(--border)'}`,
                  background: eventType === 'wedding' ? 'rgba(158, 42, 43, 0.05)' : 'var(--surface-raised)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <Badge variant="wedding">
                    <Heart size={14} style={{ marginRight: '4px' }} /> Royal Wedding
                  </Badge>
                  {eventType === 'wedding' && <Check size={18} color="#9E2A2B" />}
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-1)' }}>
                  Traditional Vivah / Wedding
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Theme: Crimson & Antique Gold. Includes Haldi, Mehendi, Sangeet, Baraat, Pheras, and sound curfew guardrails.
                </p>
              </button>

              {/* Birthday Card */}
              <button
                type="button"
                aria-pressed={eventType === 'birthday'}
                onClick={() => {
                  setEventType('birthday');
                  setTheme('Bollywood Rooftop & Retro Neon');
                  setVenuePreference('rooftop');
                  setFoodPreference('live_chaat_counters');
                }}
                style={{
                  border: `2px solid ${eventType === 'birthday' ? '#E76F51' : 'var(--border)'}`,
                  background: eventType === 'birthday' ? 'rgba(231, 111, 81, 0.05)' : 'var(--surface-raised)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <Badge variant="birthday">
                    <Cake size={14} style={{ marginRight: '4px' }} /> Milestone Bash
                  </Badge>
                  {eventType === 'birthday' && <Check size={18} color="#E76F51" />}
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-1)' }}>
                  Milestone Birthday
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Theme: Sunset Orange & Amber. High energy, rooftop/club venues, live chaat, cocktails, DJ and cake cutting ceremony.
                </p>
              </button>

              {/* Community Card */}
              <button
                type="button"
                aria-pressed={eventType === 'community'}
                onClick={() => {
                  setEventType('community');
                  setTheme('Festive Dandiya & Diwali Utsav');
                  setVenuePreference('community_center');
                  setFoodPreference('buffet');
                }}
                style={{
                  border: `2px solid ${eventType === 'community' ? '#2A9D8F' : 'var(--border)'}`,
                  background: eventType === 'community' ? 'rgba(42, 157, 143, 0.05)' : 'var(--surface-raised)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <Badge variant="community">
                    <Users size={14} style={{ marginRight: '4px' }} /> Community Mela
                  </Badge>
                  {eventType === 'community' && <Check size={18} color="#2A9D8F" />}
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-1)' }}>
                  Community & Cultural Mela
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Theme: Marigold & Emerald. Diwali, Dandiya, Holi, or society celebrations with crowd safety, bhog, and performances.
                </p>
              </button>
            </div>
          </fieldset>
        </div>

        {/* =====================================================================
            STEP 2: BASICS (Name, City, Date, Venue)
            ===================================================================== */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <h3
            ref={currentStep === 2 ? stepHeadingRef : undefined}
            tabIndex={-1}
            style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', outline: 'none' }}
          >
            Step 2: Event Basics & Venue
          </h3>

          <div className="form-group">
            <label htmlFor="setup-title" className="form-label">
              <span>Event Name / Celebration Title *</span>
            </label>
            <input
              id="setup-title"
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="e.g. Aarav & Ananya's Royal Rajasthan Wedding"
              aria-describedby="title-error"
              required
            />
            {touched.title && !title.trim() && (
              <span id="title-error" role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                Event title cannot be empty.
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="setup-city" className="form-label">
                <span>City / Location *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="setup-city"
                  type="text"
                  className="form-control"
                  list={cityDatalistId}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => handleBlur('city')}
                  placeholder="Select or enter city in India"
                  aria-describedby="city-error"
                  required
                />
                <datalist id={cityDatalistId}>
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              {touched.city && !city.trim() && (
                <span id="city-error" role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  City / location is required.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="setup-date" className="form-label">
                <span>Event Date * (Blocks past dates)</span>
              </label>
              <input
                id="setup-date"
                type="date"
                className="form-control"
                min={todayDateString}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                onBlur={() => handleBlur('eventDate')}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="setup-venue" className="form-label">
                <span>Preferred Venue Style</span>
              </label>
              <select
                id="setup-venue"
                className="form-control"
                value={venuePreference}
                onChange={(e) => setVenuePreference(e.target.value as VenuePreference)}
              >
                <option value="heritage_haveli">Heritage Haveli / Palace</option>
                <option value="resort_lawn">Luxury Resort & Lawns</option>
                <option value="banquet_hall">AC Banquet Hall</option>
                <option value="rooftop">Open-Air Rooftop</option>
                <option value="farmhouse_lawn">Farmhouse Lawns</option>
                <option value="community_center">Community / Society Hall</option>
                <option value="beach">Beachfront Resort</option>
                <option value="hotel">5-Star Hotel Ballroom</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="setup-theme" className="form-label">
                <span>Aesthetic & Decor Theme</span>
              </label>
              <input
                id="setup-theme"
                type="text"
                className="form-control"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Traditional Marigold & Antique Gold"
              />
            </div>
          </div>
        </div>

        {/* =====================================================================
            STEP 3: BUDGET & GUESTS (Live Lakh/Crore preview, contingency)
            ===================================================================== */}
        <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
          <h3
            ref={currentStep === 3 ? stepHeadingRef : undefined}
            tabIndex={-1}
            style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', outline: 'none' }}
          >
            Step 3: Budget, Scale & Contingency
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
            {/* Total Budget Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="setup-budget" className="form-label">
                  <span>Total Budget (₹) *</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {formatIndianShort(totalBudget)}
                </span>
              </div>
              <input
                id="setup-budget"
                type="number"
                min="1000"
                step="50000"
                className="form-control tabular-nums"
                value={isNaN(totalBudget) ? '' : totalBudget}
                onChange={(e) => setTotalBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                onBlur={() => handleBlur('totalBudget')}
                placeholder="e.g. 1500000"
                required
              />
              <div className="form-hint">
                Live Preview: <strong className="tabular-nums">{formatCurrency(totalBudget)} ({formatIndianShort(totalBudget)})</strong>
              </div>
              {touched.totalBudget && totalBudget <= 0 && (
                <span role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Total budget must be greater than ₹0.
                </span>
              )}
            </div>

            {/* Guest Count Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="setup-guests" className="form-label">
                  <span>Invited Guest Count *</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {calculatedPerGuest ? `₹${calculatedPerGuest.toLocaleString('en-IN')} / guest` : ''}
                </span>
              </div>
              <input
                id="setup-guests"
                type="number"
                min="1"
                step="10"
                className="form-control tabular-nums"
                value={isNaN(guestCount) ? '' : guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                onBlur={() => handleBlur('guestCount')}
                placeholder="e.g. 250"
                required
              />
              <div className="form-hint">
                Estimated Per-Guest Allocation: <strong className="tabular-nums">{formatCurrency(calculatedPerGuest)}</strong>
              </div>
              {touched.guestCount && guestCount <= 0 && (
                <span role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Guest count must be at least 1.
                </span>
              )}
            </div>
          </div>

          {/* Contingency Slider */}
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label htmlFor="setup-contingency" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
                Contingency Reserve Buffer ({contingencyRate}%)
              </label>
              <span className="tabular-nums" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
                {formatIndianShort(contingencyRupees)} ({formatCurrency(contingencyRupees)})
              </span>
            </div>
            <input
              id="setup-contingency"
              type="range"
              min="0"
              max="25"
              step="1"
              value={contingencyRate}
              onChange={(e) => setContingencyRate(parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              Standard Indian event safeguard: 10%–15% buffer for last-minute guest additions, overtime DJ curfews, and logistics.
            </div>
          </div>
        </div>

        {/* =====================================================================
            STEP 4: PREFERENCES & DIETARY (Dietary chips, accessibility, notes)
            ===================================================================== */}
        <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
          <h3
            ref={currentStep === 4 ? stepHeadingRef : undefined}
            tabIndex={-1}
            style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', outline: 'none' }}
          >
            Step 4: Cultural, Dietary & Accessibility Guardrails
          </h3>

          {/* Dietary Requirements Chips */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-5) 0' }}>
            <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
              Dietary Counters & Kitchen Separation
            </legend>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {['Pure Veg', 'Jain', 'Halal', 'Gluten-free', 'Vegan', 'Nut-Free'].map((diet) => {
                const isSelected = dietaryRequirements.includes(diet);
                return (
                  <button
                    key={diet}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleDietary(diet)}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-subtle)' : 'var(--surface-raised)',
                      color: isSelected ? 'var(--accent-text)' : 'var(--text)',
                      transition: 'all var(--transition-fast)',
                      minHeight: '44px',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {diet === 'Jain' ? '🥗 Jain' : diet === 'Pure Veg' ? '🌱 Pure Veg' : diet}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Accessibility Needs Chips */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-5) 0' }}>
            <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
              Accessibility & Elder Care Needs
            </legend>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {[
                'Wheelchair step-free access',
                'Elder priority seating near Mandap',
                'Golf cart / battery buggy transit',
                'Quiet lounge for infants / seniors',
                'Elevator near dining hall',
              ].map((need) => {
                const isSelected = accessibilityNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleAccessibility(need)}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'var(--color-success-border)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--color-success-bg)' : 'var(--surface-raised)',
                      color: isSelected ? 'var(--color-success-text)' : 'var(--text)',
                      transition: 'all var(--transition-fast)',
                      minHeight: '40px',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {need}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Ceremony Tradition Selection */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="setup-ceremony-tradition" className="form-label" style={{ marginBottom: 'var(--space-2)' }}>
              <span>Ceremony Tradition & Cultural Structure</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 400, display: 'block', marginTop: '2px' }}>
                Select a ceremony structure to tailor rituals, muhurat timings, and vendor questions (or customize below):
              </span>
            </label>
            <select
              id="setup-ceremony-tradition"
              className="form-control"
              value={culturalTraditions}
              onChange={(e) => {
                const selectedVal = e.target.value;
                setCulturalTraditions(selectedVal);
                const matched = CEREMONY_STRUCTURES.find((c) => c.label === selectedVal);
                if (matched && !specialNotes.includes(matched.note)) {
                  setSpecialNotes((prev) => (prev ? `${prev}\n${matched.note}` : matched.note));
                }
              }}
              style={{ minHeight: '44px' }}
            >
              <option value="">-- Choose Ceremony Structure (or leave custom) --</option>
              {CEREMONY_STRUCTURES.map((t) => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Special Notes & Custom Traditions */}
          <div className="form-group">
            <label htmlFor="setup-notes" className="form-label">
              <span>Special Cultural Traditions or Ceremony Notes</span>
            </label>
            <textarea
              id="setup-notes"
              className="form-control"
              rows={3}
              value={specialNotes}
              onChange={(e) => {
                setSpecialNotes(e.target.value);
                setCulturalTraditions(e.target.value);
              }}
              placeholder="e.g. Baraat arrival at 4 PM, sound curfew strictly at 10 PM, Pandit Ji requires havan kund setup outdoors."
            />
          </div>
        </div>

        {/* =====================================================================
            STEP 5: REVIEW & GENERATE (Edit links per section)
            ===================================================================== */}
        <div style={{ display: currentStep === 5 ? 'block' : 'none' }}>
          <h3
            ref={currentStep === 5 ? stepHeadingRef : undefined}
            tabIndex={-1}
            style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', outline: 'none' }}
          >
            Step 5: Review & Confirm Plan
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {/* Section 1: Event Type */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>1. Celebration Type</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} leadingIcon={<Edit2 size={12} />}>
                  Edit
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                <strong>{eventType.toUpperCase()}</strong> • Theme: {theme}
              </div>
            </div>

            {/* Section 2: Basics */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>2. Basics & Venue</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} leadingIcon={<Edit2 size={12} />}>
                  Edit
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                <strong>{title}</strong> in <strong>{city}</strong> on <strong>{eventDate}</strong> • Venue: {venuePreference}
              </div>
            </div>

            {/* Section 3: Budget & Guests */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>3. Budget & Scale</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} leadingIcon={<Edit2 size={12} />}>
                  Edit
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Budget: <strong className="tabular-nums">{formatCurrency(totalBudget)} ({formatIndianShort(totalBudget)})</strong> • Guests: <strong>{guestCount}</strong> ({formatCurrency(calculatedPerGuest)}/guest) • Contingency: <strong>{contingencyRate}%</strong> ({formatIndianShort(contingencyRupees)})
              </div>
            </div>

            {/* Section 4: Preferences */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>4. Guardrails & Dietary</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)} leadingIcon={<Edit2 size={12} />}>
                  Edit
                </Button>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Dietary: <strong>{dietaryRequirements.join(', ') || 'Standard'}</strong> • Accessibility: {accessibilityNeeds.join(', ') || 'None specified'}
              </div>
            </div>
          </div>

          {/* AI vs Deterministic toggle notice */}
          <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-info-text)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                <ShieldCheck size={16} />
                <span>Offline Deterministic Rule Engine is active as fallback.</span>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-info-text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                />
                Generate with Gemini AI
              </label>
            </div>
          </div>
        </div>

        {/* Wizard Navigation Action Bar (Sticky on Mobile) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border)',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleBack}
              leadingIcon={<ArrowLeft size={16} />}
              disabled={isGenerating}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            {currentStep < 5 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                rightIcon={<ArrowRight size={16} />}
                disabled={!canAdvance}
                title={nextStepDisabledReason || 'Proceed to next step'}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => handleSubmit()}
                isLoading={isGenerating}
                leadingIcon={<Sparkles size={18} />}
              >
                {isEditing ? 'Save Plan Changes' : 'Generate Event Plan'}
              </Button>
            )}
          </div>
        </div>

        {/* Loading status rotating indicator */}
        {isGenerating && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', color: 'var(--accent-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {ROTATING_STATUS_MESSAGES[statusIndex]}
          </div>
        )}
      </form>
    </Card>
  );
};
