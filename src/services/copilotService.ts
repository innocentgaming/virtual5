import type { EventPlan } from '../types/event';
import { formatCurrency } from '../utils/formatters';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export const COPILOT_STARTER_PROMPTS: string[] = [
  'How do I trim 15% from my budget without impacting guests?',
  'What key questions must I ask the caterer about food allergies?',
  'Suggest 4 creative, interactive activities matching our theme.',
  'What is our critical path for the next 3 weeks?',
  'Draft a sample Day-of ceremony and reception schedule.',
];

/**
 * Generates an intelligent, grounded copilot response based on the active event plan.
 */
export function generateCopilotAnswer(question: string, plan: EventPlan): string {
  const q = question.toLowerCase();

  // 1. Budget Trimming & Cost Savings
  if (q.includes('budget') || q.includes('trim') || q.includes('save') || q.includes('cut') || q.includes('cost')) {
    const total = plan.totalBudget;
    const cateringItem = plan.budgetItems.find((b) => b.category === 'catering');

    return (
      `Here is a targeted cost-saving strategy for your ${plan.title} (${formatCurrency(total)} budget):\n\n` +
      `1. **Catering Optimization**: Catering is typically your highest expense (${cateringItem ? formatCurrency(cateringItem.estimatedCost) : '~35%'}). Switching from formal plated service to a chef-attended buffet or action stations saves 18–22% on waitstaff and kitchen labor.\n` +
      `2. **Floral & Centerpiece Substitutions**: Repurpose ceremony flowers (arch pieces, aisle markers) as reception sweetheart and buffet decor rather than ordering separate reception arrangements.\n` +
      `3. **Digital Stationery**: Utilize modern digital RSVPs and QR code menus. This saves $400–$800 in letterpress printing and postage while streamlining real-time attendee tracking.\n` +
      `4. **BYOB or Corkage Negotiation**: If ${plan.venuePreference.replace('_', ' ')} allows external beverage sourcing, purchasing wine and spirits wholesale with a flat bartender service fee can cut beverage costs by 30%.`
    );
  }

  // 2. Caterer & Dietary Questions
  if (q.includes('cater') || q.includes('allerg') || q.includes('food') || q.includes('diet')) {
    return (
      `Essential questions for vetting your caterer in ${plan.city} for ${plan.guestCount} guests:\n\n` +
      `1. **Cross-Contamination Protocol**: "How do you prepare and plate allergen-safe meals (celiac gluten-free, nut allergies) separately from the main production line?"\n` +
      `2. **Vendor Meal Policy**: "What is your discounted rate for vendor meals (photographer, DJ, coordinator) and when are they served?"\n` +
      `3. **Headcount Lock Deadline**: "What is the final cutoff date for submitting dietary lists and exact attendee numbers without incurring penalty fees?"\n` +
      `4. **Leftover Packaging**: "Are unserved buffet portions packaged for the hosts to take home, or are compost/donation partnerships in place?"`
    );
  }

  // 3. Activities & Theme Ideas
  if (q.includes('activit') || q.includes('game') || q.includes('theme') || q.includes('entertainment') || q.includes('idea')) {
    if (plan.eventType === 'wedding') {
      return (
        `Interactive celebration concepts aligned with your theme "${plan.theme}":\n\n` +
        `1. **Audio Guestbook**: A vintage rotary telephone station where attendees record heartfelt voice messages for you to listen to on anniversaries.\n` +
        `2. **Live Painter or Live Caricaturist**: An artist painting your first dance live during the reception, giving guests a mesmerizing focal point.\n` +
        `3. **Signature Cocktail Storyboard**: Display cute cards explaining the personal story behind the couple's favorite drinks.\n` +
        `4. **Late-Night Snack Surprise**: Bring out mini gourmet sliders, hot churros, or a food truck 1 hour before the party concludes.`
      );
    } else if (plan.eventType === 'birthday') {
      return (
        `High-energy entertainment ideas for "${plan.title}":\n\n` +
        `1. **Retro Polaroid Wall**: Guests snap photos, sign them with metallic pens, and hang them on a neon-lit wire grid.\n` +
        `2. **Curated Trivia Showdown**: A fast 15-minute trivia quiz on the guest of honor via attendees' smartphones (using Kahoot or printed trivia cards).\n` +
        `3. **Mixologist Masterclass Corner**: A pop-up bar where guests can shake their own custom garnish mocktails or cocktails.\n` +
        `4. **Themed Dance Anthem Countdown**: Have guests vote during RSVP for their favorite song to be played during the midnight drop.`
      );
    } else {
      return (
        `Engaging community activation concepts for "${plan.title}":\n\n` +
        `1. **Collaborative Community Canvas**: An oversized mural where attendees of all ages paint a square representing local neighborhood culture.\n` +
        `2. **Local Artisan Showcase & Raffle**: Partner with local craftspeople for demo booths and a community raffle supporting civic causes.\n` +
        `3. **Acoustic Open Mic & Youth Troupe**: Staggered 20-minute performance sets highlighting local school and cultural performers.\n` +
        `4. **Zero-Waste Compost Challenge**: Clear, colorful educational stations showing waste diversion metrics in real time.`
      );
    }
  }

  // 4. Run of Show / Day-of Itinerary
  if (q.includes('run of show') || q.includes('day of') || q.includes('day-of') || q.includes('itinerary')) {
    return (
      `Day-of Run of Show structure for ${plan.title}:\n\n` +
      `1. **Vendor Load-in Buffer**: Schedule decorators, AV, and florists at least 2.5–3 hours prior to guest arrival.\n` +
      `2. **Pacing Buffer**: Add 10–15 minute flex windows between major transitions to avoid schedule compression.\n` +
      `3. **Lead Point of Contact**: Designate a single coordinator or party lead with the printed master run-of-show binder.\n` +
      `4. **Sync Schedule**: Export your calendar milestones via the **Sync .ics** button for live reminders.`
    );
  }

  // 5. Critical Path & Timeline
  if (q.includes('time') || q.includes('path') || q.includes('schedul') || q.includes('week') || q.includes('urgent')) {
    const uncompletedTasks = plan.tasks.filter((t) => !t.completed);
    const topUrgent = uncompletedTasks.slice(0, 4);

    return (
      `Critical milestones and immediate priorities for ${plan.title} (Target: ${plan.eventDate}):\n\n` +
      (topUrgent.length > 0
        ? topUrgent.map((t, idx) => `${idx + 1}. **${t.title}** (Due: ${t.dueDate}, Category: ${t.category.toUpperCase()})`).join('\n')
        : 'All immediate milestone tasks are currently marked complete!') +
      `\n\nTip: You can export all dates directly to your calendar via the **Export Calendar (.ics)** button in the header.`
    );
  }

  // Generic grounded response
  return (
    `Here is advice tailored for your ${plan.eventType} in ${plan.city}:\n\n` +
    `• **Headcount & Venue**: You are planning for ${plan.guestCount} guests with a preferred ${plan.venuePreference.replace('_', ' ')} layout. Ensure all exits and restrooms meet the declared accessibility requirements.\n` +
    `• **Budget Allocation**: Your total budget is ${formatCurrency(plan.totalBudget)} (~${formatCurrency(plan.totalBudget / Math.max(1, plan.guestCount))} per guest). A ${Math.round(plan.contingencyRate * 100)}% contingency buffer is reserved.\n` +
    `• **Next Steps**: Keep your vendor statuses updated under Vendor Checklist, and track your attendee confirmations under the Guest List tab.`
  );
}

