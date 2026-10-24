import React from 'react';
import { Sparkles, Plus, Download, Sliders, ShieldCheck, Sun, Moon, Calendar, Bot } from 'lucide-react';
import type { EventPlan } from '../../types/event';

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
}) => {
  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'wedding':
        return 'badge-wedding';
      case 'birthday':
        return 'badge-birthday';
      default:
        return 'badge-community';
    }
  };

  return (
    <header className="header-bar" role="banner">
      <div className="brand-wrapper">
        <div className="brand-logo-icon" aria-hidden="true">
          <Sparkles size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 className="brand-title">EventWise AI</h1>
            <span className={`badge ${getBadgeClass(activeEvent.eventType)}`}>
              {activeEvent.eventType.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(34, 197, 94, 0.15))',
                border: '1px solid rgba(249, 115, 22, 0.4)',
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
          <p className="brand-subtitle">Personalized Event Planning & Decision Engine · Made for India First (₹ en-IN)</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Event Selector */}
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

        {/* AI Copilot Quick Button */}
        <button
          type="button"
          onClick={onOpenCopilot}
          className="btn btn-secondary btn-sm"
          style={{
            borderColor: 'var(--brand-primary)',
            color: 'var(--brand-primary)',
            fontWeight: 600,
          }}
          title="Open EventWise AI Copilot Drawer"
          aria-label="Open EventWise AI Copilot Drawer"
          id="btn-open-copilot"
        >
          <Bot size={15} />
          <span>Ask Copilot</span>
        </button>

        {/* Engine Status Indicator */}
        <button
          type="button"
          onClick={onOpenAISettings}
          className="btn btn-secondary btn-sm"
          title="Click to configure AI or view Decision Engine status"
          aria-label="AI and Decision Engine Settings"
        >
          {activeEvent.plannerSource === 'ai' ? (
            <>
              <Sparkles size={14} color="#6366f1" />
              <span>AI Mode Active</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} color="#059669" />
              <span>Rule-Based Engine</span>
            </>
          )}
          <Sliders size={12} style={{ marginLeft: 2, color: 'var(--text-muted)' }} />
        </button>

        {/* Export Calendar .ics Button */}
        <button
          type="button"
          onClick={onExportCalendar}
          className="btn btn-secondary btn-sm"
          title="Download RFC 5545 iCalendar (.ics) with timelines and schedule alerts"
          aria-label="Download Event Calendar (.ics)"
        >
          <Calendar size={14} />
          <span>Sync .ics</span>
        </button>

        {/* Export JSON Button */}
        <button
          type="button"
          onClick={onExport}
          className="btn btn-secondary btn-sm"
          title="Export complete event plan as structured JSON"
          aria-label="Export Event Plan as JSON"
        >
          <Download size={14} />
          <span>Export Plan</span>
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          onClick={onToggleColorMode}
          className="btn btn-secondary btn-sm"
          title={colorMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={colorMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          style={{ padding: '0.45rem 0.65rem' }}
        >
          {colorMode === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} />}
        </button>

        {/* Create New Event Button */}
        <button
          type="button"
          onClick={onNewEvent}
          className="btn btn-primary btn-sm"
          id="btn-create-new-event"
        >
          <Plus size={16} />
          <span>New Event</span>
        </button>
      </div>
    </header>
  );
};

