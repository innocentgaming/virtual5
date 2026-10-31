import { apiRequest } from './authApi';

export type RsvpDiet = 'veg' | 'jain' | 'nonveg';

export interface RsvpAnswer {
  id: string;
  name: string;
  email?: string;
  attending: boolean;
  guests: number;
  diet: RsvpDiet;
  note?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface RsvpInfo {
  title: string;
  date: string | null;
  venue: string | null;
  hosts: string | null;
  closed: boolean;
}

const post = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const rsvpApi = {
  createLink: (data: { eventId: string; title: string; date?: string; venue?: string; hosts?: string }) =>
    post<{ token: string; closed: boolean }>('/api/rsvp/create-link', data),
  lookup: (eventId: string) => apiRequest<{ token: string | null; closed: boolean }>(`/api/rsvp/lookup?eventId=${encodeURIComponent(eventId)}`),
  responses: (token: string) => apiRequest<{ responses: RsvpAnswer[] }>(`/api/rsvp/responses?token=${encodeURIComponent(token)}`),
  setClosed: (token: string, closed: boolean) => post<{ ok: boolean; closed: boolean }>('/api/rsvp/set-closed', { token, closed }),
  info: (token: string) => apiRequest<RsvpInfo>(`/api/rsvp/info?token=${encodeURIComponent(token)}`),
  submit: (data: { token: string; name: string; email?: string; attending: boolean; guests: number; diet: RsvpDiet; note?: string; website?: string }) =>
    post<{ ok: boolean; updated?: boolean }>('/api/rsvp/submit', data),
};

/**
 * Generates the full public RSVP URL for guest invitation distribution.
 *
 * @param token - Unique public RSVP slug / token
 * @returns Fully qualified URL (e.g. 'https://domain.com/rsvp/abc-123')
 */
export function rsvpUrlFor(token: string): string {
  return `${window.location.origin}/rsvp/${token}`;
}