/**
 * Asynchronously generates an AI Copilot response using Gemini if an API key is available,
 * or gracefully returns the deterministic response.
 */
export async function generateCopilotAnswerAsync(
  question: string,
  plan: EventPlan,
  customApiKey?: string
): Promise<string> {
  const apiKey =
    customApiKey?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  if (!apiKey) {
    return generateCopilotAnswer(question, plan);
  }

  const prompt = `You are EventWise AI, an expert, encouraging event planning copilot.
The user is planning a ${plan.eventType.toUpperCase()}:
- Title: "${plan.title}"
- City: ${plan.city}
- Guests: ${plan.guestCount}
- Budget: ${formatCurrency(plan.totalBudget)}
- Theme: ${plan.theme || 'Standard'}
- Venue: ${plan.venuePreference}

User Question: "${question}"

Provide a structured, helpful, concise, bulleted answer (under 180 words). Be concrete with estimates and practical tips.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
    let textResult: string | null = null;

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            textResult = candidateText.trim();
            break;
          }
        }
      } catch {
        break;
      }
    }

    clearTimeout(timeoutId);

    if (textResult) {
      return textResult;
    }
  } catch (err) {
    console.warn('GenAI Copilot request failed, using grounded answer:', err);
  }

  return generateCopilotAnswer(question, plan);
}

