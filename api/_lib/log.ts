/**
 * Structured (JSON-lines) logging plus an optional alert webhook for server errors.
 *
 * Every line is a single JSON object so Render / Vercel / any log drain can filter on `level`, `msg`, `route`.
 * Set ALERT_WEBHOOK_URL (Slack / Discord / Teams "incoming webhook" compatible: `{ "text": ... }`) to be
 * pinged when the API hits an unexpected error. Alerts are throttled to one per minute per instance.
 */
type Level = 'info' | 'warn' | 'error';

export function logEvent(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

let lastAlert = 0;

export function errorMessageOf(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

/** Logs an unexpected server error and (best effort, throttled) pings the alert webhook. */
export function reportServerError(route: string, err: unknown, extra: Record<string, unknown> = {}): void {
  logEvent('error', 'unhandled_error', { route, error: errorMessageOf(err), stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join(' | ') : undefined, ...extra });
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url || Date.now() - lastAlert < 60_000) return;
  lastAlert = Date.now();
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `EventWise AI error on ${route}: ${errorMessageOf(err)}`.slice(0, 500) }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => undefined);
}