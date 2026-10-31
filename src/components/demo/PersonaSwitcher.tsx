import React from 'react';
import type { EventPlan } from '../../types/event';
import { SAMPLE_WEDDING, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY } from '../../data/sampleEvents';
import { Sparkles, Crown, PartyPopper, Users } from 'lucide-react';

interface PersonaSwitcherProps {
  activeEventId: string;
  onSelectPersona?: (event: EventPlan) => void;
  onSelectEvent?: (eventId: string) => void;
  className?: string;
}

interface PersonaInfo {
  id: string;
  label: string;
  sub: string;
  city: string;
  budget: string;
  guests: number;
  icon: React.ReactNode;
  theme: 'wedding' | 'birthday' | 'community';
}

const PERSONAS: PersonaInfo[] = [
  {
    id: SAMPLE_WEDDING.id,
    label: 'Aarav & Ananya',
    sub: 'Royal Rajasthan Wedding',
    city: 'Jaipur',
    budget: '₹35L',
    guests: 350,
    icon: <Crown size={15} color="#ec4899" aria-hidden="true" />,
    theme: 'wedding',
  },
  {
    id: SAMPLE_BIRTHDAY.id,
    label: "Rohan's 30th",
    sub: 'Bollywood Rooftop Bash',
    city: 'Mumbai',
    budget: '₹3.5L',
    guests: 80,
    icon: <PartyPopper size={15} color="#f59e0b" aria-hidden="true" />,
    theme: 'birthday',
  },
  {
    id: SAMPLE_COMMUNITY.id,
    label: 'Diwali & Dandiya Mela',
    sub: 'Shanti Vihar Community',
    city: 'Bengaluru',
    budget: '₹6.5L',
    guests: 600,
    icon: <Users size={15} color="#0d9488" aria-hidden="true" />,
    theme: 'community',
  },
];

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({
  activeEventId,
  onSelectPersona,
  onSelectEvent,
  className = '',
}) => {
  return (
    <section
      className={`persona-switcher ${className}`}
      aria-label="Demo Persona Switcher"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.72rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          marginRight: '0.25rem',
        }}
      >
        <Sparkles size={13} color="var(--accent-primary)" aria-hidden="true" />
        <span>Celebration:</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        {PERSONAS.map((p) => {
          const isActive = activeEventId === p.id;
          const targetPlan =
            p.id === SAMPLE_WEDDING.id
              ? SAMPLE_WEDDING
              : p.id === SAMPLE_BIRTHDAY.id
              ? SAMPLE_BIRTHDAY
              : SAMPLE_COMMUNITY;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectPersona?.(targetPlan);
                onSelectEvent?.(p.id);
              }}
              aria-label={`Switch celebration to ${p.label} (${p.city})`}
              aria-pressed={isActive}
              className={`persona-chip ${isActive ? 'persona-chip--active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                border: isActive
                  ? '1.5px solid var(--accent-primary)'
                  : '1px solid var(--border)',
                background: isActive
                  ? 'var(--surface-raised)'
                  : 'var(--surface-subtle)',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {p.icon}
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  paddingLeft: '2px',
                }}
              >
                ({p.city} · {p.budget})
              </span>
              {isActive && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 5px',
                    fontWeight: 800,
                    marginLeft: '2px',
                  }}
                >
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
