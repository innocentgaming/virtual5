import type { EventPlan, TradeOffActionType, TradeOffOption } from '../types/event';
import { formatCurrency } from '../utils/formatters';
import { evaluateDecisionRules } from './decisionEngine';
import {
  canCallGemini,
  getActiveApiKey,
  requestGeminiContent,
  redactSecrets,
} from './geminiClient';
import { sanitizeString } from '../utils/validators';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
  proposedActions?: TradeOffOption[];
}

export const COPILOT_STARTER_PROMPTS: string[] = [
  'How do I trim 15% from my budget without impacting guests?',
  'What key questions must I ask the caterer about food allergies?',
  'What are the 10 PM curfew rules and sound permits?',
  'What is our critical path for the upcoming weeks?',
  'How do we handle a guest surge beyond venue capacity?',
];

function getDaysRemaining(eventDate: string): string {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(eventDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? `${diffDays} days remaining` : `${Math.abs(diffDays)} days passed`;
  } catch {
    return 'Date TBD';
  }
}

/**
 * Builds a compact, strictly privacy-safe snapshot of the active event plan.
 * Omits all guest names, emails, phone numbers, and personal details.
 * Capped to prevent token overflows.
 */
export function buildPlanSnapshot(plan: EventPlan): string {
  const daysInfo = getDaysRemaining(plan.eventDate);
  const totalBudget = plan.totalBudget || 0;
  const allocated = (plan.budgetItems || []).reduce(
    (sum, item) => sum + (item.actualCost ?? item.estimatedCost ?? 0),
    0
  );
  const contingencyBuffer = Math.round(totalBudget * (plan.contingencyRate || 0.1));
  const perGuest = plan.guestCount > 0 ? Math.round(totalBudget / plan.guestCount) : 0;

  const topItems = [...(plan.budgetItems || [])]
    .sort((a, b) => (b.actualCost ?? b.estimatedCost ?? 0) - (a.actualCost ?? a.estimatedCost ?? 0))
    .slice(0, 4)
    .map((b) => `${b.name || b.category}: ${formatCurrency(b.actualCost ?? b.estimatedCost ?? 0)}`)
    .join('; ');

  const tasks = plan.tasks || [];
  const openTasks = tasks.filter((t) => !t.completed);
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = openTasks.filter((t) => t.dueDate && t.dueDate < todayStr).length;
  const upcomingUrgent = openTasks.slice(0, 3).map((t) => `${t.title} (due ${t.dueDate})`).join('; ');

  const vendors = plan.vendors || [];
  const bookedCount = vendors.filter((v) => v.status === 'booked').length;
  const cancelledCount = vendors.filter((v) => v.status === 'cancelled').length;
  const vendorBreakdown = vendors
    .slice(0, 4)
    .map((v) => `${v.role || v.category} [${v.status}]`)
    .join(', ');

  const guests = plan.guests || [];
  const confirmedGuests = guests.filter((g) => g.rsvpStatus === 'attending');
  const confirmedCount = confirmedGuests.length + confirmedGuests.filter((g) => g.plusOne).length;

  const dietaryCounts: Record<string, number> = {};
  guests.forEach((g) => {
    if (g.dietary && g.dietary !== 'none') {
      dietaryCounts[g.dietary] = (dietaryCounts[g.dietary] || 0) + 1;
    }
  });
  const dietaryStr =
    Object.entries(dietaryCounts)
      .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
      .join(', ') || 'None noted';

  const { insights } = evaluateDecisionRules(plan);
  const alertsStr =
    insights && Array.isArray(insights) && insights.length > 0
      ? insights
          .map((i) => `[${(i.type || 'info').toUpperCase()}] ${i.title || 'Notice'}`)
          .slice(0, 3)
          .join('; ')
      : 'All standard checks passing';

  const lines = [
    `Event: ${plan.title} (${plan.eventType.toUpperCase()}, ${plan.city}) - Target: ${plan.eventDate} (${daysInfo})`,
    `Budget: Total ${formatCurrency(totalBudget)}, Allocated ${formatCurrency(allocated)}, Buffer ${formatCurrency(contingencyBuffer)} (${Math.round((plan.contingencyRate || 0.1) * 100)}%), ~${formatCurrency(perGuest)}/guest`,
    `Top Expenses: ${topItems || 'None recorded'}`,
    `Tasks: ${tasks.length} total, ${tasks.length - openTasks.length} done, ${openTasks.length} open, ${overdueCount} overdue. Immediate: ${upcomingUrgent || 'None pending'}`,
    `Vendors: ${vendors.length} total (${bookedCount} booked, ${cancelledCount} cancelled). Key: ${vendorBreakdown || 'None'}`,
    `Guests & RSVPs: Target ${plan.guestCount}, ${guests.length} invited, ${confirmedCount} confirmed`,
    `Dietary Segregations: ${dietaryStr}`,
    `Active Rules/Alerts: ${alertsStr}`,
  ];

  return lines.join('\n').slice(0, 1800);
}

