import type {
  EventPlan,
  EventType,
  BudgetItem,
  TaskItem,
  VendorItem,
  PersonalizedIdea,
  VenuePreference,
  FoodPreference,
  PriorityArea,
} from '../types/event';
import { evaluateDecisionRules } from './decisionEngine';

interface PlanGenerationInput {
  title?: string;
  eventType: EventType;
  eventDate: string; // YYYY-MM-DD
  city: string;
  guestCount: number;
  totalBudget: number;
  venuePreference?: VenuePreference;
  foodPreference?: FoodPreference;
  theme?: string;
  priorities?: PriorityArea[];
  accessibilityNeeds?: string[];
  culturalTraditions?: string;
  specialNotes?: string;
  contingencyRate?: number;
}

function calculateTaskDate(eventDateStr: string, daysBeforeEvent: number): string {
  const eventDate = new Date(eventDateStr);
  const taskDate = new Date(eventDate);
  taskDate.setDate(eventDate.getDate() - daysBeforeEvent);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (taskDate.getTime() < today.getTime()) {
    taskDate.setTime(today.getTime());
  }

  const yyyy = taskDate.getFullYear();
  const mm = String(taskDate.getMonth() + 1).padStart(2, '0');
  const dd = String(taskDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateFallbackPlan(input: PlanGenerationInput): EventPlan {
  const guestCount = Math.max(1, input.guestCount || 50);
  const totalBudget = Math.max(0, input.totalBudget || 5000);
  const contingencyRate = input.contingencyRate ?? 0.10;
  const availableBudget = totalBudget * (1 - contingencyRate);
  const city = input.city?.trim() || 'Local Area';
  const eventDate = input.eventDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  const priorities = input.priorities || ['venue', 'catering'];
  const accessibility = input.accessibilityNeeds || [];
  const theme = input.theme || (input.eventType === 'wedding' ? 'Timeless Romantic' : input.eventType === 'birthday' ? 'Festive Celebration' : 'Community Spirit');
  const venuePref = input.venuePreference || (input.eventType === 'wedding' ? 'banquet_hall' : input.eventType === 'birthday' ? 'indoor' : 'community_center');
  const foodPref = input.foodPreference || 'buffet';

  const daysUntilEvent = Math.max(1, Math.ceil((new Date(eventDate).getTime() - new Date().getTime()) / 86400000));

  let venueWeight = 0.30;
  let foodWeight = 0.35;
  let photoWeight = 0.12;
  let decorWeight = 0.10;
  let entertainmentWeight = 0.08;
  let logisticsWeight = 0.05;

  if (priorities.includes('catering')) {
    foodWeight += 0.07;
    venueWeight -= 0.04;
    decorWeight -= 0.03;
  }
  if (priorities.includes('photography')) {
    photoWeight += 0.06;
    decorWeight -= 0.03;
    entertainmentWeight -= 0.03;
  }
  if (priorities.includes('entertainment')) {
    entertainmentWeight += 0.06;
    decorWeight -= 0.03;
    logisticsWeight -= 0.03;
  }

  const budgetItems: BudgetItem[] = [];

  if (input.eventType === 'wedding') {
    budgetItems.push(
      {
        id: 'b-venue',
        name: `Ceremony & Reception Venue Rental (${venuePref.replace('_', ' ')})`,
        category: 'venue',
        estimatedCost: Math.round(availableBudget * venueWeight),
        priority: 'essential',
        notes: `Selected based on priority and ${guestCount} guest capacity requirements.`,
      },
      {
        id: 'b-catering',
        name: `Catering & Bar Service (${foodPref} style for ${guestCount} guests)`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * foodWeight),
        isPerGuest: true,
        priority: 'essential',
        notes: `Estimated at ~$${Math.round((availableBudget * foodWeight) / guestCount)}/person including appetizers, main course, and beverages.`,
      },
      {
        id: 'b-photo',
        name: 'Professional Photography & Highlight Video',
        category: 'photography',
        estimatedCost: Math.round(availableBudget * photoWeight),
        priority: priorities.includes('photography') ? 'essential' : 'recommended',
        notes: 'Covers pre-ceremony, vows, reception highlights, and edited digital gallery.',
      },
      {
        id: 'b-decor',
        name: `Floral Arrangements & Ambient Decor (${theme} Theme)`,
        category: 'decor',
        estimatedCost: Math.round(availableBudget * decorWeight),
        priority: 'recommended',
        notes: 'Centerpieces, ceremony arch floral accents, and atmospheric lighting.',
      },
      {
        id: 'b-dj',
        name: 'DJ, Audio Equipment & Master of Ceremonies',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * entertainmentWeight),
        priority: 'recommended',
        notes: 'Ceremony microphone audio and 4-hour reception dance floor set.',
      },
      {
        id: 'b-logistics',
        name: 'Stationery, Signage, Favors & Guest Transportation',
        category: 'logistics',
        estimatedCost: Math.round(availableBudget * logisticsWeight),
        priority: 'optional',
        notes: 'Printed seating charts, welcome signs, table numbers, and parking coordination.',
      }
    );
  } else if (input.eventType === 'birthday') {
    budgetItems.push(
      {
        id: 'b-venue',
        name: `Party Venue Reservation (${venuePref.replace('_', ' ')})`,
        category: 'venue',
        estimatedCost: Math.round(availableBudget * 0.28),
        priority: 'essential',
        notes: `Private space booked for ${guestCount} party guests in ${city}.`,
      },
      {
        id: 'b-catering',
        name: `Food, Cake & Drinks (${foodPref} for ${guestCount} guests)`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * 0.38),
        isPerGuest: true,
        priority: 'essential',
        notes: 'Custom birthday cake, savory bites, and non-alcoholic/cocktail drinks.',
      },
      {
        id: 'b-decor',
        name: `Theme Balloons, Backdrop & Tableware (${theme})`,
        category: 'decor',
        estimatedCost: Math.round(availableBudget * 0.14),
        priority: 'recommended',
        notes: 'Photo backdrop wall, balloon arch garland, customized banners.',
      },
      {
        id: 'b-entertainment',
        name: 'Interactive Entertainment / DJ / Game Master',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * 0.12),
        priority: 'recommended',
        notes: 'Curated playlists, sound system, and hosted group games/trivia.',
      },
      {
        id: 'b-photo',
        name: 'Event Photographer / Party Photobooth',
        category: 'photography',
        estimatedCost: Math.round(availableBudget * 0.08),
        priority: 'optional',
        notes: '2-hour photographer or digital self-service photo kiosk.',
      }
    );
  } else {
    budgetItems.push(
      {
        id: 'b-venue',
        name: `Community Facility / Park Permit (${venuePref.replace('_', ' ')})`,
        category: 'venue',
        estimatedCost: Math.round(availableBudget * 0.25),
        priority: 'essential',
        notes: `Permit and space rental compliant with local municipal codes in ${city}.`,
      },
      {
        id: 'b-catering',
        name: `Community Refreshments & Meal Stations (${foodPref})`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * 0.35),
        isPerGuest: true,
        priority: 'essential',
        notes: `Hydration stations, snacks, or meal boxes for ${guestCount} attendees.`,
      },
      {
        id: 'b-logistics',
        name: 'Tables, Folding Chairs, Tents & Sound PA System',
        category: 'logistics',
        estimatedCost: Math.round(availableBudget * 0.20),
        priority: 'essential',
        notes: 'A/V microphone system, staging, directional signage, and waste bins.',
      },
      {
        id: 'b-entertainment',
        name: 'Community Activities, Workshops & Live Performances',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * 0.12),
        priority: 'recommended',
        notes: 'Local performers, youth games, guest speaker honorarium, or activity supplies.',
      },
      {
        id: 'b-invitations',
        name: 'Flyers, Posters, Social Promotion & Badges',
        category: 'invitations',
        estimatedCost: Math.round(availableBudget * 0.08),
        priority: 'optional',
        notes: 'Bilingual flyers, community outreach notices, name badges.',
      }
    );
  }

  const isShortNotice = daysUntilEvent <= 21;
  const tasks: TaskItem[] = [];

  if (isShortNotice) {
    tasks.push(
      {
        id: 't-short-1',
        title: 'Lock In Venue Contract & Verify Capacity for ' + guestCount + ' Guests',
        category: 'venue',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 1, 14)),
        completed: false,
        priority: 'urgent',
        notes: 'High priority due to limited runway. Confirm load-in times and parking.',
      },
      {
        id: 't-short-2',
        title: 'Finalize Food Menu & Headcount with Caterer',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 2, 10)),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-short-1'],
        notes: 'Specify dietary preferences (gluten-free, vegetarian, halal).',
      },
      {
        id: 't-short-3',
        title: 'Send Digital Invitations / Urgent RSVP Deadline',
        category: 'guests',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 3, 9)),
        completed: false,
        priority: 'urgent',
        notes: 'Use digital cards or SMS invites for immediate RSVPs.',
      },
      {
        id: 't-short-4',
        title: 'Confirm Sound & A/V Equipment or Playlist',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 4, 5)),
        completed: false,
        priority: 'high',
        notes: 'Test bluetooth audio or confirm DJ setup time.',
      },
      {
        id: 't-short-5',
        title: 'Final 48-Hour Run-of-Show and Vendor Checklist Confirmation',
        category: 'final',
        dueDate: calculateTaskDate(eventDate, 2),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-short-2', 't-short-4'],
        notes: 'Distribute timeline to key participants and emergency contact list.',
      }
    );
  } else {
    tasks.push(
      {
        id: 't-norm-1',
        title: `Tour and Reserve Venue (${venuePref.replace('_', ' ')}) in ${city}`,
        category: 'venue',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.75)),
        completed: true,
        priority: 'high',
        notes: 'Check noise curfew, liquor license, and accessibility ramp.',
      },
      {
        id: 't-norm-2',
        title: 'Interview & Book Lead Caterer or Food Service',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.60)),
        completed: false,
        priority: 'high',
        dependencies: ['t-norm-1'],
        notes: 'Schedule tasting session and review staff-to-guest ratios.',
      },
      {
        id: 't-norm-3',
        title: `Send Invitations and Set RSVP Deadline for ${guestCount} Guests`,
        category: 'guests',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.45)),
        completed: false,
        priority: 'medium',
        dependencies: ['t-norm-1'],
        notes: 'Include dress code, map directions, and accessibility point of contact.',
      },
      {
        id: 't-norm-4',
        title: `Design Theme Styling & Order Florals/Decor (${theme})`,
        category: 'decor',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.30)),
        completed: false,
        priority: 'medium',
        notes: 'Review mockup color samples and table layout with venue.',
      },
      {
        id: 't-norm-5',
        title: 'Hire Photographer & Entertainment (DJ / Musicians)',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.25)),
        completed: false,
        priority: 'high',
        notes: 'Provide must-have photo shot list and "do not play" music list.',
      },
      {
        id: 't-norm-6',
        title: 'Lock In Final Headcount & Dietary Breakdown with Caterer',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, 10),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-norm-3', 't-norm-2'],
        notes: 'Final deadline for food ingredient purchasing and seating diagram.',
      },
      {
        id: 't-norm-7',
        title: 'Final Vendor Confirmations & Pack Day-of Emergency Kit',
        category: 'final',
        dueDate: calculateTaskDate(eventDate, 2),
        completed: false,
        priority: 'urgent',
        notes: 'Confirm arrival windows, tip envelopes, and backup weather plan.',
      }
    );
  }

  const vendors: VendorItem[] = [
    {
      id: 'v-venue',
      category: 'venue',
      role: `Venue Coordinator (${venuePref.replace('_', ' ')})`,
      status: 'contacted',
      estimatedCost: Math.round(availableBudget * venueWeight),
      questionsToAsk: [
        'What is your maximum seated capacity with dance floor?',
        'What are the exact load-in and teardown hours allowed?',
        'Do you provide tables, chairs, and security personnel or must we rent them?',
        'Are there any restrictions on open flames, sparklers, or amplified sound?',
        'Is the facility fully step-free and wheelchair accessible?',
      ],
      notes: `Target venue located in ${city}. Review contract cancellation policies.`,
    },
    {
      id: 'v-caterer',
      category: 'caterer',
      role: `Catering Partner (${foodPref} service)`,
      status: 'shortlisted',
      estimatedCost: Math.round(availableBudget * foodWeight),
      questionsToAsk: [
        'Is the per-person quote inclusive of servers, bus staff, and tableware rentals?',
        'How do you manage severe allergies, vegan, halal, and gluten-free dietary requirements?',
        'What is the cutoff date for final guest count adjustments?',
        'Do you handle bar service, liquor licensing, and ice supply?',
      ],
      notes: `Targeting ~$${Math.round((availableBudget * foodWeight) / guestCount)}/person for ${guestCount} guests.`,
    },
    {
      id: 'v-photo',
      category: 'photographer',
      role: 'Lead Photographer & Videographer',
      status: 'not_started',
      estimatedCost: Math.round(availableBudget * photoWeight),
      questionsToAsk: [
        'How many hours of coverage are included in the package?',
        'What is your expected turnaround time for the digital gallery preview and full delivery?',
        'Do you bring backup cameras and dual-slot memory cards?',
        'Will you have a secondary shooter for large guest moments?',
      ],
      notes: 'Request full recent gallery link, not just curated highlights.',
    },
    {
      id: 'v-entertainment',
      category: 'entertainment',
      role: 'DJ / MC / Live Entertainment',
      status: 'not_started',
      estimatedCost: Math.round(availableBudget * entertainmentWeight),
      questionsToAsk: [
        'Do you provide wireless microphones for speeches and toasts?',
        'Can you provide dance floor lighting or atmospheric uplighting?',
        'How do you accommodate guest song requests and custom playlist vetoes?',
      ],
      notes: 'Verify electrical outlet and breaker requirements with venue.',
    },
  ];

  const ideas: PersonalizedIdea[] = [
    {
      id: 'idea-theme-1',
      category: 'theme',
      title: `${theme} Visual Concept`,
      description: `A tailored aesthetic featuring a curated color palette of warm neutrals, botanical greenery, and subtle metallic accents suited for ${input.eventType}.`,
      tier: 'balanced',
      costImpact: 'Moderate — utilizes reusable elements and seasonal florals',
      reasoning: `Matches your chosen '${theme}' style while complementing ${venuePref.replace('_', ' ')} acoustics and lighting.`,
    },
    {
      id: 'idea-decor-saver',
      category: 'decor',
      title: 'Floating Candle & Greenery Runner Centerpieces',
      description: 'Cylinder glass hurricane vases filled with water, floating LED candles, and fresh eucalyptus runners along tables.',
      tier: 'budget',
      costImpact: 'Low Cost — saves up to 55% compared to tall fresh floral centerpieces',
      reasoning: 'Creates an upscale, ambient glow across dining tables without high florist labor fees.',
    },
    {
      id: 'idea-decor-luxe',
      category: 'decor',
      title: 'Architectural Floral Arbor & Suspended Fairy Light Canopy',
      description: 'A custom focal installation framing the main stage or head table, complemented by cascading warm micro-string lighting.',
      tier: 'premium',
      costImpact: 'High Cost — requires specialized rigging and professional florist installation',
      reasoning: 'Provides breathtaking photo backdrop moments for guests prioritizing visual impact.',
    },
    {
      id: 'idea-food-concept',
      category: 'food',
      title: `Interactive ${foodPref === 'buffet' ? 'Signature Grazing & Carving Stations' : 'Craft Tasting Experience'}`,
      description: 'Chef-attended live action stations featuring local regional specialties and customizable toppings for each attendee.',
      tier: 'balanced',
      costImpact: 'Balanced — provides elevated guest engagement without full white-glove plated costs',
      reasoning: `Accommodates diverse dietary needs for ${guestCount} guests seamlessly with faster service speed.`,
    },
    {
      id: 'idea-activity',
      category: 'activity',
      title: 'Audio Guestbook & Interactive Polaroid Keepsake Wall',
      description: 'A vintage telephone recording station where guests leave voice messages, paired with an instant camera memory book.',
      tier: 'balanced',
      costImpact: 'Low-to-Moderate ($150-$280 equipment rental)',
      reasoning: 'Generates heartfelt, permanent memories that you can replay for years to come.',
    },
  ];

  const partialPlan = {
    totalBudget,
    budgetItems,
    contingencyRate,
    eventDate,
    guestCount,
    venuePreference: venuePref,
    foodPreference: foodPref,
    accessibilityNeeds: accessibility,
    priorities,
    city,
    tasks,
  };

  const { insights, missingPrompts } = evaluateDecisionRules(partialPlan);

  const title = input.title?.trim() || `${theme} ${input.eventType.charAt(0).toUpperCase() + input.eventType.slice(1)}`;

  const explanation =
    `Plan tailored for ${guestCount} guests in ${city} with a $${totalBudget.toLocaleString()} budget. ` +
    `Allocations prioritize ${priorities.join(' & ')}, reserving a $${Math.round(totalBudget * contingencyRate).toLocaleString()} (${Math.round(contingencyRate * 100)}%) contingency reserve. ` +
    `Timeline is calibrated across ${daysUntilEvent} days remaining until ${eventDate}.`;

  return {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title,
    eventType: input.eventType,
    eventDate,
    city,
    guestCount,
    totalBudget,
    currency: '$',
    contingencyRate,
    venuePreference: venuePref,
    foodPreference: foodPref,
    theme,
    priorities,
    accessibilityNeeds: accessibility,
    culturalTraditions: input.culturalTraditions || '',
    specialNotes: input.specialNotes || '',
    plannerSource: 'fallback_rule_engine',
    lastGeneratedAt: new Date().toISOString(),
    budgetItems,
    tasks,
    vendors,
    ideas,
    decisionInsights: insights,
    missingInfoPrompts: missingPrompts,
    generationExplanation: explanation,
  };
}
