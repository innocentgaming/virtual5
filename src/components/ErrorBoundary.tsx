import React from 'react';
import { reportClientError } from '../utils/reportError';

interface State {
  failed: boolean;
}

/** Last line of defence: a crash in one screen shows a friendly recovery page instead of a blank white screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError(error, info.componentStack?.split('\n')[1]?.trim() ?? 'render');
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            The page hit an unexpected problem. Your saved plans are safe. Reload to continue; if it keeps happening, tell us and we will fix it.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      </main>
    );
  }
}