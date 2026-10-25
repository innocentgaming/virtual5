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
  GuestItem,
  ScheduleItem,
} from '../types/event';
import { evaluateDecisionRules } from './decisionEngine';
import { formatCurrency } from '../utils/formatters';

interface PlanGenerationInput {
  title?: string;
  eventType: EventType;
  eventDate: string; // YYYY-MM-DD
  city: string;
  venueName?: string;
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
  const guestCount = Math.max(1, input.guestCount || (input.eventType === 'wedding' ? 250 : input.eventType === 'birthday' ? 60 : 300));
  const totalBudget = Math.max(0, input.totalBudget || (input.eventType === 'wedding' ? 1500000 : input.eventType === 'birthday' ? 250000 : 500000));
  const contingencyRate = input.contingencyRate ?? 0.10;
  const availableBudget = totalBudget * (1 - contingencyRate);
  const city = input.city?.trim() || 'New Delhi';
  const eventDate = input.eventDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  const priorities = input.priorities || ['venue', 'catering'];
  const accessibility = input.accessibilityNeeds || [];
  const theme = input.theme || (input.eventType === 'wedding' ? 'Marigold & Royal Rajputana Heritage' : input.eventType === 'birthday' ? 'Retro Bollywood & Neon Glamour' : 'Rangoli, Diyas & Dandiya Utsav');
  const venuePref = input.venuePreference || (input.eventType === 'wedding' ? 'heritage_haveli' : input.eventType === 'birthday' ? 'rooftop' : 'farmhouse_lawn');
  const foodPref = input.foodPreference || (input.eventType === 'wedding' ? 'royal_thali' : input.eventType === 'birthday' ? 'live_chaat_counters' : 'buffet');

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
        name: input.venueName
          ? `${input.venueName} — Venue Booking (${venuePref.replace('_', ' ')})`
          : `Heritage Venue / Royal Banquet Booking (${venuePref.replace('_', ' ')})`,
        category: 'venue',
        estimatedCost: Math.round(availableBudget * venueWeight),
        priority: 'essential',
        notes: `Selected based on priority and ${guestCount} guest capacity requirements in ${city}.`,
      },
      {
        id: 'b-catering',
        name: `Royal Shahi Dawat & Live Chaat Counters (${foodPref.replace('_', ' ')} for ${guestCount} guests)`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * foodWeight),
        isPerGuest: true,
        priority: 'essential',
        notes: `Estimated at ~₹${Math.round((availableBudget * foodWeight) / guestCount).toLocaleString('en-IN')}/person including welcome drinks, chaat counters, main spread, and mithai.`,
      },
      {
        id: 'b-photo',
        name: 'Cinematic Photography, Drone Coverage & Sangeet Reels',
        category: 'photography',
        estimatedCost: Math.round(availableBudget * photoWeight),
        priority: priorities.includes('photography') ? 'essential' : 'recommended',
        notes: 'Covers pre-wedding shoot, Haldi, Mehendi, Sangeet, Vedic Pheras, and edited 4K highlight film.',
      },
      {
        id: 'b-decor',
        name: `Mandap Decor, Marigold Florals & Royal Ambience (${theme})`,
        category: 'decor',
        estimatedCost: Math.round(availableBudget * decorWeight),
        priority: 'recommended',
        notes: 'Sacred Mandap floral canopy, floral aisle runner, fairy light tunnel, and photo backdrops.',
      },
      {
        id: 'b-dj',
        name: 'DJ, Sangeet Sound/Light Rig & Dhol Players for Baraat',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * entertainmentWeight),
        priority: 'recommended',
        notes: 'High-energy Baraat live dhol squad and indoor Sangeet DJ setup with intelligent stage lighting.',
      },
      {
        id: 'b-logistics',
        name: 'Pandit Ji Dakshina, Safa Tying, Mithai Boxes & Guest Shuttles',
        category: 'logistics',
        estimatedCost: Math.round(availableBudget * logisticsWeight),
        priority: 'essential',
        notes: 'Includes traditional designer Mithai favor boxes, Safa tying master for groom procession, and guest transport.',
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
        notes: `Reserved space booked for ${guestCount} party guests in ${city}.`,
      },
      {
        id: 'b-catering',
        name: `Live Street Chaat, Tandoori Starters & Custom Cake (${guestCount} guests)`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * 0.38),
        isPerGuest: true,
        priority: 'essential',
        notes: `Custom designer milestone cake, live pav bhaji / chaat counters, mocktails, and tandoori bites.`,
      },
      {
        id: 'b-decor',
        name: `Bollywood / Theme Backdrop, Neon Lighting & Balloon Arch (${theme})`,
        category: 'decor',
        estimatedCost: Math.round(availableBudget * 0.14),
        priority: 'recommended',
        notes: 'Personalized neon name sign, retro photo backdrop, and ambient fairy lighting.',
      },
      {
        id: 'b-entertainment',
        name: 'Bollywood DJ, Emcee / Host & Interactive Games',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * 0.12),
        priority: 'recommended',
        notes: 'Curated Bollywood dance playlist, wireless microphones, and hosted family trivia.',
      },
      {
        id: 'b-photo',
        name: 'Party Photographer / Instant Polaroid Photobooth',
        category: 'photography',
        estimatedCost: Math.round(availableBudget * 0.08),
        priority: 'optional',
        notes: 'Candid event photographer and instant print keepsake photobooth with Bollywood cutouts.',
      }
    );
  } else {
    budgetItems.push(
      {
        id: 'b-venue',
        name: `Community Ground / Pandal Permit Booking (${venuePref.replace('_', ' ')})`,
        category: 'venue',
        estimatedCost: Math.round(availableBudget * 0.25),
        priority: 'essential',
        notes: `Ground permit, municipal clearance, and fire safety clearance in ${city}.`,
      },
      {
        id: 'b-catering',
        name: `Community Mahaprasad & Live Food Counters (${foodPref})`,
        category: 'catering',
        estimatedCost: Math.round(availableBudget * 0.35),
        isPerGuest: true,
        priority: 'essential',
        notes: `Sattvic feast, hydration counters, tea/chai stalls, and prasad boxes for ${guestCount} attendees.`,
      },
      {
        id: 'b-logistics',
        name: 'Shamiana / Waterproof Pandal, Seating, PA Audio & Power Backup',
        category: 'logistics',
        estimatedCost: Math.round(availableBudget * 0.20),
        priority: 'essential',
        notes: 'High-power diesel generator backup, crowd control barricades, directional banners, and sound PA.',
      },
      {
        id: 'b-entertainment',
        name: 'Garba / Folk Dancers, Live Orchestra & Stage Performances',
        category: 'entertainment',
        estimatedCost: Math.round(availableBudget * 0.12),
        priority: 'recommended',
        notes: 'Folk musicians, Dandiya sound track, community youth performances, and Aarti ceremony audio.',
      },
      {
        id: 'b-invitations',
        name: 'Publicity Banners, Municipal NOCs, Digital Posters & Volunteer Badges',
        category: 'invitations',
        estimatedCost: Math.round(availableBudget * 0.08),
        priority: 'optional',
        notes: 'WhatsApp broadcast invites, flex banners, local notices, and volunteer ID passes.',
      }
    );
  }

  const isShortNotice = daysUntilEvent <= 21;
  const tasks: TaskItem[] = [];

  if (isShortNotice) {
    tasks.push(
      {
        id: 't-short-1',
        title: `Lock In Venue Contract & Verify Capacity for ${guestCount} Guests`,
        category: 'venue',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 1, 14)),
        completed: false,
        priority: 'urgent',
        notes: 'High priority due to limited runway. Confirm generator backup and parking spaces.',
      },
      {
        id: 't-short-2',
        title: 'Finalize Catering Menu & Confirm Dedicated Pure Veg / Jain Counters',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 2, 10)),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-short-1'],
        notes: 'Verify separate kitchen preparation for Jain and Sattvic dietary requirements.',
      },
      {
        id: 't-short-3',
        title: 'Send Digital WhatsApp / E-invitations with RSVP Deadline',
        category: 'guests',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 3, 9)),
        completed: false,
        priority: 'urgent',
        notes: 'Use digital invites and follow up via WhatsApp for prompt headcounts.',
      },
      {
        id: 't-short-4',
        title: 'Confirm Pandit Ji / Priest & Sound System (Check 10 PM Curfew)',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.min(daysUntilEvent - 4, 5)),
        completed: false,
        priority: 'high',
        notes: 'Check outdoor sound permit and arrange samagri list for rituals.',
      },
      {
        id: 't-short-5',
        title: 'Final 48-Hour Run-of-Show and Vendor Checklist Confirmation',
        category: 'final',
        dueDate: calculateTaskDate(eventDate, 2),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-short-2', 't-short-4'],
        notes: 'Distribute timeline to family coordinators, bridal party, and vendor leads.',
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
        notes: 'Verify power generator backup, noise curfew guidelines, and Mandap space.',
      },
      {
        id: 't-norm-2',
        title: 'Book Pandit Ji / Priest and Freeze Auspicious Lagna Muhurat',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.70)),
        completed: false,
        priority: 'high',
        dependencies: ['t-norm-1'],
        notes: 'Confirm Havan Kund permissions and get the detailed Vedic Samagri checklist.',
      },
      {
        id: 't-norm-3',
        title: 'Interview & Book Catering Partner (Specify Pure Veg & Jain Counters)',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.60)),
        completed: false,
        priority: 'high',
        dependencies: ['t-norm-1'],
        notes: 'Schedule food tasting session and finalize live street chaat stalls.',
      },
      {
        id: 't-norm-4',
        title: 'Book Mehendi Artist Squad & Schedule Bridal Henna Trials',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.50)),
        completed: false,
        priority: 'medium',
        notes: 'Confirm organic Rajasthani henna cones and assistant count for family members.',
      },
      {
        id: 't-norm-5',
        title: `Send Formal Invitations & Order Custom Mithai Gift Boxes for ${guestCount} Guests`,
        category: 'guests',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.45)),
        completed: false,
        priority: 'medium',
        dependencies: ['t-norm-1'],
        notes: 'Include dress codes (Traditional Indian / Indo-Western) and Google Map venue pin.',
      },
      {
        id: 't-norm-6',
        title: `Design Theme Decor & Mandap Styling (${theme})`,
        category: 'decor',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.35)),
        completed: false,
        priority: 'medium',
        notes: 'Review marigold garland counts, brass diya placements, and floral entry arch.',
      },
      {
        id: 't-norm-7',
        title: 'Book DJ, Dhol Players & Rehearse Sangeet Family Choreography',
        category: 'vendors',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.25)),
        completed: false,
        priority: 'high',
        notes: 'Submit couple entry song track and coordinate family dance performance medley.',
      },
      {
        id: 't-norm-8',
        title: 'Obtain Local Police & Municipal Sound NOC for Baraat / Outdoor Dhol',
        category: 'logistics',
        dueDate: calculateTaskDate(eventDate, Math.round(daysUntilEvent * 0.20)),
        completed: false,
        priority: 'high',
        notes: 'Required for outdoor brass band and Baraat procession up to 10:00 PM.',
      },
      {
        id: 't-norm-9',
        title: 'Lock In Final Headcount & Jain/Veg Breakdown with Caterer',
        category: 'catering',
        dueDate: calculateTaskDate(eventDate, 10),
        completed: false,
        priority: 'urgent',
        dependencies: ['t-norm-5', 't-norm-3'],
        notes: 'Final deadline for food purchase quantities and plate counts.',
      },
      {
        id: 't-norm-10',
        title: 'Arrange Safa Tying Master & Assemble Day-of Puja Kit & Envelopes',
        category: 'final',
        dueDate: calculateTaskDate(eventDate, 2),
        completed: false,
        priority: 'urgent',
        notes: 'Prepare Dakshina envelopes, welcome garlands (Milni malas), and emergency kit.',
      }
    );
  }

  const vendors: VendorItem[] = [
    {
      id: 'v-venue',
      category: 'venue',
      role: `Venue Manager (${venuePref.replace('_', ' ')})`,
      status: 'contacted',
      estimatedCost: Math.round(availableBudget * venueWeight),
      questionsToAsk: [
        'What is your maximum seated capacity with Mandap and dining buffet setups?',
        'Are open flames permitted for the sacred Agni Kund Havan during Pheras?',
        'What are the municipal sound curfew restrictions for the outdoor Baraat and Sangeet?',
        'Do you provide power generator backup (DG sets) in case of power fluctuation?',
        'Are there dedicated green rooms / bridal changing suites with air conditioning?',
      ],
      notes: `Target venue in ${city}. Review security deposit and cancellation terms.`,
    },
    {
      id: 'v-caterer',
      category: 'caterer',
      role: `Wedding Caterer (${foodPref.replace('_', ' ')} specialist)`,
      status: 'shortlisted',
      estimatedCost: Math.round(availableBudget * foodWeight),
      questionsToAsk: [
        'Can you provide a 100% separate kitchen setup and serving utensils for Jain & Sattvic guests?',
        'What live interactive counters are included (e.g. chaat, dosa, jalebi, kulfi)?',
        'How many service staff and uniform busboys will be on duty for our guest count?',
        'Do you supply copper chafing dishes, premium ceramic crockery, and filtered mineral water stations?',
      ],
      notes: `Targeting ~₹${Math.round((availableBudget * foodWeight) / guestCount).toLocaleString('en-IN')}/person for ${guestCount} guests.`,
    },
    {
      id: 'v-pandit',
      category: 'pandit_priest',
      role: 'Pandit Ji / Vedic Priest',
      status: 'shortlisted',
      estimatedCost: Math.round(availableBudget * 0.03),
      questionsToAsk: [
        'What is the exact auspicious Lagna Muhurat timing for Varmala and Pheras?',
        'Can you provide a comprehensive Puja Samagri list well in advance?',
        'How long will the Vedic ceremony take, and can you explain the 7 vows (Saat Phere) in English/Hindi for guests?',
      ],
      notes: 'Ensure Pandit Ji is familiar with regional family traditions and ritual pacing.',
    },
    {
      id: 'v-photo',
      category: 'photographer',
      role: 'Lead Cinematographer & Candid Photographer',
      status: 'not_started',
      estimatedCost: Math.round(availableBudget * photoWeight),
      questionsToAsk: [
        'Does the crew include dedicated candid photographers and traditional family portrait shooters?',
        'Is drone aerial videography included and compliant with local municipal flight rules?',
        'What is the turnaround time for the 1-minute Sangeet teaser reel and full cinematic wedding film?',
        'Do you bring backup cameras, lights, and redundant memory cards?',
      ],
      notes: 'Request full multi-day Indian wedding gallery portfolio to review mandap lighting skill.',
    },
    {
      id: 'v-entertainment',
      category: 'dhol_band',
      role: 'DJ, Sound Engineer & Live Dhol Squad',
      status: 'not_started',
      estimatedCost: Math.round(availableBudget * entertainmentWeight),
      questionsToAsk: [
        'How many live Punjabi/Nashik Dhol drummers will lead the groom Baraat procession?',
        'Do you have wireless roaming lapel microphones for speeches and the Pandit Ji rituals?',
        'Can you seamlessly transition the sound indoors at 10:00 PM to adhere to the outdoor noise curfew?',
      ],
      notes: 'Coordinate Baraat arrival route and power outlet locations with venue team.',
    },
    {
      id: 'v-mehendi',
      category: 'mehendi',
      role: 'Lead Mehendi Artist & Henna Squad',
      status: 'not_started',
      estimatedCost: Math.round(availableBudget * 0.04),
      questionsToAsk: [
        'Are 100% organic, chemical-free henna cones used (safe for sensitive skin)?',
        'How many assistant artists will accompany for family and bridesmaid henna applications?',
        'Does the bridal package include custom couple portraits, skylines, and story motifs in the design?',
      ],
      notes: 'Book trial session for bride 3-4 weeks prior to wedding date.',
    },
  ];

  const ideas: PersonalizedIdea[] = [
    {
      id: 'idea-theme-1',
      category: 'theme',
      title: `${theme} Visual Concept`,
      description: `A regal Indian aesthetic featuring vibrant marigold yellow, sacred vermilion crimson, raw silk fabrics, and antique brass accents suited for ${input.eventType}.`,
      tier: 'balanced',
      costImpact: 'Moderate — utilizes seasonal Indian florals (Genda phool, Mogra) and reusable brass decor',
      reasoning: `Infuses warmth and traditional grandeur while naturally harmonizing with ${venuePref.replace('_', ' ')} architecture.`,
    },
    {
      id: 'idea-decor-marigold',
      category: 'decor',
      title: 'Floating Urli Diya & Marigold Curtains',
      description: 'Hand-hammered brass urlis filled with fresh water, floating marigolds, and tea-light candles placed along pathways and entrance foyers.',
      tier: 'budget',
      costImpact: 'Low Cost — saves up to 50% compared to exotic imported cut flowers',
      reasoning: 'Creates an authentic, welcoming royal Indian fragrance and festive glow without heavy floral importation costs.',
    },
    {
      id: 'idea-decor-luxe',
      category: 'decor',
      title: 'Grand Raj-Darbar Floral Mandap with Crystal Chandeliers',
      description: 'A four-pillar carved mandap crowned with cascading tuberose (rajnigandha), pastel roses, and ambient warm chandelier illumination.',
      tier: 'premium',
      costImpact: 'High Cost — requires specialized floral carpentry, structural rigging, and master florists',
      reasoning: 'Provides a breathtaking, photo-worthy sacred sanctum for the Vedic Pheras that will anchor lifelong memories.',
    },
    {
      id: 'idea-food-concept',
      category: 'food',
      title: `Interactive Live Chaat Bazaar & Shahi Sweet Station`,
      description: 'Chef-attended live street counters featuring authentic Delhi Golgappe (5 flavored waters), Banarasi Tamatar Chaat, Pav Bhaji, and hot Jalebi-Rabri.',
      tier: 'balanced',
      costImpact: 'Balanced — elevates guest excitement and interaction significantly without full plated-service staffing costs',
      reasoning: `Accommodates both Pure Vegetarian, Jain, and diverse palate needs for ${guestCount} guests seamlessly with rapid turnover.`,
    },
    {
      id: 'idea-activity-safa',
      category: 'activity',
      title: 'Royal Turban & Safa Tying Station with Color Codes',
      description: 'A traditional Safa station with master pagdi-tying artists greeting guests with custom silks (e.g. Royal Pink for Ladkewale, Mint Green for Ladkiwale).',
      tier: 'balanced',
      costImpact: 'Moderate (₹250 - ₹450 per guest safa including fabric & tying master)',
      reasoning: 'Instantly unifies the wedding celebration and creates spectacular, vibrant family photographs during the Baraat.',
    },
  ];

