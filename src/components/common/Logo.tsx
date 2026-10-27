import React from 'react';
import '../../logo.css';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Hide the marigold toran garland (e.g. in very tight spaces) */
  plain?: boolean;
  className?: string;
}

const BEADS: { cx: number; cy: number; color: string }[] = [
  { cx: 19, cy: 7.3, color: 'var(--logo-marigold)' },
  { cx: 44.5, cy: 12, color: 'var(--logo-rani)' },
  { cx: 70, cy: 14.5, color: 'var(--logo-marigold)' },
  { cx: 87, cy: 15, color: 'var(--logo-rani)' },
  { cx: 104, cy: 14.5, color: 'var(--logo-marigold)' },
  { cx: 129.5, cy: 12, color: 'var(--logo-rani)' },
  { cx: 155, cy: 7.3, color: 'var(--logo-marigold)' },
];

/**
 * EventWise AI wordmark with a toran (door garland) strung beneath it.
 * Purely decorative: pair it with visible or screen-reader text that names the brand.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', plain = false, className = '' }) => (
  <span className={`ew-logo ew-logo--${size} ${className}`.trim()} aria-hidden="true">
    <span className="ew-logo__row">
      <span className="ew-logo__word">
        Event<b>Wise</b>
      </span>
      <span className="ew-logo__ai">AI</span>
    </span>
    {!plain && (
      <svg className="ew-logo__toran" viewBox="0 0 174 22" preserveAspectRatio="none" focusable="false">
        <path d="M2 3 Q87 27 172 3" fill="none" stroke="var(--logo-marigold)" strokeWidth="1.6" strokeLinecap="round" />
        {BEADS.map((b) => (
          <circle key={b.cx} cx={b.cx} cy={b.cy} r="3.4" fill={b.color} />
        ))}
      </svg>
    )}
  </span>
);

export default Logo;
