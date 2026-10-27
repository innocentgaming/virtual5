import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../../routerComponents';
import { SAMPLE_WEDDING, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY } from '../../data/sampleEvents';
import type { BudgetCategory, EventPlan } from '../../types/event';
import {
  DEMO_SCENARIOS,
  applyAll,
  snapshotPlan,
  type DemoScenarioId,
} from '../../services/demoSimulator';
import { formatCurrency, formatIndianShort, formatPercent } from '../../utils/formatters';
import '../../demoWindow.css';

type ViewId = 'overview' | 'budget' | 'schedule' | 'alerts';

const PERSONAS: { plan: EventPlan; label: string; sub: string }[] = [
  { plan: SAMPLE_WEDDING, label: 'Wedding', sub: 'Jaipur' },
  { plan: SAMPLE_BIRTHDAY, label: 'Birthday', sub: 'Mumbai' },
  { plan: SAMPLE_COMMUNITY, label: 'Mela', sub: 'Bengaluru' },
];

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'schedule', label: 'Run of show' },
  { id: 'alerts', label: 'Alerts' },
];

const CATEGORY_COLORS: Partial<Record<BudgetCategory, string>> = {
  venue: '#0f766e',
  catering: '#d97706',
  decor: '#be185d',
  photography: '#4f46e5',
  entertainment: '#0891b2',
  logistics: '#65a30d',
  invitations: '#9333ea',
  contingency: '#94a3b8',
  other: '#64748b',
};

const STORY: DemoScenarioId[] = ['caterer', 'guests', 'rain', 'date'];
const STORY_STEP_MS = 3200;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function donutSegments(totals: Record<string, number>) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return entries.map(([key, value]) => {
    const length = (value / sum) * circumference;
    const seg = { key, value, share: value / sum, length, offset, circumference };
    offset += length;
    return seg;
  });
}