/**
 * Validates structured actions proposed by AI to guarantee type safety and sanity.
 * Drops invalid or dangerous suggestions.
 */
export function validateStructuredAction(
  raw: unknown,
  plan: EventPlan
): TradeOffOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const action = raw as Record<string, unknown>;

  const validActionTypes: TradeOffActionType[] = [
    'reduce_budget_item',
    'increase_budget',
    'adjust_guest_count',
    'add_budget_item',
    'update_vendor_status',
    'replace_vendor',
    'repace_timeline',
    'add_task',
    'update_venue',
    'apply_dietary_counter',
  ];

  const actionType = action.actionType as TradeOffActionType;
  if (!actionType || !validActionTypes.includes(actionType)) {
    return null;
  }

  const rawLabel = typeof action.label === 'string' ? action.label : '';
  if (!rawLabel.trim()) return null;

  const sanitizedLabel = sanitizeString(rawLabel, 100, 'Action label');
  const sanitizedDescription = sanitizeString(
    typeof action.description === 'string' ? action.description : rawLabel,
    200,
    'Action description'
  );
  const sanitizedImpact = sanitizeString(
    typeof action.impactFormatted === 'string' ? action.impactFormatted : 'Adjustment',
    50,
    'Impact format'
  );

  const payload: Record<string, unknown> =
    action.payload && typeof action.payload === 'object'
      ? { ...(action.payload as Record<string, unknown>) }
      : {};

  let impactRupees = typeof action.impactRupees === 'number' ? action.impactRupees : 0;

  const deltaAmount =
    typeof action.deltaAmount === 'number'
      ? action.deltaAmount
      : typeof payload.amount === 'number'
      ? payload.amount
      : 0;

  switch (actionType) {
    case 'reduce_budget_item': {
      if (deltaAmount <= 0 || deltaAmount > (plan.totalBudget || 100000000)) return null;
      impactRupees = -Math.abs(deltaAmount);
      payload.amount = deltaAmount;
      if (typeof action.targetCategory === 'string') {
        payload.category = action.targetCategory.toLowerCase();
      }
      if (typeof action.targetItemId === 'string') {
        const itemExists = plan.budgetItems.some((b) => b.id === action.targetItemId);
        if (itemExists) payload.itemId = action.targetItemId;
      }
      break;
    }
    case 'increase_budget': {
      if (deltaAmount <= 0) return null;
      impactRupees = deltaAmount;
      payload.amount = deltaAmount;
      break;
    }
    case 'adjust_guest_count': {
      const rawCount =
        typeof action.newGuestCount === 'number'
          ? action.newGuestCount
          : typeof payload.newGuestCount === 'number'
          ? payload.newGuestCount
          : null;
      if (!rawCount || rawCount <= 0 || rawCount > 50000) return null;
      payload.newGuestCount = Math.round(rawCount);
      break;
    }
    case 'update_venue': {
      const v = typeof action.targetVenue === 'string' ? action.targetVenue : payload.venuePreference;
      if (v !== 'indoor' && v !== 'outdoor' && v !== 'hybrid') return null;
      payload.venuePreference = v;
      break;
    }
    case 'update_vendor_status': {
      const cat = typeof action.targetCategory === 'string' ? action.targetCategory : payload.category;
      if (typeof cat !== 'string') return null;
      const catExists = plan.vendors.some((v) => v.category.toLowerCase() === cat.toLowerCase());
      if (!catExists) return null;
      payload.category = cat.toLowerCase();
      payload.newStatus = 'cancelled';
      break;
    }
    case 'repace_timeline': {
      if (typeof action.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(action.targetDate)) {
        payload.targetDate = action.targetDate;
      }
      break;
    }
    default:
      break;
  }

  const option: TradeOffOption = {
    id: 'ai-action-' + Math.random().toString(36).slice(2, 9),
    label: sanitizedLabel,
    actionType,
    impactRupees,
    impactFormatted: sanitizedImpact,
    description: sanitizedDescription,
    payload,
  };

  return option;
}

