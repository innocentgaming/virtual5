import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthResult, AuthStatus, AuthUser } from '../types/auth';
import { authApi } from '../services/authApi';
import { clearAllStorageData } from '../services/storageService';
import { AuthContext, type AuthContextType } from './authContextInstance';

function toResult(r: { ok: boolean; error?: string }): AuthResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Request failed.' };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    const res = await authApi.me();
    if (res.ok) {
      setUser(res.user);
      setStatus(res.user ? 'authenticated' : 'anonymous');
    } else if (res.code === 'network') {
      // Offline: keep whatever we already know instead of signing the person out.
      setStatus((s) => (s === 'loading' ? 'anonymous' : s));
    } else {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void authApi.me().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setUser(res.user);
        setStatus(res.user ? 'authenticated' : 'anonymous');
      } else {
        setStatus('anonymous');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login: AuthContextType['login'] = useCallback(async (email, password, remember) => {
    const res = await authApi.login({ email, password, remember });
    if (res.ok) {
      setUser(res.user);
      setStatus('authenticated');
    }
    return toResult(res);
  }, []);

  const signup: AuthContextType['signup'] = useCallback(async (data) => {
    const res = await authApi.signup(data);
    if (res.ok) {
      setUser(res.user);
      setStatus('authenticated');
    }
    return toResult(res);
  }, []);

  const wipeLocal = useCallback(() => {
    // Shared computers: never leave one person's plans behind for the next visitor.
    clearAllStorageData();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const logout: AuthContextType['logout'] = useCallback(
    async (everywhere = false) => {
      await authApi.logout(everywhere);
      wipeLocal();
    },
    [wipeLocal]
  );

  const forgotPassword: AuthContextType['forgotPassword'] = useCallback(async (email) => {
    const res = await authApi.forgotPassword(email);
    return res.ok ? { ok: true, devResetLink: res.devResetLink } : { ok: false, error: res.error };
  }, []);

  const resetPassword: AuthContextType['resetPassword'] = useCallback(
    async (token, password) => toResult(await authApi.resetPassword(token, password)),
    []
  );

  const updateProfile: AuthContextType['updateProfile'] = useCallback(async (data) => {
    const res = await authApi.updateProfile(data);
    if (res.ok) setUser(res.user);
    return toResult(res);
  }, []);

  const changePassword: AuthContextType['changePassword'] = useCallback(
    async (current, next) => toResult(await authApi.changePassword(current, next)),
    []
  );

  const deleteAccount: AuthContextType['deleteAccount'] = useCallback(
    async (password) => {
      const res = await authApi.deleteAccount(password);
      if (res.ok) wipeLocal();
      return toResult(res);
    },
    [wipeLocal]
  );

  const value = useMemo<AuthContextType>(
    () => ({ user, status, login, signup, logout, forgotPassword, resetPassword, updateProfile, changePassword, deleteAccount, refresh }),
    [user, status, login, signup, logout, forgotPassword, resetPassword, updateProfile, changePassword, deleteAccount, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
