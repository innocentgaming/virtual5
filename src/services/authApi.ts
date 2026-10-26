import type { AuthUser, UserRole } from '../types/auth';
import type { EventPlan } from '../types/event';

export interface RemoteEventsDoc {
  events: EventPlan[];
  activeId: string | null;
  updatedAt: number;
}

export type ApiResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code?: string; status?: number; [key: string]: unknown };

async function req<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const res = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      /* non-json body */
    }
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
        code: typeof data.code === 'string' ? data.code : undefined,
        status: res.status,
        ...data,
      };
    }
    return { ok: true, ...(data as unknown as T) };
  } catch {
    return { ok: false, error: 'Network connection issue. Please check your internet.', code: 'network' };
  }
}

export const authApi = {
  me: () => req<{ user: AuthUser | null }>('/api/auth/me'),
  login: (data: { email: string; password: string; remember?: boolean }) =>
    req<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  signup: (data: { name: string; email: string; password: string; role: UserRole; organization?: string; acceptTerms: boolean }) =>
    req<{ user: AuthUser }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  logout: (everywhere = false) =>
    req<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ everywhere }) }),
  forgotPassword: (email: string) =>
    req<{ ok: boolean; devResetLink?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    req<{ ok: boolean }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  updateProfile: (data: { name?: string; organization?: string; role?: UserRole }) =>
    req<{ user: AuthUser }>('/api/auth/update-profile', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: boolean }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteAccount: (password: string) =>
    req<{ ok: boolean }>('/api/auth/delete-account', { method: 'POST', body: JSON.stringify({ password }) }),
};

export const eventsApi = {
  load: () => req<RemoteEventsDoc>('/api/events'),
  save: (data: { events: EventPlan[]; activeId: string | null; baseUpdatedAt: number | null; force?: boolean }) =>
    req<{ updatedAt: number }>('/api/events', { method: 'PUT', body: JSON.stringify(data) }),
};