function generateDefaultGuests(eventType: EventType): GuestItem[] {
  if (eventType === 'wedding') {
    return [
      { id: 'g-1', name: 'Rajesh & Sunita Sharma', email: 'rajesh.sharma@example.com', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: true, plusOneName: 'Sunita Sharma', tableNumber: 'Table 1 (Family Elders)' },
      { id: 'g-2', name: 'Vikram & Ananya Mehta', email: 'vikram.mehta@example.com', rsvpStatus: 'attending', dietary: 'jain', plusOne: true, plusOneName: 'Ananya Mehta', tableNumber: 'Table 2 (Jain Counter)' },
      { id: 'g-3', name: 'Priya Patel', email: 'priya.patel@example.com', rsvpStatus: 'attending', dietary: 'vegetarian', plusOne: false, tableNumber: 'Table 3 (Bridal Friends)' },
      { id: 'g-4', name: 'Farhan & Zara Siddiqui', email: 'farhan.s@example.com', rsvpStatus: 'attending', dietary: 'halal', plusOne: true, plusOneName: 'Zara Siddiqui', tableNumber: 'Table 4' },
      { id: 'g-5', name: 'Neha Singhania', email: 'neha.s@example.com', rsvpStatus: 'pending', dietary: 'gluten_free', plusOne: false, tableNumber: 'Table 3 (Bridal Friends)' },
      { id: 'g-6', name: 'Amitabh Joshi', email: 'ajoshi@example.com', rsvpStatus: 'declined', dietary: 'none', plusOne: false },
    ];
  } else if (eventType === 'birthday') {
    return [
      { id: 'g-1', name: 'Kabir Sen', email: 'kabir.sen@example.com', rsvpStatus: 'attending', dietary: 'none', plusOne: true, plusOneName: 'Rhea Sen', tableNumber: 'VIP Lounge' },
      { id: 'g-2', name: 'Neha Joshi', email: 'neha.j@example.com', rsvpStatus: 'attending', dietary: 'jain', plusOne: false, tableNumber: 'Lounge 1' },
      { id: 'g-3', name: 'Rohan Verma', email: 'rohan.v@example.com', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: false, tableNumber: 'Lounge 1' },
      { id: 'g-4', name: 'Tanya Roy', email: 'tanya.r@example.com', rsvpStatus: 'pending', dietary: 'vegetarian', plusOne: true, plusOneName: 'Aditya Roy', tableNumber: 'Lounge 2' },
    ];
  } else {
    return [
      { id: 'g-1', name: 'Dr. Shashi Raman (Community President)', email: 's.raman@communitytrust.org', rsvpStatus: 'attending', dietary: 'pure_veg', plusOne: false, tableNumber: 'Trustee Dais' },
      { id: 'g-2', name: 'Mrs. Vandana Agarwal (Women Welfare Lead)', email: 'v.agarwal@example.com', rsvpStatus: 'attending', dietary: 'jain', plusOne: true, plusOneName: 'Suresh Agarwal', tableNumber: 'Committee Table' },
      { id: 'g-3', name: 'Tariq Khan (Logistics Coordinator)', email: 'tariq.k@example.com', rsvpStatus: 'attending', dietary: 'halal', plusOne: false, tableNumber: 'Volunteer Hub' },
      { id: 'g-4', name: 'Youth Garba Committee Members', email: 'garba.lead@community.org', rsvpStatus: 'attending', dietary: 'vegetarian', plusOne: false, tableNumber: 'Youth Staging' },
    ];
  }
}

