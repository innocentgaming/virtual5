import React from 'react';
import {
  Plus,
  Download,
  Upload,
  Sliders,
  Sun,
  Moon,
  Calendar,
  Bot,
  Cloud,
  CloudOff,
  Loader2,
  UserPlus,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import { Badge, Button, Logo } from '../ui';
import { formatIndianShort } from '../../utils/formatters';
import type { AuthUser } from '../../types/auth';
import type { SyncStatus } from '../../hooks/useEventPlan';
import { Link } from '../../routerComponents';
import { navigate } from '../../router';

interface HeaderProps {
  events: EventPlan[];
  activeEvent: EventPlan | null;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
  onSelectEvent: (id: string) => void;
  onNewEvent: () => void;
  onExport: () => void;
  onImportPlan?: (jsonStr: string) => void;
  onExportCalendar: () => void;
  onOpenAISettings: () => void;
  onOpenCopilot: () => void;
  onOpenWebsite?: () => void;
  mode: 'account' | 'demo';
  user: AuthUser | null;
  syncStatus: SyncStatus;
  onRetrySync: () => void;
  onOpenAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  events,
  activeEvent,
  colorMode,
  onToggleColorMode,
  onSelectEvent,
  onNewEvent,
  onExport,
  onImportPlan,
  onExportCalendar,
  onOpenAISettings,
  onOpenCopilot,
  onOpenWebsite,
  mode,
  user,
  syncStatus,
  onRetrySync,
  onOpenAccount,
}) => {
  const getBadgeVariant = (type: string): 'wedding' | 'birthday' | 'community' => {
    switch (type) {
      case 'wedding':
        return 'wedding';
      case 'birthday':
        return 'birthday';
      default:
        return 'community';
    }
  };

  return (
    <header className="header" role="banner">
      {/* Brand & Title */}
      <div className="header-left">
        <Link
          to="/"
          className="brand-wrapper"
          style={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
            textDecoration: 'none',
          }}
          title="Return to Public Landing Page & Features"
          aria-label="EventWise AI Home"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 className="brand-title" style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="sr-only">EventWise AI</span>
                <Logo size="sm" />
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'rgba(217, 119, 6, 0.15)',
                    color: '#b45309',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                  }}
                >
                  India
                </span>
              </h1>
            </div>
            <div className="brand-subtitle">
              Personalized Event Planning & Decision Engine
            </div>
          </div>
        </Link>

        {/* Active Event Selector */}
        {activeEvent && events.length > 0 ? (
          <div className="event-selector-wrapper">
            <label htmlFor="active-event-select" className="sr-only">
              Select Active Event
            </label>
            <select
              id="active-event-select"
              className="event-selector"
              value={activeEvent.id}
              onChange={(e) => onSelectEvent(e.target.value)}
              aria-label="Select Active Event Plan"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.city})
                </option>
              ))}
            </select>
            <Badge variant={getBadgeVariant(activeEvent.eventType)} size="sm">
              {activeEvent.eventType === 'wedding'
                ? '👑 Royal Wedding'
                : activeEvent.eventType === 'birthday'
                ? '🎉 Milestone Birthday'
                : '🪔 Community Utsav'}
            </Badge>
          </div>
        ) : (
          <div className="event-selector-wrapper" style={{ padding: '0.25rem 0.5rem' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>
              ✨ Clean Slate
            </span>
          </div>
        )}
      </div>

      {/* Center Event Metadata Pill */}
      <div className="header-center">
        {activeEvent ? (
          <div
            className="header-meta-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--surface-subtle)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
              📍 {activeEvent.city}
            </span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
              👥 {activeEvent.guestCount} Guests
            </span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              💰 {formatIndianShort(activeEvent.totalBudget)}
            </span>
          </div>
        ) : (
          <div
            className="header-meta-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--surface-subtle)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
            }}
          >
            <span>🌟 Ready for your first celebration</span>
          </div>
        )}
      </div>

      {/* Actions & Tools */}
      <div className="header-actions">
        {/* Event Website Builder Trigger */}
        {onOpenWebsite && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenWebsite}
            leftIcon={<Globe size={14} color="var(--accent-primary)" />}
            title="Open Celebration Website Builder & Guest RSVP Portal"
            aria-label="Event Website Builder"
            id="btn-header-website"
          >
            Event Website
          </Button>
        )}

        {/* AI Copilot Drawer Trigger */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenCopilot}
          leftIcon={<Bot size={15} color="var(--accent-primary)" />}
          title="Open AI Event Copilot (Interactive Assistant)"
          aria-label="Open AI Copilot"
          id="btn-header-copilot"
        >
          AI Copilot
        </Button>

        {/* AI Settings / Model Configuration Trigger */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenAISettings}
          leftIcon={<Sliders size={14} />}
          title="Configure Gemini GenAI Key & Settings"
          aria-label="AI Planner Settings"
        >
          AI Settings
        </Button>

        {/* Sync to Calendar (.ics) Trigger */}
        {activeEvent && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportCalendar}
            leftIcon={<Calendar size={14} />}
            title="Export timeline milestones as iCalendar (.ics)"
            aria-label="Export Calendar Reminders"
          >
            Sync .ics
          </Button>
        )}

        {/* Export JSON Button */}
        {activeEvent && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            leftIcon={<Download size={14} />}
            title="Export complete event plan as structured JSON"
            aria-label="Export Event Plan as JSON"
          >
            Export Plan
          </Button>
        )}

        {/* Restore JSON Backup Button */}
        {onImportPlan && (
          <label
            className="ui-button ui-button--secondary ui-button--sm"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0, padding: '0.35rem 0.65rem' }}
            title="Restore event plan from JSON backup file"
          >
            <Upload size={14} aria-hidden="true" />
            <span className="ui-button__text">Restore JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Upload JSON event backup"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const text = evt.target?.result as string;
                  if (text && onImportPlan) {
                    onImportPlan(text);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
        )}

        {/* Dark / Light Mode Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleColorMode}
          title={colorMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={colorMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          style={{ padding: '0.45rem 0.65rem' }}
        >
          {colorMode === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} />}
        </Button>

        {mode === 'account' && user?.isAdmin && (
          <a
            href="/admin"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/admin');
            }}
          >
            <ShieldCheck size={14} aria-hidden="true" /> Admin
          </a>
        )}

        {/* Cloud sync status */}
        {mode === 'account' && <SyncBadge status={syncStatus} onRetry={onRetrySync} />}

        {/* Account menu / demo call-to-action */}
        {mode === 'account' && user ? (
          <button
            type="button"
            onClick={onOpenAccount}
            className="header-user-pill"
            title={`${user.name} (${user.roleLabel}) — account settings`}
            aria-label={`Account: ${user.name}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 12px 3px 4px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), #E76F51)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.68rem',
              }}
            >
              {user.initials}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text)' }}>
                {user.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.roleLabel}</span>
            </div>
          </button>
        ) : (
          <Link to="/signup?next=/app" className="ui-button ui-button--secondary ui-button--sm" style={{ textDecoration: 'none' }}>
            <span className="ui-button__icon" aria-hidden="true">
              <UserPlus size={14} color="var(--accent-primary)" />
            </span>
            <span className="ui-button__text">Create free account</span>
          </Link>
        )}

        {/* Create New Event Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onNewEvent}
          leftIcon={<Plus size={15} />}
          id="btn-header-new-event"
        >
          New Event
        </Button>
      </div>
    </header>
  );
};

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: '',
  loading: 'Loading your plans…',
  saving: 'Saving…',
  saved: 'Saved to your account',
  offline: 'Offline – changes are kept on this device',
  error: 'Could not save to your account',
  conflict: 'Changed on another device',
};

const SyncBadge: React.FC<{ status: SyncStatus; onRetry: () => void }> = ({ status, onRetry }) => {
  if (status === 'off') return null;
  const busy = status === 'loading' || status === 'saving';
  const bad = status === 'offline' || status === 'error' || status === 'conflict';
  const Icon = busy ? Loader2 : bad ? CloudOff : Cloud;
  return (
    <span
      role="status"
      aria-live="polite"
      title={SYNC_LABEL[status]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: bad ? 'var(--color-warning-text)' : 'var(--text-muted)',
      }}
    >
      <Icon size={14} className={busy ? 'ui-spinner-icon' : undefined} aria-hidden="true" />
      <span className="sync-badge__label">{SYNC_LABEL[status]}</span>
      {(status === 'offline' || status === 'error') && (
        <button type="button" onClick={onRetry} style={{ background: 'none', border: 0, color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
          Retry
        </button>
      )}
    </span>
  );
};
