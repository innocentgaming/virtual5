import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { passwordStrength } from './passwordStrength';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  showStrength?: boolean;
  hint?: string;
  className?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange, autoComplete, showStrength, hint, className }) => {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  return (
    <div className={`form-group ${className ?? ''}`} style={{ marginBottom: 0 }}>
      <label htmlFor={id} className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="form-control"
          style={{ paddingRight: '2.75rem' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          maxLength={128}
          aria-describedby={showStrength ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)', padding: 8, display: 'flex' }}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {showStrength && (
        <div id={`${id}-hint`} style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= strength.level ? (strength.level >= 3 ? 'var(--color-success)' : strength.level === 2 ? 'var(--color-warning)' : 'var(--color-danger)') : 'var(--border)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {value ? `Strength: ${strength.label}. ` : ''}
            {hint ?? 'Use at least 8 characters. A short phrase works well.'}
          </span>
        </div>
      )}
    </div>
  );
};
