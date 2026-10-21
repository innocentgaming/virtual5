import type { EventPlan } from '../types/event';
import { generateFallbackPlan } from '../services/fallbackPlanner';

// Calculate realistic upcoming dates
const now = new Date();
const weddingDate = new Date(now.getTime() + 120 * 86400000).toISOString().split('T')[0];
const birthdayDate = new Date(now.getTime() + 18 * 86400000).toISOString().split('T')[0];
const galaDate = new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0];

export const SAMPLE_WEDDING: EventPlan = generateFallbackPlan({
  title: "Aarav & Ananya's Royal Rajasthan Wedding",
  eventType: 'wedding',
  eventDate: weddingDate,
  city: 'Jaipur, Rajasthan',
  guestCount: 350,
  totalBudget: 3500000,
  venuePreference: 'heritage_haveli',
  foodPreference: 'royal_thali',
  theme: 'Marigold & Royal Rajputana Heritage',
  priorities: ['venue', 'catering', 'photography'],
  accessibilityNeeds: ['Wheelchair ramp to Mandap stage', 'Senior citizen buggy cart shuttle'],
  culturalTraditions: 'Vedic Pheras at Lagna Muhurat, Sangeet family dance face-off, Baraat with traditional Dhol & Brass band',
  specialNotes: 'Dedicated Pure Vegetarian and Jain counters; live Rajasthani folk musicians and floral shower entry.',
  contingencyRate: 0.12,
});

export const SAMPLE_BIRTHDAY: EventPlan = generateFallbackPlan({
  title: "Rohan's 30th Bollywood Rooftop Bash",
  eventType: 'birthday',
  eventDate: birthdayDate,
  city: 'Mumbai, Maharashtra',
  guestCount: 80,
  totalBudget: 350000,
  venuePreference: 'rooftop',
  foodPreference: 'live_chaat_counters',
  theme: 'Retro 90s Bollywood & Neon Lights',
  priorities: ['entertainment', 'guest_experience'],
  accessibilityNeeds: ['Elevator access to rooftop terrace'],
  culturalTraditions: 'Bollywood dance playlist with live Dhol jugalbandi',
  specialNotes: 'Signature Mumbai street chaat counters, custom Bollywood cutout photobooth, and craft mocktails.',
  contingencyRate: 0.10,
});

export const SAMPLE_COMMUNITY: EventPlan = generateFallbackPlan({
  title: 'Shanti Vihar Grand Diwali & Dandiya Mela',
  eventType: 'community',
  eventDate: galaDate,
  city: 'Bengaluru, Karnataka',
  guestCount: 600,
  totalBudget: 650000,
  venuePreference: 'farmhouse_lawn',
  foodPreference: 'buffet',
  theme: 'Rangoli, Diyas & Dandiya Raas',
  priorities: ['guest_experience', 'budget_savings'],
  accessibilityNeeds: ['Braille food labels', 'Dedicated elder seating arena', 'Emergency first aid booth'],
  culturalTraditions: 'Maha Aarti at dusk, traditional Garba & Dandiya circles, and eco-friendly fireworks display',
  specialNotes: 'Free community entry, artisan craft stalls, and zero-plastic eco-friendly food service.',
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
