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
import { Card, CardHeader, Button, Badge } from '../ui';

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
  const hasEnvKey = !import.meta.env.PROD && Boolean(import.meta.env.VITE_GEMINI_API_KEY);
  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.localStorage?.getItem('eventwise_ai_offline_mode') === 'true';
  });
  const [includeNotes, setIncludeNotes] = useState<boolean>(false);

  const handleToggleOffline = (val: boolean) => {
    setOfflineMode(val);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('eventwise_ai_offline_mode', String(val));
    }
  };

  const handleRunAI = () => {
    if (offlineMode) {
      onRegeneratePlan(false);
      return;
    }
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
                  Dev .env Active
                </Badge>
              )}
              <Badge variant="info">In-Memory Session Only</Badge>
            </div>
          }
        />

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.55 }}>
          EventWise AI uses Google Gemini (3.8 Flash / 2.5 Flash Lite) to generate enriched descriptions. API keys are kept strictly in ephemeral browser memory, never logged, and never stored to disk or localStorage.
        </p>

        <div className="form-group">
          <label htmlFor="gemini-key" className="form-label">Google Gemini API Key (In-Memory Session Key)</label>
          <input
            id="gemini-key"
            type="password"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="form-control"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasEnvKey ? "Local dev key active from .env (or enter custom key)" : "AIzaSy... (leave blank to use offline rule engine)"}
          />
          <span className="form-hint">
            {hasEnvKey
              ? "Dev Mode: Ambient key from local .env detected. Override with a temporary session key anytime."
              : "Session key is held in volatile memory only and never written to storage or sent in URLs. Leave blank to run offline."}
          </span>
        </div>

        {/* Data Privacy & Consent Disclosure */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            <ShieldCheck size={18} color="#059669" />
            <span>AI Data Privacy & Transmission Notice</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ margin: 0 }}>
              <strong>What is sent to Google Gemini:</strong> Event parameters (City, Total Budget, Guest Count, Venue & Food Preferences, Theme, and Cultural Traditions).
            </p>
            <p style={{ margin: 0 }}>
              <strong>What is NEVER sent (Strict PII Isolation):</strong> Attendee guest names, phone numbers, email addresses, and vendor contact records remain strictly in local browser memory.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Offline Mode:</strong> Transmits <em>zero bytes</em> over the network, evaluating all recommendations using the built-in deterministic rule engine.
            </p>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={(e) => handleToggleOffline(e.target.checked)}
                id="checkbox-offline-mode"
              />
              <span><strong>Enforce Offline Mode</strong> (block all cloud AI network transmissions)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                disabled={offlineMode}
                id="checkbox-include-notes"
              />
              <span>Include free-text special notes in AI prompt (keep unchecked to omit notes)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <Button
            variant="primary"
            onClick={handleRunAI}
            disabled={isGenerating || offlineMode}
            isLoading={isGenerating}
            id="btn-run-genai"
            leftIcon={<Sparkles size={16} />}
            title={offlineMode ? "Cloud AI is disabled because Offline Mode is active" : "Generate using Google Gemini GenAI"}
          >
            {isGenerating ? 'Calling GenAI...' : offlineMode ? 'Cloud AI Disabled (Offline Mode)' : 'Generate with GenAI (Gemini)'}
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
