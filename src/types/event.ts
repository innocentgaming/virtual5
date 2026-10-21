export type EventType = 'wedding' | 'birthday' | 'community';

export type VenuePreference =
  | 'indoor'
  | 'outdoor'
  | 'banquet_hall'
  | 'garden_park'
  | 'community_center'
  | 'beach'
  | 'rooftop'
  | 'hotel'
  | 'heritage_haveli'
  | 'farmhouse_lawn'
  | 'resort_lawn';

export type FoodPreference =
  | 'buffet'
  | 'plated'
  | 'cocktail'
  | 'food_trucks'
  | 'family_style'
  | 'potluck'
  | 'royal_thali'
  | 'live_chaat_counters';

export type PriorityArea =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'entertainment'
  | 'decor'
  | 'budget_savings'
  | 'guest_experience';

export type BudgetCategory =
  | 'venue'
  | 'catering'
  | 'decor'
  | 'photography'
  | 'entertainment'
  | 'logistics'
  | 'invitations'
  | 'contingency'
  | 'other';

export interface BudgetItem {
  id: string;
  name: string;
  category: BudgetCategory;
  estimatedCost: number;
  actualCost?: number;
  isPaid?: boolean;
  isPerGuest?: boolean;
  notes?: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export type TaskCategory =
  | 'venue'
  | 'catering'
  | 'vendors'
  | 'guests'
  | 'decor'
  | 'logistics'
  | 'final';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  priority: TaskPriority;
  dependencies?: string[]; // IDs of prerequisite tasks
  notes?: string;
}

export type VendorCategory =
  | 'venue'
  | 'caterer'
  | 'photographer'
  | 'decorator'
  | 'entertainment'
  | 'officiant'
  | 'transport'
  | 'baker'
  | 'pandit_priest'
  | 'mehendi'
  | 'dhol_band'
  | 'safa_turban'
  | 'mithai_favors'
  | 'other';

export type VendorStatus = 'not_started' | 'contacted' | 'shortlisted' | 'booked' | 'completed';

export interface VendorItem {
  id: string;
  category: VendorCategory;
  role: string;
  status: VendorStatus;
  estimatedCost: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  questionsToAsk: string[];
}

export interface PersonalizedIdea {
  id: string;
  category: 'theme' | 'decor' | 'activity' | 'food' | 'entertainment' | 'invitation';
  title: string;
  description: string;
  tier: 'budget' | 'balanced' | 'premium';
  costImpact: string;
  reasoning: string;
}

export interface DecisionInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'action_required' | 'positive';
  category: 'budget' | 'timeline' | 'weather' | 'capacity' | 'accessibility' | 'vendors';
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: string;
}

export type RsvpStatus = 'attending' | 'declined' | 'pending';

export type DietaryRequirement =
  | 'none'
  | 'vegetarian'
  | 'jain'
  | 'pure_veg'
  | 'vegan'
  | 'gluten_free'
  | 'halal'
  | 'kosher'
  | 'nut_allergy';

export interface GuestItem {
  id: string;
  name: string;
  email?: string;
  rsvpStatus: RsvpStatus;
  dietary: DietaryRequirement;
  plusOne: boolean;
  plusOneName?: string;
  tableNumber?: string;
  notes?: string;
}

export interface ScheduleItem {
  id: string;
  time: string; // e.g. "09:00 AM" or "14:30"
  activity: string;
  location: string;
  responsibleRole: string; // e.g. "Caterer", "DJ / Audio", "Officiant", "Photographer"
  notes?: string;
}

export interface EventPlan {
  id: string;
  title: string;
  eventType: EventType;
  eventDate: string; // YYYY-MM-DD
  city: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  contingencyRate: number; // e.g. 0.10 for 10%
  venuePreference: VenuePreference;
  foodPreference: FoodPreference;
  theme: string;
  priorities: PriorityArea[];
  accessibilityNeeds: string[];
  culturalTraditions: string;
  specialNotes: string;
  plannerSource: 'ai' | 'fallback_rule_engine';
  lastGeneratedAt: string;
  budgetItems: BudgetItem[];
  tasks: TaskItem[];
  vendors: VendorItem[];
  ideas: PersonalizedIdea[];
  guests?: GuestItem[];
  schedule?: ScheduleItem[];
  decisionInsights: DecisionInsight[];
  missingInfoPrompts: string[];
  generationExplanation: string;
}

export interface BudgetSummary {
  totalBudget: number;
  totalEstimated: number;
  remainingBalance: number;
  utilizationPercentage: number;
  isOverBudget: boolean;
  contingencyAmount: number;
  categoryTotals: Record<BudgetCategory, number>;
  perGuestCost: number;
  totalActual: number;
  variance: number;
  isActualOverBudget: boolean;
}

