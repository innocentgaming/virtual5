import { describe, it, expect } from 'vitest';
import type { GuestItem, EventPlan } from '../types/event';
import { evaluateDecisionRules } from '../services/decisionEngine';
import { INITIAL_EVENTS } from '../data/sampleEvents';

describe('Guest List & RSVP Management Tests', () => {
  const sampleGuests: GuestItem[] = [
    {
      id: 'g-1',
      name: 'Eleanor Vance',
      email: 'eleanor@example.com',
      rsvpStatus: 'attending',
      dietary: 'vegetarian',
      plusOne: true,
      plusOneName: 'Theodora',
      tableAssignment: 'Table 1',
    },
    {
      id: 'g-2',
      name: 'Luke Sanderson',
      email: 'luke@example.com',
      rsvpStatus: 'attending',
      dietary: 'gluten_free',
      plusOne: false,
    },
    {
      id: 'g-3',
      name: 'Nell Crain',
      email: 'nell@example.com',
      rsvpStatus: 'pending',
      dietary: 'none',
      plusOne: false,
    },
    {
      id: 'g-4',
      name: 'Steven Crain',
      email: 'steven@example.com',
      rsvpStatus: 'declined',
      dietary: 'none',
      plusOne: false,
    },
    {
      id: 'g-5',
      name: 'Shirley Crain',
      email: 'shirley@example.com',
      rsvpStatus: 'attending',
      dietary: 'nut_allergy',
      plusOne: true,
      plusOneName: 'Kevin',
    },
  ];

  it('correctly tallies RSVP counts including confirmed plus-ones', () => {
    const attendingGuests = sampleGuests.filter((g) => g.rsvpStatus === 'attending');
    const totalAttendingHeads = attendingGuests.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0);
    const declinedCount = sampleGuests.filter((g) => g.rsvpStatus === 'declined').length;
    const pendingCount = sampleGuests.filter((g) => g.rsvpStatus === 'pending').length;

    expect(attendingGuests.length).toBe(3);
    // Eleanor (1+1) + Luke (1+0) + Shirley (1+1) = 5
    expect(totalAttendingHeads).toBe(5);
    expect(declinedCount).toBe(1);
    expect(pendingCount).toBe(1);
  });

  it('identifies and tallies dietary restrictions for catering briefing', () => {
    const dietaryCounts = sampleGuests.reduce(
      (acc, guest) => {
        if (guest.rsvpStatus === 'attending' && guest.dietary !== 'none') {
          acc[guest.dietary] = (acc[guest.dietary] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    expect(dietaryCounts['vegetarian']).toBe(1);
    expect(dietaryCounts['gluten_free']).toBe(1);
    expect(dietaryCounts['nut_allergy']).toBe(1);
    expect(dietaryCounts['halal']).toBeUndefined();
  });

  it('triggers capacity exceeded decision rule when confirmed RSVPs surpass guest target', () => {
    const baseWedding: EventPlan = {
      ...INITIAL_EVENTS[0],
      guestCount: 3, // Low target of 3 guests
      guests: sampleGuests, // 5 attending heads
    };

    const { insights } = evaluateDecisionRules(baseWedding);
    const capacityRule = insights.find((r) => r.id === 'rule-rsvp-capacity-exceeded');

    expect(capacityRule).toBeDefined();
    expect(capacityRule?.type).toBe('warning');
    expect(capacityRule?.title).toContain('RSVP Headcount Exceeds Planned Capacity');
    expect(capacityRule?.message).toContain('5 confirmed attendees');
  });

  it('triggers dietary alert decision rule when guests report food restrictions', () => {
    const baseWedding: EventPlan = {
      ...INITIAL_EVENTS[0],
      guests: sampleGuests,
    };

    const { insights } = evaluateDecisionRules(baseWedding);
    const dietaryRule = insights.find((r) => r.id === 'rule-dietary-alert');

    expect(dietaryRule).toBeDefined();
    expect(dietaryRule?.type).toBe('suggestion');
    expect(dietaryRule?.title).toContain('Special Dietary Requirements Noted');
    expect(dietaryRule?.message).toContain('3 confirmed guests');
  });

  it('does not trigger capacity alert when RSVPs are safely within venue count', () => {
    const baseWedding: EventPlan = {
      ...INITIAL_EVENTS[0],
      guestCount: 150,
      guests: sampleGuests,
    };

    const { insights } = evaluateDecisionRules(baseWedding);
    const capacityRule = insights.find((r) => r.id === 'rule-rsvp-capacity-exceeded');

    expect(capacityRule).toBeUndefined();
  });
});
