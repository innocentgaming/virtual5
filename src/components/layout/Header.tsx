import React from 'react';
import {
  Sparkles,
  Plus,
  Download,
  Sliders,
  ShieldCheck,
  Sun,
  Moon,
  Calendar,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import type { NavigationTab } from '../../hooks/useEventPlan';
import { Badge, Button } from '../ui';
import { formatIndianShort } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  events: EventPlan[];
  activeEvent: EventPlan;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
  onSelectEvent: (id: string) => void;
  onNewEvent: () => void;
  onExport: () => void;
  onExportCalendar: () => void;
  onOpenAISettings: () => void;
  onOpenCopilot: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  events,
  activeEvent,
  colorMode,
  onToggleColorMode,
  onSelectEvent,
  onNewEvent,
  onExport,
  onExportCalendar,
  onOpenAISettings,
  onOpenCopilot,
  onNavigateTab,
}) => {
  const { user, openAuthModal, openProfileModal } = useAuth();

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
    <header className="header-bar" role="banner">
      <div
        className="brand-wrapper"
        onClick={() => onNavigateTab?.('landing')}
        style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
        title="Click to view Platform Showcase & Landing Page"
      >
        <div className="brand-logo-icon" aria-hidden="true">
          <Sparkles size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 className="brand-title">EventWise AI</h1>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '2px 7px',
                borderRadius: '4px',
                background: 'var(--accent-primary)',
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              PRO
            </span>
            <Badge variant={getBadgeVariant(activeEvent.eventType)}>
              {activeEvent.eventType.toUpperCase()}
            </Badge>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(34, 197, 94, 0.12))',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                color: 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Engineered specifically for Indian Celebrations & Community Events"
            >
              🇮🇳 Made for India First
            </span>
          </div>
          <p className="brand-subtitle">
            Personalized Event Planning & Decision Engine · Made for India First (₹ en-IN)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Active Event Snapshot Pill */}
        <div className="header-meta-pill" title="Active Event Snapshot">
          <span>📍 {activeEvent.city}</span>
          <span>•</span>
          <span>👥 {activeEvent.guestCount} Guests</span>
          <span>•</span>
          <span className="tabular-nums">{formatIndianShort(activeEvent.totalBudget)}</span>
        </div>

        {/* Event Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label
            htmlFor="event-select"
            className="sr-only"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              border: 0,
            }}
          >
            Select Active Event
          </label>
          <select
            id="event-select"
            className="form-control"
            style={{ minWidth: '200px', fontWeight: 600 }}
            value={activeEvent.id}
            onChange={(e) => onSelectEvent(e.target.value)}
            aria-label="Select active event plan"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.city})
              </option>
            ))}
          </select>
        </div>

        {/* Platform Showcase Link */}
        {onNavigateTab && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('landing')}
            leftIcon={<Sparkles size={14} color="var(--accent-primary)" />}
            title="Explore Public Landing Page, Features & Client Stories"
            aria-label="Explore Platform Showcase"
            id="btn-header-showcase"
          >
            Showcase
          </Button>
        )}

        {/* AI Copilot Quick Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenCopilot}
          leftIcon={<Bot size={15} color="var(--accent-primary)" />}
          style={{
            borderColor: 'var(--accent-primary)',
            color: 'var(--accent-primary)',
            fontWeight: 700,
          }}
          title="Open EventWise AI Copilot Drawer"
          aria-label="Open EventWise AI Copilot Drawer"
          id="btn-open-copilot"
        >
          Ask Copilot
        </Button>

        {/* Engine Status Indicator */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenAISettings}
          leftIcon={
            activeEvent.plannerSource === 'ai' ? (
              <Sparkles size={14} color="#6366f1" />
            ) : (
              <ShieldCheck size={14} color="#059669" />
            )
          }
          rightIcon={<Sliders size={12} style={{ color: 'var(--text-muted)' }} />}
          title="Click to configure AI or view Decision Engine status"
          aria-label="AI and Decision Engine Settings"
        >
          {activeEvent.plannerSource === 'ai' ? 'AI Mode Active' : 'Rule-Based Engine'}
        </Button>

        {/* Export Calendar .ics Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExportCalendar}
          leftIcon={<Calendar size={14} />}
          title="Download RFC 5545 iCalendar (.ics) with timelines and schedule alerts"
          aria-label="Download Event Calendar (.ics)"
        >
          Sync .ics
        </Button>

        {/* Export JSON Button */}
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

        {/* User Authentication Pill / Sign In Option */}
        {user ? (
          <button
            type="button"
            onClick={openProfileModal}
            className="header-user-pill"
            title={`Active User: ${user.name} (${user.roleLabel}) — Click to view profile & collaboration`}
            aria-label={`User Profile: ${user.name}`}
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
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {user.role === 'planner' ? 'Pro Planner' : 'Host'}
              </span>
            </div>
          </button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAuthModal('login')}
            leftIcon={<UserIcon size={14} color="var(--accent-primary)" />}
            title="Sign In or Register for EventWise AI"
            aria-label="Sign In"
            id="btn-header-signin"
          >
            Sign In
          </Button>
        )}

        {/* Create New Event Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onNewEvent}
          leftIcon={<Plus size={16} />}
          id="btn-create-new-event"
        >
          New Event
        </Button>
      </div>
    </header>
  );
};