/**
 * Extracts and validates structured action proposals embedded in copilot response text.
 */
export function extractCopilotActions(
  rawText: string,
  plan: EventPlan
): { cleanText: string; actions: TradeOffOption[] } {
  const actions: TradeOffOption[] = [];
  let cleanText = rawText;

  // Match [ACTION: {...}] or [PROPOSED_ACTION: {...}]
  const tagRegex = /\[(?:ACTION|PROPOSED_ACTION):\s*(\{[\s\S]*?\})\s*\]/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawText)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const valid = validateStructuredAction(parsed, plan);
      if (valid) {
        actions.push(valid);
      }
    } catch {
      // Ignore malformed JSON inside tags
    }
  }

  // Also match markdown code fences ```action ... ``` or ```json:action ... ```
  const fenceRegex = /```(?:json:action|action)\s*(\{[\s\S]*?\})\s*```/gi;
  while ((match = fenceRegex.exec(rawText)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const valid = validateStructuredAction(parsed, plan);
      if (valid) {
        actions.push(valid);
      }
    } catch {
      // Ignore malformed block
    }
  }

  // Clean tags from user-facing text
  cleanText = cleanText.replace(tagRegex, '').replace(fenceRegex, '').trim();

  return { cleanText, actions };
}

/**
 * Generates an intelligent, grounded copilot response based on the active event plan snapshot.
 * Fully deterministic and offline-capable.
 */
