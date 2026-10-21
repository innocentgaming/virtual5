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

  const handleRunAI = () => {
    onRegeneratePlan(true, apiKey.trim() || undefined);
  };

  const handleRunRuleEngine = () => {
    onRegeneratePlan(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Bot size={22} color="var(--accent-primary)" />
              Smart Decision Engine & AI Planner
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              EventWise AI employs an offline-first deterministic business rule engine, with optional Gemini GenAI enhancement.
            </p>
          </div>
          <span className={`badge ${plan.plannerSource === 'ai' ? 'badge-wedding' : 'badge-community'}`}>
            Current: {plan.plannerSource === 'ai' ? 'GenAI Assisted' : 'Deterministic Engine'}
          </span>
        </div>

        {/* Explainability box */}
        <div
          style={{
            backgroundColor: 'var(--bg-card-subtle)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-primary)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
            Plan Generation Rationale:
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
            {plan.generationExplanation}
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Last Evaluated: {new Date(plan.lastGeneratedAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Real-time Business Rules Inspector */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">
            <Cpu size={18} color="var(--accent-primary)" />
            Active Business Rules Evaluation
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-time rule evaluations
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Rule 1 */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Rule 1: Budget Balance & Deficit Protection
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Monitors allocations against total funds and triggers automatic substitution recommendations if over-budget.
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>

          {/* Rule 2 */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Rule 2: Dynamic Timeline & Short-Notice Triage
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Adjusts preparation intervals relative to event date; marks critical milestones urgent when under 21 days.
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>

          {/* Rule 3 */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Rule 3: Guest Capacity & Per-Person Cost Scaling
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Recalculates per-guest food and favor costs dynamically when headcount changes and audits venue capacity.
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>

          {/* Rule 4 */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Rule 4: Outdoor Weather Contingency
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Flags rain tent rentals, patio heater options, and indoor back-up room reservations for garden/beach/outdoor venues without claiming weather forecasts.
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>

          {/* Rule 5 */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Rule 5: Accessibility & Dietary Verification
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Injects mandatory step-free access checks and allergen-safe catering queries into vendor interview checklists.
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* AI Key Configuration & Safe Execution */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">
            <Key size={18} color="var(--accent-primary)" />
            GenAI Integration Configuration (Optional)
          </h4>
          <span className="badge badge-info">Zero-Storage Security</span>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          EventWise AI can use Google Gemini (1.5 Flash) to generate enriched descriptions. API keys are kept strictly in browser memory for the session and are <strong>never stored in localStorage, cookies, or logs</strong>.
        </p>

        <div className="form-group">
          <label htmlFor="gemini-key" className="form-label">Google Gemini API Key (Optional)</label>
          <input
            id="gemini-key"
            type="password"
            className="form-control"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy... (leave blank to use Rule Engine or VITE_GEMINI_API_KEY)"
          />
          <span className="form-hint">
            If left blank, the app uses either `VITE_GEMINI_API_KEY` from .env or the high-fidelity deterministic fallback engine.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunAI}
            disabled={isGenerating}
            id="btn-run-genai"
          >
            <Sparkles size={16} />
            <span>{isGenerating ? 'Calling GenAI...' : 'Generate with GenAI (Gemini)'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRunRuleEngine}
            disabled={isGenerating}
            id="btn-run-rule-engine"
          >
            <ShieldCheck size={16} color="#059669" />
            <span>Regenerate with Rule Engine</span>
          </button>
        </div>

        <div className="estimate-disclaimer">
          <Info size={14} />
          <span>
            <strong>Safety Guardrail:</strong> Output JSON schema is strictly verified against unexpected formats, rate limits, or network failures. If an AI call fails, the deterministic engine automatically recovers without losing your progress.
          </span>
        </div>
      </div>
    </div>
  );
};
