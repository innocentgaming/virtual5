import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (typeof window !== 'undefined' && (window as unknown as { reportClientError?: (err: unknown, ctx: string) => void }).reportClientError) {
      (window as unknown as { reportClientError: (err: unknown, ctx: string) => void }).reportClientError(
        error,
        errorInfo.componentStack || 'ErrorBoundary'
      );
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('eventwise_plan');
      localStorage.removeItem('eventwise_events');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg, #0f172a)',
            color: 'var(--color-text, #f8fafc)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border, #334155)',
              backgroundColor: 'var(--color-surface, #1e293b)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#f87171' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem', color: '#94a3b8' }}>
              EventWise AI encountered an unexpected client error. Your event data has been safely preserved in local storage.
            </p>
            {this.state.error && (
              <pre
                style={{
                  fontSize: '0.8rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontWeight: 500,
                  border: '1px solid #475569',
                  cursor: 'pointer',
                }}
              >
                Reset Event Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
