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

/** Where the server keeps accounts. `memory` is volatile: accounts vanish whenever the server restarts. */
export type StorageKind = 'redis' | 'file' | 'memory';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthResult {
  ok: boolean;
  error?: string;
  devResetLink?: string;
}
