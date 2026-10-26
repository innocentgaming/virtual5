import type { EventPlan, BudgetSummary } from '../types/event';

export type InviteStyle = 'royal' | 'modern' | 'reminder';

/**
 * Formats a Date into standard Indian format: "Friday, 20 Nov 2026"
 */
function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates beautifully formatted WhatsApp invitation and RSVP text.
 * Tailored for Indian celebrations with Muhurat timings, dietary care, and RSVP links.
 */
export function generateWhatsAppInvite(plan: EventPlan, style: InviteStyle = 'royal'): string {
  if (!plan) return '';
  const formattedDate = formatLongDate(plan.eventDate || '');
  const city = plan.city || 'India';
  const venue = plan.venueName ? `${plan.venueName}, ${city}` : city;

  // Extract top 4 milestone timings if schedule exists
  const scheduleHighlights = (plan.schedule || [])
    .slice(0, 4)
    .map((s) => `• ${s.time} — *${s.activity || (s as { title?: string }).title || 'Ceremony'}*`)
    .join('\n');

  // Count dietary preferences for reassurance
  const jainCount = (plan.guests || []).filter((g) => g.dietary === 'jain').length;
  const pureVegCount = (plan.guests || []).filter((g) => g.dietary === 'pure_veg').length;
  const hasDietaryCare = jainCount > 0 || pureVegCount > 0;

  if (style === 'royal') {
    return [
      '🕉️ *Shree Ganeshaya Namah* 🕉️',
      '',
      'With the blessings of our elders and the Almighty, we cordially invite you and your family to celebrate the auspicious union:',
      '',
      `✨ *${plan.title}* ✨`,
      '',
      `📅 *Date*: ${formattedDate}`,
      `📍 *Venue*: ${venue}`,
      plan.theme ? `🎨 *Theme*: ${plan.theme}` : '',
      '',
      scheduleHighlights ? `🌸 *Sacred Muhurat & Ceremonies*:\n${scheduleHighlights}\n` : '',
      hasDietaryCare
        ? '🌱 *Culinary Note*: Dedicated Sattvic & Jain kitchen counters are arranged with the highest care for our guests.\n'
        : '',
      'Your presence and blessings will make our celebration truly memorable.',
      '',
      '👉 *Kindly confirm your RSVP with your dietary preferences at your earliest convenience.*',
      '',
      'Warm Regards,',
      'The Host Family',
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  if (style === 'modern') {
    return [
      '🎉 *Save the Date & Join the Celebration!* 🎉',
      '',
      `We can't wait to celebrate with you at:`,
      `✨ *${plan.title}* ✨`,
      '',
      `📅 *When*: ${formattedDate}`,
      `📍 *Where*: ${venue}`,
      plan.theme ? `✨ *Dress Code / Theme*: ${plan.theme}` : '',
      '',
      scheduleHighlights ? `⏰ *Schedule Highlights*:\n${scheduleHighlights}\n` : '',
      '🍲 *Food & Drinks*: Delicious royal banquet with live chaat, tandoor, and specialty dessert counters.',
      hasDietaryCare ? '✓ Dedicated Pure Veg & Jain counters available.' : '',
      '',
      'Please let us know if you can make it and if you are bringing a +1!',
      '👉 Reply to this message to confirm your RSVP.',
      '',
      'Looking forward to dancing and celebrating together! 🥂',
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  // Reminder Style
  return [
    `🔔 *Gentle RSVP Reminder: ${plan.title}*`,
    '',
    `Dear Guest,`,
    `We are putting together the final guest list, seating arrangements, and banquet counts for *${plan.title}* taking place on *${formattedDate}* in ${city}.`,
    '',
    `Please take a moment to confirm:`,
    `1️⃣ Attending (Yes / No)`,
    `2️⃣ Number of Guests attending (including +1s)`,
    `3️⃣ Special Dietary Requirements (Jain / Pure Veg / Allergies)`,
    '',
    `Your prompt response helps us ensure seamless hospitality for everyone. Thank you! 🙏`,
  ].join('\n');
}

/**
 * Escapes fields for standard RFC 4180 CSV export.
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 compliant CSV string representing the event budget.
 * Includes line items, actuals, variances, payment status, and totals.
 */
export function generateBudgetCsv(plan: EventPlan, budgetSummary: BudgetSummary): string {
  if (!plan) return '';
  const headers = [
    'Category',
    'Expense Item',
    'Estimated (₹)',
    'Actual (₹)',
    'Variance (₹)',
    'Status',
    'Payment Status',
    'Scale',
    'Notes',
  ].map((h) => escapeCsv(h));

  const items = plan.budgetItems || (plan as unknown as { budget?: typeof plan.budgetItems }).budget || [];

  const rows = items.map((item) => {
    const hasActual = item.actualCost !== undefined;
    const variance = hasActual ? item.actualCost! - item.estimatedCost : 0;
    const status = !hasActual ? 'Estimated' : variance <= 0 ? 'On Budget' : 'Over Budget';
    const payment = item.isPaid ? 'Paid' : 'Invoiced';
    const scale = item.isPerGuest ? 'Per-Guest' : 'Fixed';

    return [
      escapeCsv(item.category.toUpperCase()),
      escapeCsv(item.name),
      escapeCsv(item.estimatedCost),
      escapeCsv(hasActual ? item.actualCost : ''),
      escapeCsv(hasActual ? variance : 0),
      escapeCsv(status),
      escapeCsv(payment),
      escapeCsv(scale),
      escapeCsv(item.notes || ''),
    ].join(',');
  });

  // Calculate actual sum
  const totalActual = items.reduce((acc, i) => acc + (i.actualCost || 0), 0);
  const totalVariance = totalActual > 0 ? totalActual - budgetSummary.totalEstimated : 0;

  // Add Summary and Footer Rows
  const footerRows = [
    '',
    [
      escapeCsv('SUMMARY'),
      escapeCsv('Total Estimated Budget'),
      escapeCsv(budgetSummary.totalEstimated),
      escapeCsv(totalActual > 0 ? totalActual : 'N/A'),
      escapeCsv(totalVariance),
      escapeCsv(budgetSummary.isOverBudget ? 'OVER BUDGET' : 'ON TRACK'),
      '',
      '',
      '',
    ].join(','),
    [
      escapeCsv('CONTINGENCY'),
      escapeCsv(`Contingency Reserve (${Math.round((plan.contingencyRate || 0.1) * 100)}%)`),
      escapeCsv(budgetSummary.contingencyAmount),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv('Active Buffer'),
      '',
      '',
      '',
    ].join(','),
    [
      escapeCsv('PER GUEST'),
      escapeCsv(`Per-Guest Cost (${plan.guestCount} Guests)`),
      escapeCsv(budgetSummary.perGuestCost),
      escapeCsv(''),
      escapeCsv(''),
      escapeCsv(''),
      '',
      '',
      '',
    ].join(','),
  ];

  return [headers.join(','), ...rows, ...footerRows].join('\r\n');
}

/**
 * Triggers a browser file download of CSV content with UTF-8 BOM.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // UTF-8 BOM (\uFEFF) ensures proper rendering of ₹ and special characters in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