function generateDefaultSchedule(eventType: EventType): ScheduleItem[] {
  if (eventType === 'wedding') {
    return [
      { id: 's-1', time: '08:30 AM', activity: 'Haldi Ceremony & Phoolon Ki Holi', location: 'Haveli Central Courtyard', responsibleRole: 'Family Leads & Decorator', notes: 'Organic turmeric paste, marigold flower baskets, and upbeat folk playlist' },
      { id: 's-2', time: '11:30 AM', activity: 'Bridal Henna & Safa Tying for Ladkewale', location: 'Guest Suites / Heritage Lounge', responsibleRole: 'Mehendi Artist & Safa Master', notes: 'Chai and snack boxes served to guests' },
      { id: 's-3', time: '04:00 PM', activity: 'Baraat Assembly & High-Energy Dhol Procession', location: 'Main Entrance Driveway', responsibleRole: 'Dhol Band & Groom Squad', notes: 'Vintage car / Ghodi entry, cold sparkler pyro and flower showers' },
      { id: 's-4', time: '05:30 PM', activity: 'Milni Ceremony & Royal Varmala Exchange', location: 'Grand Mandap Stage', responsibleRole: 'Pandit Ji & Event Host', notes: 'Rose petal shower and hydraulic stage spotlight' },
      { id: 's-5', time: '06:45 PM', activity: 'Vedic Pheras around Sacred Agni Kund & Kanyadaan', location: 'Sacred Mandap', responsibleRole: 'Pandit Ji', notes: 'Auspicious Lagna Muhurat rituals followed by Sindoor Daan' },
      { id: 's-6', time: '08:30 PM', activity: 'Royal Shahi Dawat & Live Chaat Stations Open', location: 'Grand Dining Pavilion', responsibleRole: 'Catering Lead', notes: 'Dedicated pure vegetarian and Jain counters highlighted' },
      { id: 's-7', time: '10:00 PM', activity: 'Sangeet Celebrations & DJ Dance Floor (Indoor)', location: 'Indoor Palace Ballroom', responsibleRole: 'DJ & Sangeet Choreographer', notes: 'Transitions indoors to adhere to 10:00 PM outdoor sound curfew' },
      { id: 's-8', time: '11:45 PM', activity: 'Emotional Bidaai Ceremony & Royal Send-off', location: 'Palace Main Gate', responsibleRole: 'Family Leads & Coordinator', notes: 'Doli carriage decorated and family blessings' },
    ];
  } else if (eventType === 'birthday') {
    return [
      { id: 's-1', time: '06:00 PM', activity: 'Bollywood Neon Backdrop & Balloon Arch Setup', location: 'Rooftop Terrace', responsibleRole: 'Decorator', notes: 'Check lighting fixtures and photo props' },
      { id: 's-2', time: '07:30 PM', activity: 'Guest Welcome with Signature Mocktails & Live Chaat', location: 'Welcome Foyer', responsibleRole: 'Catering Lead', notes: 'Golgappa and tandoori appetizer counters live' },
      { id: 's-3', time: '08:45 PM', activity: 'Interactive Bollywood Trivia & Group Games', location: 'Center Stage', responsibleRole: 'Host / Emcee', notes: 'High-energy 20-minute fun quiz with prizes' },
      { id: 's-4', time: '09:30 PM', activity: 'Custom Milestone Cake Cutting & Sparkler Toast', location: 'Stage', responsibleRole: 'Event Coordinator', notes: 'Champagne / mocktail toast poured' },
      { id: 's-5', time: '10:00 PM', activity: 'Bollywood DJ Dance Floor & Live Dhol Jugalbandi', location: 'Rooftop Dance Floor', responsibleRole: 'DJ & Dhol Player', notes: 'Indoor sound limits observed after 10 PM' },
      { id: 's-6', time: '11:30 PM', activity: 'Return Gift Hamper Distribution & Late-Night Kulfi', location: 'Exit Lounge', responsibleRole: 'Host', notes: 'Handcrafted mithai & gift hampers handed to departing guests' },
    ];
  } else {
    return [
      { id: 's-1', time: '04:00 PM', activity: 'Pandal Ground Setup, Audio Sound Check & Rangoli Inspection', location: 'Community Grounds', responsibleRole: 'Logistics Coordinator', notes: 'Verify police sound NOC and generator' },
      { id: 's-2', time: '05:30 PM', activity: 'Grand Maha Aarti & Lamp Lighting by Community Elders', location: 'Main Utsav Stage', responsibleRole: 'Trustee President', notes: 'Conch shells, brass bells, and opening devotional shlokas' },
      { id: 's-3', time: '06:30 PM', activity: 'Traditional Garba & Dandiya Raas (Round 1 - Families & Children)', location: 'Central Circle', responsibleRole: 'Garba Lead & DJ', notes: 'Traditional Gujarati and Rajasthani folk music tracks' },
      { id: 's-4', time: '08:00 PM', activity: 'Community Mahaprasad & Sattvic Feast Service', location: 'Dining Pandal', responsibleRole: 'Food Committee Lead', notes: 'Pure sattvic preparation distributed smoothly to all attendees' },
      { id: 's-5', time: '09:15 PM', activity: 'High-Energy Dandiya Raas (Round 2) with Live Folk Dhol', location: 'Central Circle', responsibleRole: 'Live Dhol Squad & DJ', notes: 'Dandiya stick pairs available at entry desk' },
      { id: 's-6', time: '10:00 PM', activity: 'Sound Curfew Compliance, Prize Distribution & Cleanliness Drive', location: 'Main Stage', responsibleRole: 'Volunteer Lead', notes: 'Transition outdoor speakers off and begin zero-waste cleanup' },
    ];
  }
}

  const guests = generateDefaultGuests(input.eventType);
  const schedule = generateDefaultSchedule(input.eventType);

  const partialPlan = {
    eventType: input.eventType,
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
    guests,
  };

  const { insights, missingPrompts } = evaluateDecisionRules(partialPlan);

  const title = input.title?.trim() || `${theme} ${input.eventType.charAt(0).toUpperCase() + input.eventType.slice(1)}`;

  const explanation =
    `Plan tailored for ${guestCount} guests in ${city} with a ${formatCurrency(totalBudget)} budget. ` +
    `Allocations prioritize ${priorities.join(' & ')}, reserving a ${formatCurrency(Math.round(totalBudget * contingencyRate))} (${Math.round(contingencyRate * 100)}%) contingency reserve. ` +
    `Timeline is calibrated across ${daysUntilEvent} days remaining until ${eventDate}.`;

  return {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title,
    eventType: input.eventType,
    eventDate,
    city,
    venueName: input.venueName,
    guestCount,
    totalBudget,
    currency: '₹',
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
    guests,
    schedule,
    decisionInsights: insights,
    missingInfoPrompts: missingPrompts,
    generationExplanation: explanation,
  };
}
