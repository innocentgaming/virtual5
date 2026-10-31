/**
 * POST /api/client-error – the browser reports an uncaught UI error here so it shows up in server logs
 * (and the optional ALERT_WEBHOOK_URL), instead of dying silently on someone's phone.
 */
import { HttpError, assertSameOrigin, getClientIp, rateLimit, readJson, sendJson, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { logEvent } from './_lib/log.js';
import { getStore } from './_lib/store.js';

const short = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').slice(0, n) : undefined);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Method not allowed.', 'method_not_allowed');
    }
    assertSameOrigin(req);
    await rateLimit(getStore(), `client-error:${getClientIp(req)}`, 20, 60 * 60);
    const body = await readJson(req, 8 * 1024);
    logEvent('error', 'client_error', {
      message: short(body.message, 300),
      stack: short(body.stack, 1500),
      url: short(body.url, 200),
      userAgent: short(req.headers['user-agent'], 160),
    });
    sendJson(res, 202, { ok: true });
  } catch (err) {
    if (err instanceof HttpError) sendJson(res, err.status, { error: err.message, code: err.code });
    else sendJson(res, 202, { ok: false }); // reporting must never produce a loud failure
  }
}