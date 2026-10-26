import { createContext } from 'react';
import type { AuthResult, AuthStatus, AuthUser, UserRole } from '../types/auth';

export interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
    acceptTerms: boolean;
  }) => Promise<AuthResult>;
  logout: (everywhere?: boolean) => Promise<void>;
  forgotPassword: (email: string) => Promise<AuthResult & { devResetLink?: string }>;
  resetPassword: (token: string, password: string) => Promise<AuthResult>;
  updateProfile: (data: { name?: string; organization?: string; role?: UserRole }) => Promise<AuthResult>;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  deleteAccount: (password: string) => Promise<AuthResult>;
  /** Re-check the session (e.g. after the server reports 401). */
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
