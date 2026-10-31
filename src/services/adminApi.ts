import { apiRequest } from './authApi';
import type { UserRole } from '../types/auth';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string | null;
  isAdmin: boolean;
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  eventCount?: number;
}

export interface AdminStats {
  storage: 'redis' | 'file' | 'memory';
  generatedAt: string;
  totals: {
    users: number;
    admins: number;
    disabled: number;
    events: number;
    usersWithEvents: number;
    new7: number;
    new30: number;
    active30: number;
    failedLogins24h: number;
  };
  byRole: Record<UserRole, number>;
  signupsByDay: { date: string; count: number }[];
  truncated: boolean;
}

export interface AuditRow {
  id: string;
  at: string;
  type: string;
  actorEmail?: string;
  targetEmail?: string;
  ip?: string;
  detail?: string;
}

const post = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const adminApi = {
  stats: () => apiRequest<AdminStats>('/api/admin/stats'),
  users: (p: { q?: string; page?: number; filter?: string }) => {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.page) qs.set('page', String(p.page));
    if (p.filter) qs.set('filter', p.filter);
    return apiRequest<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }>(`/api/admin/users?${qs}`);
  },
  activity: (type?: string) => apiRequest<{ entries: AuditRow[] }>(`/api/admin/activity?limit=200${type ? `&type=${encodeURIComponent(type)}` : ''}`),
  updateUser: (id: string, patch: { role?: UserRole; isAdmin?: boolean; disabled?: boolean }) =>
    post<{ user: AdminUserRow }>('/api/admin/user-update', { id, ...patch }),
  revokeSessions: (id: string) => post<{ ok: boolean }>('/api/admin/user-revoke', { id }),
  deleteUser: (id: string, confirmEmail: string) => post<{ ok: boolean }>('/api/admin/user-delete', { id, confirmEmail }),
  /** Downloads the full backup as a JSON file in the browser. */
  async downloadBackup(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch('/api/admin/backup', { credentials: 'same-origin' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: data.error ?? `Backup failed (${res.status})` };
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'eventwise-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network connection issue. Please check your internet.' };
    }
  },
};