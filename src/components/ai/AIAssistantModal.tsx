import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Key,
  ShieldCheck,
  Cpu,
  Info,
} from 'lucide-react';
import type { EventPlan } from '../../types/event';
import { Card, CardHeader, Button, Badge } from '../common';

interface AIAssistantModalProps {
  plan: EventPlan;
  onRegeneratePlan: (useAI: boolean, apiKey?: string) => void;
  isGenerating?: boolean;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  plan,
  onRegeneratePlan,
  isGenerating = false,
}) => {
  const [apiKey, setApiKey] = useState('');
  const hasEnvKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  const handleRunAI = () => {
    onRegeneratePlan(true, apiKey.trim() || undefined);
  };

  const handleRunRuleEngine = () => {
    onRegeneratePlan(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Card */}
      <Card>
        <CardHeader
          title="Smart Decision Engine & AI Planner"
          icon={<Bot size={22} color="var(--accent-primary)" />}
          subtitle="EventWise AI employs an offline-first deterministic business rule engine, with optional Gemini GenAI enhancement."
          action={
            <Badge variant={plan.plannerSource === 'ai' ? 'wedding' : 'community'}>
              Current: {plan.plannerSource === 'ai' ? 'GenAI Assisted' : 'Deterministic Engine'}
            </Badge>
          }
        />

        {/* Explainability box */}
        <div
          style={{
            backgroundColor: 'var(--bg-card-subtle)',
            padding: '1.125rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-primary)',
            borderTop: '1px solid var(--border-light)',
            borderRight: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
            Plan Generation Rationale:
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
            {plan.generationExplanation}
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Last Evaluated: {new Date(plan.lastGeneratedAt).toLocaleString('en-US')}
          </div>
        </div>
      </Card>

      {/* Real-time Business Rules Inspector */}
      <Card>
        <CardHeader
          title="Active Business Rules Evaluation"
          icon={<Cpu size={18} color="var(--accent-primary)" />}
          subtitle="Real-time multi-tier decision logic and cultural guardrails."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Rule 1 */}
          <div
            style={{
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Rule 1: Budget Balance & Deficit Protection
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Monitors allocations against total funds and triggers automatic substitution recommendations if over-budget.
              </div>
            </div>
            <Badge variant="success">ACTIVE</Badge>
          </div>

          {/* Rule 2 */}
          <div
            style={{
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Rule 2: Dynamic Timeline & Short-Notice Triage
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Adjusts preparation intervals relative to event date; marks critical milestones urgent when under 21 days.
              </div>
            </div>
            <Badge variant="success">ACTIVE</Badge>
          </div>

          {/* Rule 3 */}
          <div
            style={{
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Rule 3: Guest Capacity & Per-Person Cost Scaling
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Recalculates per-guest food and favor costs dynamically when headcount changes and audits venue capacity.
              </div>
            </div>
            <Badge variant="success">ACTIVE</Badge>
          </div>

          {/* Rule 4 */}
          <div
            style={{
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Rule 4: Outdoor Weather Contingency
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Flags rain tent rentals, patio heater options, and indoor back-up room reservations for garden/beach/outdoor venues without claiming weather forecasts.
              </div>
            </div>
            <Badge variant="success">ACTIVE</Badge>
          </div>

          {/* Rule 5 */}
          <div
            style={{
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Rule 5: Accessibility & Dietary Verification
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Injects mandatory step-free access checks and allergen-safe catering queries into vendor interview checklists.
              </div>
            </div>
            <Badge variant="success">ACTIVE</Badge>
          </div>
        </div>
      </Card>

      {/* AI Key Configuration & Safe Execution */}
      <Card>
        <CardHeader
          title="GenAI Integration Configuration (Google Gemini)"
          icon={<Key size={18} color="var(--accent-primary)" />}
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {hasEnvKey && (
                <Badge variant="success" icon={<ShieldCheck size={12} />}>
                  Active Key in .env
                </Badge>
              )}
              <Badge variant="info">Zero-Storage Security</Badge>
            </div>
          }
        />

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
          EventWise AI uses Google Gemini (3.8 Flash / 2.5 Flash Lite) to generate enriched descriptions. API keys are kept strictly in browser memory or secured via local environment variables, and are <strong>never stored in public repository code</strong>.
        </p>

        <div className="form-group">
          <label htmlFor="gemini-key" className="form-label">Google Gemini API Key</label>
          <input
            id="gemini-key"
            type="password"
            className="form-control"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasEnvKey ? "Active API key loaded from .env (or enter custom key)" : "AIzaSy... or AQ.... (leave blank to use Rule Engine)"}
          />
          <span className="form-hint">
            {hasEnvKey
              ? "Defaulting to active key configured in .env. You can also override with a temporary session key."
              : "If left blank, the app uses either VITE_GEMINI_API_KEY from .env or the high-fidelity deterministic rule engine."}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <Button
            variant="primary"
            onClick={handleRunAI}
            disabled={isGenerating}
            isLoading={isGenerating}
            id="btn-run-genai"
            leftIcon={<Sparkles size={16} />}
          >
            {isGenerating ? 'Calling GenAI...' : 'Generate with GenAI (Gemini)'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleRunRuleEngine}
            disabled={isGenerating}
            id="btn-run-rule-engine"
            leftIcon={<ShieldCheck size={16} color="#059669" />}
          >
            Regenerate with Rule Engine
          </Button>
        </div>

        <div className="estimate-disclaimer">
          <Info size={14} />
          <span>
            <strong>Safety Guardrail:</strong> Output JSON schema is strictly verified against unexpected formats, rate limits, or network failures. If an AI call fails, the deterministic engine automatically recovers without losing your progress.
          </span>
        </div>
      </Card>
    </div>
  );
};