export function generateCopilotAnswer(question: string, plan: EventPlan): string {
  const q = question.toLowerCase();
  const total = plan.totalBudget || 0;
  const buffer = Math.round(total * (plan.contingencyRate || 0.1));
  const cateringItem = plan.budgetItems.find((b) => b.category === 'catering');
  const cateringCost = cateringItem?.estimatedCost || Math.round(total * 0.35);

  // 1. Budget Trimming & Cost Savings
  if (q.includes('budget') || q.includes('trim') || q.includes('save') || q.includes('cut') || q.includes('cost')) {
    const trimAmount = Math.round(cateringCost * 0.15);

    return (
      `Here is a targeted cost-saving strategy for ${plan.title} (Total Budget: ${formatCurrency(total)}, Contingency: ${formatCurrency(buffer)}):\n\n` +
      `1. **Catering Optimization**: Catering is currently allocated at ${formatCurrency(cateringCost)}. Switching from individual plated service to a chef-attended buffet or action station saves approximately ~15% (${formatCurrency(trimAmount)}) without compromising food quality.\n` +
      `2. **Floral & Decor Repurposing**: Reuse daytime ceremony flowers (mandap arch, aisle decor) as evening reception sweetheart stage decor rather than double-booking floral setups.\n` +
      `3. **Digital Stationery & WhatsApp Invites**: Transitioning to digital invitations and QR code menus saves ~${formatCurrency(25000)}–${formatCurrency(50000)} in physical box printing and courier fees.\n` +
      `4. **Contingency Health**: You currently hold a ${Math.round((plan.contingencyRate || 0.1) * 100)}% reserve (${formatCurrency(buffer)}) for unforeseen vendor price fluctuations.\n\n` +
      `[ACTION: {"label":"Trim Catering by ${formatCurrency(trimAmount)}","actionType":"reduce_budget_item","impactFormatted":"-${formatCurrency(trimAmount)}","description":"Switch catering format to buffet service and streamline live counters","deltaAmount":${trimAmount},"targetCategory":"catering"}]`
    );
  }

  // 2. Caterer & Dietary Questions
  if (q.includes('cater') || q.includes('allerg') || q.includes('food') || q.includes('diet') || q.includes('jain')) {
    const guests = plan.guests || [];
    const jainCount = guests.filter((g) => g.dietary === 'jain').length;
    const pureVegCount = guests.filter((g) => g.dietary === 'pure_veg').length;

    return (
      `Essential questions for vetting your caterer in ${plan.city} for ${plan.guestCount} guests (${jainCount} Jain, ${pureVegCount} Pure Veg registered):\n\n` +
      `1. **Cross-Contamination Protocol**: "How do you prepare and plate allergen-safe meals (celiac gluten-free, nut allergies, Jain) separately from the main production line?"\n` +
      `2. **Vendor Meal Policy**: "What is your discounted rate for vendor meals (photographer, DJ, coordinator) and when are they served?"\n` +
      `3. **Headcount Lock Deadline**: "What is your final cutoff date for submitting dietary lists and exact attendee numbers without incurring penalty fees?"\n` +
      `4. **Leftover Packaging & Dedicated Stations**: "Can you maintain completely segregated cooking vessels, fryers, and serving stations for Jain and Pure Veg food items?"\n\n` +
      `*Note: Quotes and dietary segregation arrangements are estimates—verify directly with your catering vendor.*`
    );
  }

  // 3. Run of Show / Day-of Itinerary
  if (q.includes('run of show') || q.includes('day of') || q.includes('day-of') || q.includes('itinerary')) {
    return (
      `Day-of Run of Show structure for ${plan.title}:\n\n` +
      `1. **Vendor Load-in Buffer**: Schedule decorators, AV, and florists at least 2.5–3 hours prior to guest arrival.\n` +
      `2. **Pacing Buffer**: Add 10–15 minute flex windows between major transitions to avoid schedule compression.\n` +
      `3. **Lead Point of Contact**: Designate a single coordinator or party lead with the printed master run-of-show binder.\n` +
      `4. **Sync Schedule**: Export your calendar milestones via the **Sync .ics** button for live reminders.`
    );
  }

  // 4. Sound Curfew & Municipal Permits
  if (q.includes('curfew') || q.includes('permit') || q.includes('sound') || q.includes('police') || q.includes('10 pm') || q.includes('loudspeaker')) {
    return (
      `Guidance on 10 PM Sound Curfew & Municipal Permits in ${plan.city}:\n\n` +
      `• **10:00 PM Sound Curfew**: Under central Noise Pollution Rules, outdoor loudspeakers and brass bands must cease promptly by 10:00 PM. Transition Baraat processions and dance floors indoors to soundproof halls prior to 10 PM.\n` +
      `• **Police & Loudspeaker Clearances**: File provisional sound and public assembly permissions with your local ACP/police station at least 15–20 days prior to the date.\n` +
      `• **Fire & DG Set Safety**: Outdoor setups require venue-approved silent DG backup sets and certified fire extinguishers near live cooking stalls.\n\n` +
      `*Disclaimer: Municipal and police sound regulations vary by jurisdiction. Check local ward guidelines and obtain verified permits from local authorities.*`
    );
  }

  // 5. Guest Count Surge & Capacity
  if (q.includes('guest') || q.includes('rsvp') || q.includes('surge') || q.includes('capacity') || q.includes('attend')) {
    const guests = plan.guests || [];
    const confirmedCount = guests.filter((g) => g.rsvpStatus === 'attending').length;

    return (
      `Guest management status for ${plan.title}:\n\n` +
      `• **Target Headcount**: ${plan.guestCount} guests (${guests.length} invited, ${confirmedCount} confirmed).\n` +
      `• **Per-Guest Budget**: Currently ~${formatCurrency(plan.guestCount > 0 ? Math.round(total / plan.guestCount) : 0)} per attendee.\n` +
      `• **Action Rule**: If RSVPs exceed venue safety capacity by more than 10%, apply an immediate guest list cap or negotiate additional banquet hall space.\n\n` +
      `[ACTION: {"label":"Cap guest count to ${plan.guestCount}","actionType":"adjust_guest_count","impactFormatted":"Lock ${plan.guestCount}","description":"Lock RSVP registration to prevent venue overcrowding","newGuestCount":${plan.guestCount}}]`
    );
  }

  // 6. Critical Path & Timeline
  if (q.includes('time') || q.includes('path') || q.includes('schedul') || q.includes('week') || q.includes('urgent') || q.includes('task')) {
    const uncompletedTasks = (plan.tasks || []).filter((t) => !t.completed);
    const topUrgent = uncompletedTasks.slice(0, 4);
    const daysInfo = getDaysRemaining(plan.eventDate);

    return (
      `Critical milestones and immediate priorities for ${plan.title} (${daysInfo}, Target: ${plan.eventDate}):\n\n` +
      (topUrgent.length > 0
        ? topUrgent
            .map(
              (t, idx) =>
                `${idx + 1}. **${t.title}** (Due: ${t.dueDate}, Category: ${t.category.toUpperCase()})`
            )
            .join('\n')
        : 'All immediate milestone tasks are currently marked complete!') +
      `\n\nTip: You can re-pace timeline milestones automatically if dates shift.`
    );
  }

  // 7. Ungrounded / External Information Fallback
  if (q.includes('weather') || q.includes('stock') || q.includes('phone') || q.includes('hotel') || q.includes('flight')) {
    return (
      `I am EventWise Copilot, grounded specifically in your active event plan for "${plan.title}".\n\n` +
      `I do not have access to live external weather forecasts, personal contact numbers, or unverified commercial portals. For verified vendor phone numbers or municipal clearances in ${plan.city}, please consult your official vendor agreements and local municipal offices.`
    );
  }

  // Generic grounded snapshot response
  return (
    `Here is advice tailored for your ${plan.eventType} in ${plan.city}:\n\n` +
    `• **Headcount & Venue**: You are planning for ${plan.guestCount} guests with a preferred ${plan.venuePreference.replace('_', ' ')} layout. Ensure all exits and restrooms meet the declared accessibility requirements.\n` +
    `• **Budget Allocation**: Your total budget is ${formatCurrency(total)} (~${formatCurrency(plan.guestCount > 0 ? Math.round(total / plan.guestCount) : 0)} per guest). A ${Math.round((plan.contingencyRate || 0.1) * 100)}% contingency buffer (${formatCurrency(buffer)}) is reserved.\n` +
    `• **Next Steps**: Keep your vendor statuses updated under Vendor Checklist, and track your attendee confirmations under the Guest List tab.\n\n` +
    `*All rates and suggestions are planning estimates—verify with local vendors and authorities.*`
  );
}

