import React from 'react';
import { Sparkles, Plus, Download, Sliders, ShieldCheck } from 'lucide-react';
import type { EventPlan } from '../../types/event';

interface HeaderProps {
  events: EventPlan[];
  activeEvent: EventPlan;
  onSelectEvent: (id: string) => void;
  onNewEvent: () => void;
  onExport: () => void;
  onOpenAISettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  onNewEvent,
  onExport,
  onOpenAISettings,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 className="brand-title">EventWise AI</h1>
            <span className={`badge ${getBadgeClass(activeEvent.eventType)}`}>
              {activeEvent.eventType.toUpperCase()}
            </span>
          </div>
          <p className="brand-subtitle">Personalized Event Planning & Decision Engine</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Event Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label htmlFor="event-select" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Select Active Event
          </label>
          <select
            id="event-select"
            className="form-control"
            style={{ minWidth: '220px', fontWeight: 600 }}
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
