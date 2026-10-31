/** Sends an uncaught UI error to the server log (best effort, rate-limited server side). */
let sent = 0;

export function reportClientError(error: unknown, context = ''): void {
  if (sent >= 5 || typeof window === 'undefined') return; // never spam the endpoint from a render loop
  sent += 1;
  const err = error instanceof Error ? error : new Error(String(error));
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        message: `${context ? `${context}: ` : ''}${err.message}`,
        stack: err.stack,
        url: window.location.pathname,
      }),
    }).catch(() => undefined);
  } catch {
    /* reporting must never throw */
  }
}