interface CopilotCacheEntry {
  answer: string;
  timestamp: number;
}
const copilotMemoryCache = new Map<string, CopilotCacheEntry>();
const COPILOT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Clears the in-memory cache of copilot responses.
 */
export function clearCopilotCache(): void {
  copilotMemoryCache.clear();
}

/**
 * Asynchronously generates an AI Copilot response using Gemini with strict grounding in the plan snapshot,
 * with deterministic offline fallback and input hash response caching.
 */
export async function generateCopilotAnswerAsync(
  question: string,
  plan: EventPlan,
  customApiKey?: string
): Promise<string> {
  const isOfflineMode =
    typeof window !== 'undefined' &&
    window.localStorage &&
    window.localStorage.getItem('eventwise_ai_offline_mode') === 'true';

  if (isOfflineMode || !canCallGemini(customApiKey)) {
    const offlineText = generateCopilotAnswer(question, plan);
    return `*(Operating in Offline Rule Engine Mode — responses calculated deterministically from your active event plan)*\n\n${offlineText}`;
  }

  const safeQuestion = sanitizeString(question, 300, 'Event planning query');
  const cacheKey = `${safeQuestion.toLowerCase().trim()}_${plan.id}_${plan.totalBudget}_${plan.guestCount}_${(plan.budgetItems || []).length}_${plan.eventDate}`;
  const cached = copilotMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COPILOT_CACHE_TTL_MS) {
    return cached.answer;
  }

  const apiKey = getActiveApiKey(customApiKey);
  const planSnapshot = buildPlanSnapshot(plan);

  const prompt = `You are EventWise AI, an expert event planning copilot grounded in Indian event management.

=== ACTIVE EVENT PLAN SNAPSHOT ===
${planSnapshot}
=== END PLAN SNAPSHOT ===

User Question: ${safeQuestion}

STRICT GROUNDING & TRUST DIRECTIVES:
1. Reference REAL figures from the PLAN SNAPSHOT above (e.g., total budget in ₹, days remaining, guest counts, dietary counts).
2. Format all financial figures strictly using Indian currency conventions: use ₹ Lakhs and Crores for larger sums (e.g. ₹35.0 Lakhs, ₹1.2 Crores), or ₹ with Indian comma notation (e.g. ₹1,50,000).
3. DO NOT invent or hallucinate specific vendor business names, phone numbers, email addresses, or unverified claims. Refer only to verified categories or roles present in the snapshot.
4. Label all cost recommendations as planning estimates (e.g., "estimated ~₹X, verify with vendors").
5. For municipal regulations (e.g. 10 PM sound curfews, police loudspeaker permissions, fire safety), state them as guidance and explicitly note: "Check local municipal and police rules as regulations vary by city and jurisdiction."
6. If the user asks to save money or make an event change, you may suggest ONE concrete action at the end using this exact tag:
[ACTION: {"label":"Descriptive title","actionType":"reduce_budget_item","impactFormatted":"-₹X","description":"Reason","deltaAmount":50000,"targetCategory":"catering"}]
Valid actionType values: 'reduce_budget_item', 'increase_budget', 'adjust_guest_count', 'shift_date', 'update_venue', 'update_vendor_status'.
7. Keep your response concise (under 180 words), structured with markdown bullet points. If you do not know something or it is not in the snapshot, state plainly that it is outside your active event data.`;

  try {
    const result = await requestGeminiContent({
      prompt,
      apiKey,
      timeoutMs: 10000,
      maxOutputTokens: 256,
      temperature: 0.3,
    });

    if (result.success && result.text) {
      copilotMemoryCache.set(cacheKey, { answer: result.text, timestamp: Date.now() });
      return result.text;
    }

    if (result.error) {
      console.warn('GenAI Copilot request failed, using grounded answer:', redactSecrets(result.error, apiKey));
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('GenAI Copilot request failed, using grounded answer:', redactSecrets(errMsg, apiKey));
  }

  const fallbackAnswer = `*(Offline Rule Engine Fallback — API unavailable)*\n\n${generateCopilotAnswer(question, plan)}`;
  copilotMemoryCache.set(cacheKey, { answer: fallbackAnswer, timestamp: Date.now() });
  return fallbackAnswer;
}
