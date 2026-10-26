export type UserRole = 'planner' | 'host' | 'vendor' | 'guest';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  organization?: string;
  avatarUrl?: string;
  initials: string;
  permissions: string[];
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export const DEMO_USERS: Record<'planner' | 'host' | 'cohost', AuthUser> = {
  planner: {
    id: 'usr-planner-vikram',
    name: 'Vikram Malhotra',
    email: 'vikram@eventwise.ai',
    role: 'planner',
    roleLabel: 'Lead Event Planner',
    organization: 'Royal Rajasthan Weddings & Co.',
    initials: 'VM',
    permissions: ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot', 'export_plans'],
    createdAt: '2026-01-15T10:00:00Z',
  },
  host: {
    id: 'usr-host-ananya',
    name: 'Ananya Sharma',
    email: 'ananya@wedding.in',
    role: 'host',
    roleLabel: 'Host / Bride',
    organization: "Aarav & Ananya's Vivah",
    initials: 'AS',
    permissions: ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot'],
    createdAt: '2026-02-01T14:30:00Z',
  },
  cohost: {
    id: 'usr-cohost-aarav',
    name: 'Aarav Rathore',
    email: 'aarav@rathore.in',
    role: 'host',
    roleLabel: 'Co-Host / Groom',
    organization: "Aarav & Ananya's Vivah",
    initials: 'AR',
    permissions: ['view_budget', 'approve_vendors', 'manage_guests', 'ai_copilot'],
    createdAt: '2026-02-01T14:35:00Z',
  },
};
