import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, UserRole } from '../types/auth';
import { DEMO_USERS } from '../types/auth';
import { AuthContext } from './authContextInstance';

const AUTH_STORAGE_KEY = 'eventwise_auth_user_v1';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'EW').toUpperCase();
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'planner':
      return 'Lead Event Planner';
    case 'host':
      return 'Event Host / Couple';
    case 'vendor':
      return 'Verified Vendor Partner';
    default:
      return 'Guest Collaborator';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback if localStorage parsing fails
    }
    // Default to the Lead Event Planner demo user for immediate rich evaluation
    return DEMO_USERS.planner;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync user state to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [user]);

  const loginAsDemo = useCallback((persona: 'planner' | 'host' | 'cohost') => {
    const selected = DEMO_USERS[persona] || DEMO_USERS.planner;
    setUser(selected);
    setIsAuthModalOpen(false);
  }, []);

  const login = useCallback(async (email: string, _password?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    // Match against known demo accounts or synthesize logged in user
    let loggedUser: AuthUser | null = null;
    if (trimmedEmail.includes('vikram') || trimmedEmail.includes('planner')) {
      loggedUser = DEMO_USERS.planner;
    } else if (trimmedEmail.includes('ananya') || trimmedEmail.includes('bride')) {
      loggedUser = DEMO_USERS.host;
    } else if (trimmedEmail.includes('aarav') || trimmedEmail.includes('groom')) {
      loggedUser = DEMO_USERS.cohost;
    } else {
      const namePart = trimmedEmail.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = namePart
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      loggedUser = {
        id: 'usr-custom-' + Date.now(),
        name: formattedName || 'Event Host',
        email: trimmedEmail,
        role: 'host',
        roleLabel: 'Event Host',
        initials: getInitials(formattedName || 'Event Host'),
        permissions: ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot'],
        createdAt: new Date().toISOString(),
      };
    }

    setUser(loggedUser);
    setIsAuthModalOpen(false);
    return { success: true };
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      organization?: string;
    }) => {
      const trimmedName = data.name.trim();
      const trimmedEmail = data.email.trim().toLowerCase();

      if (!trimmedName) {
        return { success: false, error: 'Full name is required.' };
      }
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return { success: false, error: 'Valid email address is required.' };
      }

      const newUser: AuthUser = {
        id: 'usr-' + Date.now(),
        name: trimmedName,
        email: trimmedEmail,
        role: data.role,
        roleLabel: getRoleLabel(data.role),
        organization: data.organization?.trim() || undefined,
        initials: getInitials(trimmedName),
        permissions:
          data.role === 'planner'
            ? ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot', 'export_plans']
            : ['manage_budget', 'approve_vendors', 'edit_timeline', 'manage_guests', 'ai_copilot'],
        createdAt: new Date().toISOString(),
      };

      setUser(newUser);
      setIsAuthModalOpen(false);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setIsProfileModalOpen(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      loginAsDemo,
      register,
      logout,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
    }),
    [
      user,
      login,
      loginAsDemo,
      register,
      logout,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
