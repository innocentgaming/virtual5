import type { EventPlan } from '../types/event';

/**
 * Formats a Date object or YYYY-MM-DD string into iCalendar date string: YYYYMMDD
 */
function formatIcsDate(dateStr: string): string {
  return dateStr.replace(/[^0-9]/g, '').slice(0, 8);
}

/**
 * Cleans string for safe iCalendar text formatting.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content for the event plan.
 * Includes milestones, tasks, and day-of schedule events.
 */
export function generateIcsCalendar(plan: EventPlan): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const eventDateFormatted = formatIcsDate(plan.eventDate);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventWise AI//Event Planning Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(plan.title)} Schedule`,
  ];

  // Main Event Entry
  lines.push(
    'BEGIN:VEVENT',
    `UID:evt-main-${plan.id}@eventwise.ai`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART;VALUE=DATE:${eventDateFormatted}`,
    `DTEND;VALUE=DATE:${eventDateFormatted}`,
    `SUMMARY:★ ${escapeIcsText(plan.title)}`,
    `DESCRIPTION:${escapeIcsText(`EventWise AI Plan: ${plan.eventType.toUpperCase()} for ${plan.guestCount} guests in ${plan.city}. Theme: ${plan.theme}`)}`,
    `LOCATION:${escapeIcsText(plan.city)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event Day is Today!',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT'
  );

  // Timeline Tasks as Calendar Milestones
  plan.tasks.forEach((task) => {
    const taskDate = formatIcsDate(task.dueDate);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${task.id}@eventwise.ai`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${taskDate}`,
      `DTEND;VALUE=DATE:${taskDate}`,
      `SUMMARY:[${task.category.toUpperCase()}] ${escapeIcsText(task.title)}`,
      `DESCRIPTION:${escapeIcsText(`Priority: ${task.priority.toUpperCase()}${task.notes ? `\\nNotes: ${task.notes}` : ''}`)}`,
      task.completed ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeIcsText(task.title)} is due tomorrow`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  // Day-of Run of Show schedule items if available
  if (plan.schedule && plan.schedule.length > 0) {
    plan.schedule.forEach((item, idx) => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:sched-${item.id || idx}@eventwise.ai`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${eventDateFormatted}`,
        `DTEND;VALUE=DATE:${eventDateFormatted}`,
        `SUMMARY:[Day-of] ${escapeIcsText(item.time)} - ${escapeIcsText(item.activity)}`,
        `DESCRIPTION:${escapeIcsText(`Location: ${item.location}\\nCoordinator/Role: ${item.responsibleRole}${item.notes ? `\\nNotes: ${item.notes}` : ''}`)}`,
        `LOCATION:${escapeIcsText(item.location)}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file.
 */
export function downloadEventCalendar(plan: EventPlan): void {
  const icsData = generateIcsCalendar(plan);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventwise-${plan.eventType}-${plan.id}-schedule.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
