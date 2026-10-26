export type UserRole = 'planner' | 'host' | 'vendor';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  organization?: string;
  initials: string;
  permissions: string[];
  createdAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthResult {
  ok: boolean;
  error?: string;
  devResetLink?: string;
}
