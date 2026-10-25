import type { EventPlan } from '../types/event';
import { stripControlChars } from '../utils/validators';

/**
 * Formats a Date object or YYYY-MM-DD string into iCalendar date string: YYYYMMDD
 */
function formatIcsDate(dateStr: string): string {
  const digits = dateStr.replace(/[^0-9]/g, '');
  return digits.slice(0, 8) || '20261120';
}

/**
 * Cleans and escapes string for safe RFC 5545 iCalendar text formatting.
 * - Escapes backslash (\), semicolon (;), and comma (,).
 * - Converts newlines to literal \n.
 * - Strips all raw CR (\r) and non-printable control characters to prevent CRLF injection.
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  // 1. Strip raw CR and non-printable control characters
  const sanitized = stripControlChars(text.replace(/\r/g, ''));
  // 2. Escape special RFC 5545 characters
  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds a single iCalendar contentline to 75 octets per RFC 5545 Section 3.1.
 * Continuation lines begin with a single space.
 */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  let result = line.slice(0, 75);
  let i = 75;
  while (i < line.length) {
    result += '\r\n ' + line.slice(i, i + 74);
    i += 74;
  }
  return result;
}

/**
 * Cleans an identifier into a safe token containing only [a-zA-Z0-9_-].
 */
function toSafeToken(id: unknown): string {
  const token = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return token.slice(0, 48) || 'item';
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content for the event plan.
 * Guarantees CRLF line breaks, 75-octet line folding, escaped text properties,
 * safe UIDs, and static VALARM definitions.
 */
export function generateIcsCalendar(plan: EventPlan): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const eventDateFormatted = formatIcsDate(plan.eventDate);
  const safeEventId = toSafeToken(plan.id);

  const rawLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventWise AI//Event Planning Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(plan.title)} Schedule`,
  ];

  // Main Event Entry
  rawLines.push(
    'BEGIN:VEVENT',
    `UID:evt-main-${safeEventId}@eventwise.ai`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART;VALUE=DATE:${eventDateFormatted}`,
    `DTEND;VALUE=DATE:${eventDateFormatted}`,
    `SUMMARY:★ ${escapeIcsText(plan.title)}`,
    `DESCRIPTION:${escapeIcsText(`EventWise AI Plan: ${plan.eventType.toUpperCase()} for ${plan.guestCount} guests in ${plan.city}. Theme: ${plan.theme}`)}`,
    `LOCATION:${escapeIcsText(plan.city)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event Day Reminder',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT'
  );

  // Timeline Tasks as Calendar Milestones
  plan.tasks.forEach((task, idx) => {
    const taskDate = formatIcsDate(task.dueDate);
    const safeTaskId = toSafeToken(task.id || idx);
    rawLines.push(
      'BEGIN:VEVENT',
      `UID:task-${safeTaskId}@eventwise.ai`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${taskDate}`,
      `DTEND;VALUE=DATE:${taskDate}`,
      `SUMMARY:[${task.category.toUpperCase()}] ${escapeIcsText(task.title)}`,
      `DESCRIPTION:${escapeIcsText(`Priority: ${task.priority.toUpperCase()}${task.notes ? ` | Notes: ${task.notes}` : ''}`)}`,
      task.completed ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Task Milestone Reminder',
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  // Day-of Run of Show schedule items if available
  if (plan.schedule && plan.schedule.length > 0) {
    plan.schedule.forEach((item, idx) => {
      const safeSchedId = toSafeToken(item.id || idx);
      rawLines.push(
        'BEGIN:VEVENT',
        `UID:sched-${safeSchedId}@eventwise.ai`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${eventDateFormatted}`,
        `DTEND;VALUE=DATE:${eventDateFormatted}`,
        `SUMMARY:[Day-of] ${escapeIcsText(item.time)} - ${escapeIcsText(item.activity)}`,
        `DESCRIPTION:${escapeIcsText(`Location: ${item.location} | Role: ${item.responsibleRole}${item.notes ? ` | Notes: ${item.notes}` : ''}`)}`,
        `LOCATION:${escapeIcsText(item.location)}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  }

  rawLines.push('END:VCALENDAR');

  // Apply RFC 5545 line folding (75 octets) and CRLF line endings
  return rawLines.map(foldIcsLine).join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file with sanitized filename.
 */
export function downloadEventCalendar(plan: EventPlan): void {
  const icsData = generateIcsCalendar(plan);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Strict filename sanitization
  const safeType = plan.eventType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const safeId = toSafeToken(plan.id);
  a.download = `eventwise-${safeType}-${safeId}-schedule.ics`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
