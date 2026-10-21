import type { EventPlan } from '../types/event';
import { generateFallbackPlan } from '../services/fallbackPlanner';

// Calculate realistic upcoming dates
const now = new Date();
const weddingDate = new Date(now.getTime() + 120 * 86400000).toISOString().split('T')[0];
const birthdayDate = new Date(now.getTime() + 18 * 86400000).toISOString().split('T')[0];
const galaDate = new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0];

export const SAMPLE_WEDDING: EventPlan = generateFallbackPlan({
  title: 'Elena & Marcus Autumn Wedding',
  eventType: 'wedding',
  eventDate: weddingDate,
  city: 'San Francisco, CA',
  guestCount: 120,
  totalBudget: 32000,
  venuePreference: 'garden_park',
  foodPreference: 'plated',
  theme: 'Eucalyptus & Warm Gold',
  priorities: ['venue', 'catering', 'photography'],
  accessibilityNeeds: ['Wheelchair accessible ramps', 'Low-sensory quiet corner'],
  culturalTraditions: 'Traditional ring exchange and family unity candle ceremony',
  specialNotes: 'Prefers seasonal organic produce and natural daylight photography.',
  contingencyRate: 0.12,
});

export const SAMPLE_BIRTHDAY: EventPlan = generateFallbackPlan({
  title: "Jordan's 30th Rooftop Milestone Celebration",
  eventType: 'birthday',
  eventDate: birthdayDate,
  city: 'Austin, TX',
  guestCount: 45,
  totalBudget: 4200,
  venuePreference: 'rooftop',
  foodPreference: 'cocktail',
  theme: 'Neon Retro Synthwave',
  priorities: ['entertainment', 'guest_experience'],
  accessibilityNeeds: ['Elevator access to rooftop'],
  specialNotes: 'Emphasis on signature craft mocktails, retro photobooth, and indie DJ.',
  contingencyRate: 0.10,
});

export const SAMPLE_COMMUNITY: EventPlan = generateFallbackPlan({
  title: 'Riverside Community Arts & Harvest Festival',
  eventType: 'community',
  eventDate: galaDate,
  city: 'Denver, CO',
  guestCount: 300,
  totalBudget: 15000,
  venuePreference: 'community_center',
  foodPreference: 'food_trucks',
  theme: 'Local Harvest & Cultural Exchange',
  priorities: ['guest_experience', 'budget_savings'],
  accessibilityNeeds: ['Wheelchair parking stalls', 'Allergy-safe food truck labeling', 'ASL interpreter'],
  culturalTraditions: 'Opening land acknowledgment and multicultural youth dance troupe',
  specialNotes: 'Free admission with local artisan craft booths and waste-free compost stations.',
  contingencyRate: 0.10,
});

SAMPLE_WEDDING.id = 'evt-sample-wedding';
SAMPLE_BIRTHDAY.id = 'evt-sample-birthday';
SAMPLE_COMMUNITY.id = 'evt-sample-community';

export const INITIAL_EVENTS: EventPlan[] = [
  SAMPLE_WEDDING,
  SAMPLE_BIRTHDAY,
  SAMPLE_COMMUNITY,
];
