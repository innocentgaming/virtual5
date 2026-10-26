import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import {
  ShieldCheck,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: EventPlan;
  onSignOutFeedback?: (msg: string) => void;
  onSwitchPersonaFeedback?: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  onSignOutFeedback,
  onSwitchPersonaFeedback,
}) => {
  const { user, logout, loginAsDemo } = useAuth();

  if (!user) return null;

  const handleSignOut = () => {
    logout();
    onSignOutFeedback?.('You have signed out successfully.');
    onClose();
  };

  const handleSwitchPersona = (persona: 'planner' | 'host' | 'cohost') => {
    loginAsDemo(persona);
    const label =
      persona === 'planner'
        ? 'Vikram Malhotra (Lead Planner)'
        : persona === 'host'
        ? 'Ananya Sharma (Bride / Host)'
        : 'Aarav Rathore (Co-host)';
    onSwitchPersonaFeedback?.(`Switched active persona to ${label}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill)',
              background: 'linear-gradient(135deg, var(--accent-primary), #E76F51)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 'var(--text-sm)',
            }}
          >
            {user.initials}
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text)' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>
        </div>
      }
      subtitle="Collaborative planning account & team permissions"
      size="md"
      ariaLabel="User Profile and Collaboration Modal"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Account Details Card */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Account Credentials & Role
            </span>
            <Badge variant="wedding">
              <ShieldCheck size={12} style={{ marginRight: '4px' }} />
              {user.roleLabel}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Role Access Level</div>
              <strong style={{ color: 'var(--text)' }}>
                {user.role === 'planner' ? 'Full Admin & Budget Sign-Off' : 'Host / Client Approvals'}
              </strong>
            </div>
            {user.organization && (
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Organization / Family</div>
                <strong style={{ color: 'var(--text)' }}>{user.organization}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Collaborative Team on Active Event */}
        <div
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-2)' }}>
            <Users size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>
              Collaborators on &ldquo;{activeEvent.title}&rdquo;
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 var(--space-3) 0' }}>
            Real-time permissions shared between host family and verified event team:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <strong>Ananya Sharma</strong>
                <span style={{ color: 'var(--text-muted)' }}>(Host & Bride)</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Primary Owner</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <strong>Aarav Rathore</strong>
                <span style={{ color: 'var(--text-muted)' }}>(Groom / Co-host)</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Co-host</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <strong>Vikram Malhotra</strong>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>(Lead Planner - Active)</span>
              </div>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 700 }}>
                Verified Pro
              </span>
            </div>
          </div>
        </div>

        {/* Evaluator Fast Persona Switcher */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
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
            <span>Switch Persona (Quick Hackathon Evaluation):</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => handleSwitchPersona('planner')}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${user.id === 'usr-planner-vikram' ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: user.id === 'usr-planner-vikram' ? 'var(--surface-selected, rgba(158, 42, 43, 0.1))' : 'var(--surface-raised)',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: user.id === 'usr-planner-vikram' ? 700 : 500,
                color: user.id === 'usr-planner-vikram' ? 'var(--accent-primary)' : 'var(--text)',
              }}
            >
              ★ Vikram (Planner)
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPersona('host')}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${user.id === 'usr-host-ananya' ? '#ec4899' : 'var(--border)'}`,
                background: user.id === 'usr-host-ananya' ? 'rgba(236, 72, 153, 0.1)' : 'var(--surface-raised)',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: user.id === 'usr-host-ananya' ? 700 : 500,
                color: user.id === 'usr-host-ananya' ? '#ec4899' : 'var(--text)',
              }}
            >
              ♥ Ananya (Host)
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPersona('cohost')}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${user.id === 'usr-cohost-aarav' ? '#3b82f6' : 'var(--border)'}`,
                background: user.id === 'usr-cohost-aarav' ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface-raised)',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: user.id === 'usr-cohost-aarav' ? 700 : 500,
                color: user.id === 'usr-cohost-aarav' ? '#3b82f6' : 'var(--text)',
              }}
            >
              👤 Aarav (Co-host)
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut size={14} color="var(--color-danger)" />}
            style={{ color: 'var(--color-danger)' }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
};
