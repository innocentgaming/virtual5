import { createContext } from 'react';
import type { AuthUser, UserRole } from '../types/auth';

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (persona: 'planner' | 'host' | 'cohost') => void;
  register: (data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    organization?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
