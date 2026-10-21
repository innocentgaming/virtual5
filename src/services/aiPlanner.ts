import type {
  EventPlan,
  EventType,
  VenuePreference,
  FoodPreference,
  PriorityArea,
  VendorItem,
  VendorStatus,
  VendorCategory,
} from '../types/event';
import { generateFallbackPlan } from './fallbackPlanner';
import { evaluateDecisionRules } from './decisionEngine';

export interface AIPlanningRequest {
  eventType: EventType;
  title?: string;
  eventDate: string;
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
  customApiKey?: string;
}

function validateAIPlanResponse(data: unknown): data is Partial<EventPlan> {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.budgetItems)) return false;
  if (!Array.isArray(obj.tasks)) return false;
  if (!Array.isArray(obj.vendors)) return false;
  if (!Array.isArray(obj.ideas)) return false;

  return true;
}

export async function generateAIEventPlan(request: AIPlanningRequest): Promise<EventPlan> {
  const apiKey =
    request.customApiKey?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  if (!apiKey) {
    return generateFallbackPlan({
      title: request.title,
      eventType: request.eventType,
      eventDate: request.eventDate,
      city: request.city,
      guestCount: request.guestCount,
      totalBudget: request.totalBudget,
      venuePreference: request.venuePreference,
      foodPreference: request.foodPreference,
      theme: request.theme,
      priorities: request.priorities,
      accessibilityNeeds: request.accessibilityNeeds,
      culturalTraditions: request.culturalTraditions,
      specialNotes: request.specialNotes,
      contingencyRate: request.contingencyRate,
    });
  }

  const prompt = `You are EventWise AI, an expert event planner.
Generate a comprehensive, realistic event plan in strictly valid JSON format.
Event Specifications:
- Event Type: ${request.eventType}
- Event Title: ${request.title || 'Personalized ' + request.eventType}
- Date: ${request.eventDate}
- City: ${request.city}
- Guests: ${request.guestCount}
- Overall Budget: $${request.totalBudget} USD
- Venue Preference: ${request.venuePreference || 'flexible'}
- Food Preference: ${request.foodPreference || 'buffet'}
- Theme: ${request.theme || 'modern elegant'}
- Priorities: ${(request.priorities || []).join(', ') || 'guest experience'}
- Accessibility: ${(request.accessibilityNeeds || []).join(', ') || 'none specified'}
- Cultural Traditions: ${request.culturalTraditions || 'standard'}
- Notes: ${request.specialNotes || 'none'}

CRITICAL GUIDELINES:
1. All costs MUST be realistic estimates only and sum up to within $${request.totalBudget}.
2. Never invent real verified vendor names, phone numbers, or pretend you checked live bookings.
3. Include categories: venue, catering, decor, photography, entertainment, logistics.
4. Output ONLY pure raw JSON (no markdown fences, no explanatory chat).

JSON Structure:
{
  "generationExplanation": "Short 2-sentence rationale for this plan",
  "budgetItems": [
    { "id": "b1", "name": "Item name", "category": "venue", "estimatedCost": 2000, "priority": "essential", "notes": "Details" }
  ],
  "tasks": [
    { "id": "t1", "title": "Task title", "category": "venue", "dueDate": "YYYY-MM-DD", "completed": false, "priority": "high", "notes": "Details" }
  ],
  "vendors": [
    { "id": "v1", "category": "venue", "role": "Venue Manager", "status": "contacted", "estimatedCost": 2000, "questionsToAsk": ["Q1", "Q2"], "notes": "Guidance" }
  ],
  "ideas": [
    { "id": "i1", "category": "decor", "title": "Idea title", "description": "Idea desc", "tier": "balanced", "costImpact": "Moderate", "reasoning": "Why it fits" }
  ]
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-1.5-flash'];
    let response: Response | null = null;

    for (const model of candidateModels) {
      try {
        const candidateRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: 'application/json',
              },
            }),
          }
        );
        if (candidateRes.ok) {
          response = candidateRes;
          break;
        } else if (candidateRes.status === 404) {
          continue; // Model not available for this key, check next candidate
        } else {
          response = candidateRes;
          break;
        }
      } catch {
        break;
      }
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      console.warn('AI API returned status ' + (response ? response.status : 'timeout') + ', falling back to rule engine.');
      return generateFallbackPlan(request);
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return generateFallbackPlan(request);
    }

    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    if (!validateAIPlanResponse(parsed)) {
      console.warn('AI returned schema mismatch, using fallback planner.');
      return generateFallbackPlan(request);
    }

    const fallback = generateFallbackPlan(request);

    const mergedBudget = parsed.budgetItems && parsed.budgetItems.length > 0
      ? parsed.budgetItems.map((item, idx) => ({
          id: item.id || `b-ai-${idx}`,
          name: item.name || 'Expense',
          category: item.category || 'other',
          estimatedCost: Math.max(0, Number(item.estimatedCost) || 0),
          priority: item.priority || 'recommended',
          notes: item.notes || '',
        }))
      : fallback.budgetItems;

    const mergedTasks = parsed.tasks && parsed.tasks.length > 0
      ? parsed.tasks.map((task, idx) => ({
          id: task.id || `t-ai-${idx}`,
          title: task.title || 'Planning Milestone',
          category: task.category || 'final',
          dueDate: task.dueDate || request.eventDate,
          completed: false,
          priority: task.priority || 'medium',
          notes: task.notes || '',
        }))
      : fallback.tasks;

    const mergedVendors: VendorItem[] = parsed.vendors && parsed.vendors.length > 0
      ? parsed.vendors.map((vendor, idx) => ({
          id: vendor.id || `v-ai-${idx}`,
          category: (vendor.category || 'other') as VendorCategory,
          role: vendor.role || 'Service Specialist',
          status: 'not_started' as VendorStatus,
          estimatedCost: Math.max(0, Number(vendor.estimatedCost) || 0),
          questionsToAsk: Array.isArray(vendor.questionsToAsk) ? vendor.questionsToAsk : [],
          notes: vendor.notes || '',
        }))
      : fallback.vendors;

    const mergedIdeas = parsed.ideas && parsed.ideas.length > 0
      ? parsed.ideas.map((idea, idx) => ({
          id: idea.id || `idea-ai-${idx}`,
          category: idea.category || 'activity',
          title: idea.title || 'Creative Suggestion',
          description: idea.description || '',
          tier: idea.tier || 'balanced',
          costImpact: idea.costImpact || 'Moderate',
          reasoning: idea.reasoning || 'Customized for event parameters',
        }))
      : fallback.ideas;

    const { insights, missingPrompts } = evaluateDecisionRules({
      totalBudget: request.totalBudget,
      budgetItems: mergedBudget,
      contingencyRate: request.contingencyRate || 0.10,
      eventDate: request.eventDate,
      guestCount: request.guestCount,
      venuePreference: request.venuePreference || 'banquet_hall',
      foodPreference: request.foodPreference || 'buffet',
      accessibilityNeeds: request.accessibilityNeeds || [],
      priorities: request.priorities || [],
      city: request.city,
      tasks: mergedTasks,
    });

    return {
      id: 'evt-ai-' + Date.now(),
      title: request.title?.trim() || `${request.theme || 'Custom'} ${request.eventType.charAt(0).toUpperCase() + request.eventType.slice(1)}`,
      eventType: request.eventType,
      eventDate: request.eventDate,
      city: request.city,
      guestCount: request.guestCount,
      totalBudget: request.totalBudget,
      currency: '$',
      contingencyRate: request.contingencyRate ?? 0.10,
      venuePreference: request.venuePreference || 'banquet_hall',
      foodPreference: request.foodPreference || 'buffet',
      theme: request.theme || 'Custom',
      priorities: request.priorities || [],
      accessibilityNeeds: request.accessibilityNeeds || [],
      culturalTraditions: request.culturalTraditions || '',
      specialNotes: request.specialNotes || '',
      plannerSource: 'ai',
      lastGeneratedAt: new Date().toISOString(),
      budgetItems: mergedBudget,
      tasks: mergedTasks,
      vendors: mergedVendors,
      ideas: mergedIdeas,
      decisionInsights: insights,
      missingInfoPrompts: missingPrompts,
      generationExplanation: parsed.generationExplanation || `AI-optimized event plan structured for ${request.guestCount} guests in ${request.city}.`,
    };
  } catch (err) {
    console.warn('AI request failed or timed out. Gracefully switching to deterministic fallback engine.', err);
    return generateFallbackPlan(request);
  }
}