export function LiveDemoWindow(): React.ReactElement {
  const [personaIdx, setPersonaIdx] = useState(0);
  const [view, setView] = useState<ViewId>('overview');
  const [active, setActive] = useState<DemoScenarioId[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const base = PERSONAS[personaIdx].plan;

  const stopStory = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPlaying(false);
  }, []);

  useEffect(() => stopStory, [stopStory]);

  const baseline = useMemo(() => snapshotPlan(base), [base]);
  const scenarioPlan = useMemo(() => applyAll(base, active), [base, active]);
  const current = useMemo(() => snapshotPlan(scenarioPlan), [scenarioPlan]);

  const delta = current.projectedTotal - baseline.projectedTotal;
  const overBudget = current.projectedTotal > scenarioPlan.totalBudget;
  const utilisation = scenarioPlan.totalBudget > 0 ? (current.projectedTotal / scenarioPlan.totalBudget) * 100 : 0;
  const perGuest = Math.round(current.projectedTotal / Math.max(1, scenarioPlan.guestCount));
  const segments = useMemo(() => donutSegments(current.summary.categoryTotals), [current]);

  const toggleScenario = (id: DemoScenarioId) => {
    stopStory();
    setCaption(DEMO_SCENARIOS.find((s) => s.id === id)?.caption ?? null);
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    stopStory();
    setActive([]);
    setCaption(null);
  };

  const selectPersona = (idx: number) => {
    stopStory();
    setPersonaIdx(idx);
    setActive([]);
    setCaption(null);
  };

  const playStory = () => {
    stopStory();
    setActive([]);
    setView('overview');
    setPlaying(true);
    setCaption('Starting from the plan as first generated.');
    STORY.forEach((id, i) => {
      const t = window.setTimeout(() => {
        setActive((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setCaption(DEMO_SCENARIOS.find((s) => s.id === id)?.caption ?? null);
        if (i === 0) setView('overview');
        if (i === 1) setView('budget');
        if (i === 2) setView('schedule');
        if (i === 3) setView('alerts');
        if (i === STORY.length - 1) {
          const end = window.setTimeout(() => setPlaying(false), STORY_STEP_MS);
          timers.current.push(end);
        }
      }, (i + 1) * STORY_STEP_MS);
      timers.current.push(t);
    });
  };

  const warnings = current.insights.filter((i) => i.type === 'warning' || i.type === 'action_required');
  const hovered = segments.find((s) => s.key === hoverKey);

  return (
    <div className="dw" role="region" aria-label="Interactive demo of an EventWise AI plan">
      <div className="dw__chrome" aria-hidden="true">
        <span className="dw__dots"><i /><i /><i /></span>
        <span className="dw__url">eventwise.ai/demo</span>
        <span className="dw__live"><b /> Live sample</span>
      </div>

      <div className="dw__bar">
        <div className="dw__tabs" role="tablist" aria-label="Sample celebration">
          {PERSONAS.map((p, i) => (
            <button
              key={p.plan.id}
              type="button"
              role="tab"
              aria-selected={i === personaIdx}
              className={`dw__tab ${i === personaIdx ? 'is-on' : ''}`}
              onClick={() => selectPersona(i)}
            >
              {p.label}
              <small>{p.sub}</small>
            </button>
          ))}
        </div>
        <button type="button" className="dw__play" onClick={playing ? stopStory : playStory} aria-pressed={playing}>
          {playing ? 'Pause the story' : 'Play the story'}
        </button>
      </div>

      <div className="dw__body">
        <nav className="dw__nav" aria-label="Plan sections">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`dw__navbtn ${v.id === view ? 'is-on' : ''}`}
              aria-current={v.id === view ? 'page' : undefined}
              onClick={() => { stopStory(); setView(v.id); }}
            >
              {v.label}
              {v.id === 'alerts' && warnings.length > 0 && <span className="dw__count">{warnings.length}</span>}
            </button>
          ))}
        </nav>

        <div className="dw__main">
          <header className="dw__head">
            <div>
              <h3 className="dw__title">{scenarioPlan.title}</h3>
              <p className="dw__meta">
                {scenarioPlan.city.split(',')[0]} · {scenarioPlan.guestCount} guests · {scenarioPlan.eventDate}
              </p>
            </div>
            {active.length > 0 && (
              <span className={`dw__delta ${delta > 0 ? 'is-up' : ''}`} aria-live="polite">
                {delta >= 0 ? '+' : '−'}{formatIndianShort(Math.abs(delta))} vs. original plan
              </span>
            )}
          </header>

          {view === 'overview' && (
            <div className="dw__kpis">
              <div className="dw__kpi">
                <span>Budget</span>
                <strong>{formatIndianShort(scenarioPlan.totalBudget)}</strong>
              </div>
              <div className={`dw__kpi ${overBudget ? 'is-bad' : ''}`}>
                <span>Projected spend</span>
                <strong>{formatIndianShort(current.projectedTotal)}</strong>
              </div>
              <div className="dw__kpi">
                <span>Per guest</span>
                <strong>{formatCurrency(perGuest)}</strong>
              </div>
              <div className={`dw__kpi ${overBudget ? 'is-bad' : 'is-good'}`}>
                <span>{overBudget ? 'Over by' : 'Headroom'}</span>
                <strong>{formatIndianShort(Math.abs(scenarioPlan.totalBudget - current.projectedTotal))}</strong>
              </div>
              <div className="dw__meter" role="img" aria-label={`Budget used: ${formatPercent(utilisation)}`}>
                <span style={{ width: `${Math.min(100, utilisation)}%` }} className={overBudget ? 'is-bad' : ''} />
              </div>
              <p className="dw__meter-note">{formatPercent(utilisation)} of budget committed, including a {formatIndianShort(current.summary.contingencyAmount)} contingency reserve.</p>
            </div>
          )}

          {view === 'budget' && (
            <div className="dw__budget">
              <div className="dw__donut">
                <svg viewBox="0 0 140 140" role="img" aria-label="Budget split by category">
                  <g transform="rotate(-90 70 70)">
                    {segments.map((s) => (
                      <circle
                        key={s.key}
                        cx="70" cy="70" r="54" fill="none"
                        stroke={CATEGORY_COLORS[s.key as BudgetCategory] ?? '#64748b'}
                        strokeWidth={hoverKey === s.key ? 22 : 18}
                        strokeDasharray={`${Math.max(0, s.length - 1.5)} ${s.circumference}`}
                        strokeDashoffset={-s.offset}
                        onMouseEnter={() => setHoverKey(s.key)}
                        onMouseLeave={() => setHoverKey(null)}
                        style={{ transition: 'stroke-dasharray .5s ease, stroke-width .15s ease' }}
                      />
                    ))}
                  </g>
                  <text x="70" y="66" textAnchor="middle" className="dw__donut-top">{hovered ? hovered.key : 'Total'}</text>
                  <text x="70" y="84" textAnchor="middle" className="dw__donut-val">
                    {formatIndianShort(hovered ? hovered.value : current.summary.totalEstimated)}
                  </text>
                </svg>
              </div>
              <ul className="dw__legend">
                {segments.map((s) => (
                  <li
                    key={s.key}
                    className={hoverKey === s.key ? 'is-on' : ''}
                    onMouseEnter={() => setHoverKey(s.key)}
                    onMouseLeave={() => setHoverKey(null)}
                  >
                    <i style={{ background: CATEGORY_COLORS[s.key as BudgetCategory] ?? '#64748b' }} />
                    <span>{s.key}</span>
                    <b>{formatIndianShort(s.value)}</b>
                    <em>{formatPercent(s.share * 100)}</em>
                  </li>
                ))}
              </ul>
              {current.overrun > 0 && (
                <p className="dw__overrun">Quotes are {formatCurrency(current.overrun)} above estimate and counted in projected spend.</p>
              )}
            </div>
          )}

          {view === 'schedule' && (
            <ol className="dw__rows">
              {(scenarioPlan.schedule ?? []).slice(0, 6).map((row) => (
                <li key={row.id}>
                  <span className="dw__time">{row.time}</span>
                  <span className="dw__what">
                    {row.activity}
                    <small>{row.location} · {row.responsibleRole}</small>
                  </span>
                </li>
              ))}
              {(scenarioPlan.schedule ?? []).length === 0 && <li><span className="dw__what">No schedule items in this sample.</span></li>}
            </ol>
          )}

          {view === 'alerts' && (
            <ul className="dw__alerts">
              {current.insights.slice(0, 5).map((ins) => (
                <li key={ins.id} className={`is-${ins.type}`}>
                  <strong>{ins.title}</strong>
                  <span>{ins.message}</span>
                  {ins.ruleName && <small>Rule: {ins.ruleName}</small>}
                </li>
              ))}
              {current.insights.length === 0 && <li className="is-positive"><strong>No issues found</strong><span>This plan passes every rule right now.</span></li>}
            </ul>
          )}
        </div>
      </div>

      <div className="dw__foot">
        <div className="dw__chips" role="group" aria-label="What-if scenarios">
          {DEMO_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={active.includes(s.id)}
              className={`dw__chip ${active.includes(s.id) ? 'is-on' : ''}`}
              onClick={() => toggleScenario(s.id)}
            >
              {s.label}
            </button>
          ))}
          {active.length > 0 && (
            <button type="button" className="dw__chip dw__chip--ghost" onClick={reset}>Undo all</button>
          )}
        </div>
        <p className="dw__caption" aria-live="polite">
          {caption ?? 'Tap a what-if to see the plan react. Nothing here is saved.'}
        </p>
        {playing && !prefersReducedMotion() && <div className="dw__progress" key={active.length}><span /></div>}
        <Link to={`/demo?event=${encodeURIComponent(base.id)}&tour=1`} className="dw__cta">
          Open the full demo with guided tour →
        </Link>
      </div>
    </div>
  );
}

export default LiveDemoWindow;
