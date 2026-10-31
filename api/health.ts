/**
 * GET /api/health – liveness + database check for uptime monitors and Render's health check.
 * Returns 200 {status:"ok"} or 503 {status:"degraded"}. It never exposes secrets or error details.
 */
import { sendJson, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { logEvent } from './_lib/log.js';
import { getStore } from './_lib/store.js';

const startedAt = Date.now();

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendJson(res, 405, { error: 'Method not allowed.', code: 'method_not_allowed' });
    return;
  }
  try {
    const store = getStore();
    await store.ping();
    sendJson(res, 200, {
      status: 'ok',
      storage: store.kind,
      persistent: store.kind !== 'memory',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    });
  } catch (err) {
    logEvent('error', 'health_check_failed', { error: String(err) });
    sendJson(res, 503, { status: 'degraded', time: new Date().toISOString() });
  }
}