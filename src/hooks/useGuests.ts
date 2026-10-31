import { useCallback } from 'react';
import type { EventPlan, GuestItem } from '../types/event';

export function useGuests(
  activeEvent: EventPlan | undefined,
  updateEvent: (updated: EventPlan) => void
) {
  const addGuest = useCallback(
    (guest: Omit<GuestItem, 'id'>) => {
      if (!activeEvent) return;
      const newGuest: GuestItem = {
        ...guest,
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      updateEvent({
        ...activeEvent,
        guests: [...(activeEvent.guests || []), newGuest],
      });
    },
    [activeEvent, updateEvent]
  );

  const updateGuest = useCallback(
    (guest: GuestItem) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        guests: (activeEvent.guests || []).map((g) => (g.id === guest.id ? guest : g)),
      });
    },
    [activeEvent, updateEvent]
  );

  const deleteGuest = useCallback(
    (id: string) => {
      if (!activeEvent) return;
      updateEvent({
        ...activeEvent,
        guests: (activeEvent.guests || []).filter((g) => g.id !== id),
      });
    },
    [activeEvent, updateEvent]
  );

  return {
    addGuest,
    updateGuest,
    deleteGuest,
  };
}

