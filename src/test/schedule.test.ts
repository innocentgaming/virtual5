import { describe, it, expect } from 'vitest';
import type { ScheduleItem, EventPlan } from '../types/event';
import { generateIcsCalendar } from '../services/calendarService';
import { INITIAL_EVENTS } from '../data/sampleEvents';

describe('Run of Show & iCalendar (.ics) Service Tests', () => {
  const sampleSchedule: ScheduleItem[] = [
    {
      id: 'sch-1',
      time: '09:00 AM',
      endTime: '11:00 AM',
      activity: 'Venue Setup & Floral Delivery',
      location: 'Grand Ballroom',
      responsibleRole: 'Lead Florist & Coordinator',
      notes: 'Check centerpieces and arbor installation.',
    },
    {
      id: 'sch-2',
      time: '04:00 PM',
      endTime: '04:45 PM',
      activity: 'Wedding Ceremony',
      location: 'Garden Pavilion',
      responsibleRole: 'Officiant & Wedding Party',
    },
    {
      id: 'sch-3',
      time: '06:00 PM',
      endTime: '10:00 PM',
      activity: 'Dinner & Reception',
      location: 'Grand Ballroom',
      responsibleRole: 'Catering Captain & DJ',
      notes: 'Speeches begin at 07:15 PM.',
    },
  ];

  it('generates an RFC 5545 compliant iCalendar string', () => {
    const testPlan: EventPlan = {
      ...INITIAL_EVENTS[0],
      schedule: sampleSchedule,
    };

    const ics = generateIcsCalendar(testPlan);

    // Header & footer validation
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//EventWise AI//Event Planning Assistant//EN');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toContain('END:VCALENDAR');

    // Check inclusion of day-of schedule blocks
    expect(ics).toContain('SUMMARY:[Day-of] 09:00 AM - Venue Setup & Floral Delivery');
    expect(ics).toContain('LOCATION:Grand Ballroom');
    expect(ics).toContain('SUMMARY:[Day-of] 04:00 PM - Wedding Ceremony');
    expect(ics).toContain('LOCATION:Garden Pavilion');
    expect(ics).toContain('SUMMARY:[Day-of] 06:00 PM - Dinner & Reception');

    // Check inclusion of timeline task milestones with reminders
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('ACTION:DISPLAY');
  });

  it('handles events without schedule items gracefully', () => {
    const testPlan: EventPlan = {
      ...INITIAL_EVENTS[0],
      schedule: undefined,
    };

    const ics = generateIcsCalendar(testPlan);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    // Still includes timeline tasks
    expect(ics).toContain('BEGIN:VEVENT');
  });

  it('escapes special characters in calendar event fields', () => {
    const specialSchedule: ScheduleItem[] = [
      {
        id: 'sch-special',
        time: '02:00 PM',
        endTime: '03:00 PM',
        activity: 'Tasting & Toasting, Plus Notes; Here',
        location: 'Wine Cellar, Napa',
        responsibleRole: 'Sommelier & Host',
        notes: 'Line 1\nLine 2 with comma, and semicolon; finish.',
      },
    ];

    const testPlan: EventPlan = {
      ...INITIAL_EVENTS[0],
      schedule: specialSchedule,
    };

    const ics = generateIcsCalendar(testPlan);

    expect(ics).toContain('SUMMARY:[Day-of] 02:00 PM - Tasting & Toasting\\, Plus Notes\\; Here');
    expect(ics).toContain('LOCATION:Wine Cellar\\, Napa');
    expect(ics).toContain('Line 1\\nLine 2 with comma\\, and semicolon\\; finish.');
  });
});
