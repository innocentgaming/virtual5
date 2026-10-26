import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import {
  Lock,
  Mail,
  User,
  Building,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { UserRole } from '../../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('planner');
  const [regOrg, setRegOrg] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        onSuccess?.(`Welcome back! Logged in as ${loginEmail}.`);
        onClose();
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch {
      setError('An error occurred during sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        organization: regOrg,
      });

      if (res.success) {
        onSuccess?.(`Account created successfully! Welcome, ${regName}.`);
        onClose();
      } else {
        setError(res.error || 'Could not create account.');
      }
    } catch {
      setError('Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = (persona: 'planner' | 'host' | 'cohost') => {
    loginAsDemo(persona);
    const label =
      persona === 'planner'
        ? 'Vikram Malhotra (Lead Planner)'
        : persona === 'host'
        ? 'Ananya Sharma (Bride / Host)'
        : 'Aarav Rathore (Co-host)';
    onSuccess?.(`Signed in as ${label}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={16} />
          </div>
          <span>{mode === 'login' ? 'Sign In to EventWise AI' : 'Create Free Account'}</span>
        </div>
      }
      subtitle="Access personalized Indian event plans, collaborative budgeting, and AI Copilot"
      size="md"
      ariaLabel={mode === 'login' ? 'Sign In Modal' : 'Create Account Modal'}
    >
      {/* Tab Switcher */}
      <div
        role="tablist"
        aria-label="Authentication Options"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-4)',
          gap: 'var(--space-2)',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          style={{
            flex: 1,
            padding: 'var(--space-2) var(--space-4)',
            background: 'transparent',
            border: 'none',
            borderBottom: mode === 'login' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: mode === 'login' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          style={{
            flex: 1,
            padding: 'var(--space-2) var(--space-4)',
            background: 'transparent',
            border: 'none',
            borderBottom: mode === 'register' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: mode === 'register' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          Create Account
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* 1-Click Demo Personas for Quick Evaluation */}
      <div
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={14} color="var(--accent-primary)" />
          <span>Hackathon Evaluator 1-Click Demo Accounts:</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => handleDemoClick('planner')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>
              Vikram Malhotra
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
              ★ Lead Pro Planner
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick('host')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>
              Ananya Sharma
            </div>
            <div style={{ fontSize: '0.7rem', color: '#ec4899' }}>
              ♥ Bride & Host
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick('cohost')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>
              Aarav Rathore
            </div>
            <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>
              👤 Groom / Co-host
            </div>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          margin: 'var(--space-4) 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span>or enter credentials</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Sign In Tab */}
      {mode === 'login' ? (
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="login-email" className="form-label">
              <span>Email Address *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-email"
                type="email"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. vikram@eventwise.ai"
                required
              />
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="login-password" className="form-label">
              <span>Password *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: '2.2rem', paddingRight: '2.5rem' }}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !loginEmail.trim()}
            style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700 }}
            rightIcon={<ArrowRight size={16} />}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      ) : (
        /* Create Account Tab */
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-name" className="form-label">
              <span>Full Name *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-name"
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Vikram Malhotra"
                required
              />
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-email" className="form-label">
              <span>Email Address *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-email"
                type="email"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. vikram@eventwise.ai"
                required
              />
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-role" className="form-label">
                <span>Account Role</span>
              </label>
              <select
                id="reg-role"
                className="form-control"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as UserRole)}
              >
                <option value="planner">Lead Event Planner</option>
                <option value="host">Event Host / Couple</option>
                <option value="vendor">Vendor Partner</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-org" className="form-label">
                <span>Company / Event Name</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-org"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.2rem' }}
                  value={regOrg}
                  onChange={(e) => setRegOrg(e.target.value)}
                  placeholder="e.g. Royal Weddings"
                />
                <Building
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-password" className="form-label">
              <span>Password *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create password"
                required
              />
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !regName.trim() || !regEmail.trim()}
            style={{ width: '100%', marginTop: 'var(--space-2)', fontWeight: 700 }}
            rightIcon={<CheckCircle size={16} />}
          >
            {isSubmitting ? 'Creating account...' : 'Create Free Account'}
          </Button>
        </form>
      )}
    </Modal>
  );
};
