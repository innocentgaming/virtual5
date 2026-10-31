import type { Role, UserRecord } from './store.js';

export const ROLES: readonly Role[] = ['planner', 'host', 'vendor'];

const ROLE_LABELS: Record<Role, string> = {
  planner: 'Lead Event Planner',
  host: 'Event Host / Couple',
  vendor: 'Verified Vendor Partner',
};

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwertyuiop', 'qwerty123',
  'iloveyou', 'admin123', 'welcome1', 'welcome123', 'letmein123', 'abc12345', 'india123', 'password@123',
  'eventwise', 'eventwise123', 'changeme', 'passw0rd', '11111111', '00000000',
]);

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.trim().slice(0, 2) || 'EW').toUpperCase();
}

export function permissionsFor(role: Role, isAdmin = false): string[] {
  const base = ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot'];
  const list = role === 'planner' ? [...base, 'export_plans'] : base;
  return isAdmin ? [...list, 'admin'] : list;
}

/** Emails listed in ADMIN_EMAILS (comma separated) are always administrators – a recovery / bootstrap path. */
export function isBootstrapAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function toPublicUser(u: UserRecord) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role],
    organization: u.organization,
    initials: initialsOf(u.name),
    permissions: permissionsFor(u.role, u.isAdmin === true),
    createdAt: u.createdAt,
    isAdmin: u.isAdmin === true,
  };
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validateName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

export function validateOrganization(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const org = value.replace(/\s+/g, ' ').trim().slice(0, 120);
  return org || undefined;
}

/** Returns an error message, or null when the password is acceptable. */
export function checkPasswordPolicy(password: unknown, email?: string): string | null {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'That password is too common. Please choose a less predictable one.';
  if (email && password.toLowerCase() === email.toLowerCase()) return 'Password must not be the same as your email.';
  if (/^(.)\1+$/.test(password)) return 'Password must not be a single repeated character.';
  return null;
}
