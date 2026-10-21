export type EventType = 'wedding' | 'birthday' | 'community';

export type VenuePreference =
  | 'indoor'
  | 'outdoor'
  | 'banquet_hall'
  | 'garden_park'
  | 'community_center'
  | 'beach'
  | 'rooftop'
  | 'hotel';

export type FoodPreference =
  | 'buffet'
  | 'plated'
  | 'cocktail'
  | 'food_trucks'
  | 'family_style'
  | 'potluck';

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
}
