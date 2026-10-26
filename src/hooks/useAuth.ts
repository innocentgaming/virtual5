import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/authContextInstance';
import { DEMO_USERS } from '../types/auth';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: DEMO_USERS.planner,
      isAuthenticated: true,
      login: async () => ({ success: true }),
      loginAsDemo: () => {},
      register: async () => ({ success: true }),
      logout: () => {},
      isAuthModalOpen: false,
      authModalMode: 'login',
      openAuthModal: () => {},
      closeAuthModal: () => {},
      isProfileModalOpen: false,
      openProfileModal: () => {},
      closeProfileModal: () => {},
    };
  }
  return context;
};
