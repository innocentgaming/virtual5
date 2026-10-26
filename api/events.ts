/**
 * Per-user event cloud sync.
 *   GET /api/events  -> { events, activeId, updatedAt }
 *   PUT /api/events  -> { ok, updatedAt }   (last write wins; client sends baseUpdatedAt for conflict hints)
 */
import { HttpError, assertSameOrigin, getSessionUser, rateLimit, readJson, sendJson, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { StorageNotConfiguredError, getStore } from './_lib/store.js';

const MAX_EVENTS = 50;
const MAX_BYTES = 1024 * 1024;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    const store = getStore();
    const user = await getSessionUser(req, store);
    if (!user) throw new HttpError(401, 'You need to sign in to continue.', 'unauthenticated');

    if (req.method === 'GET') {
      const doc = await store.getEvents(user.id);
      sendJson(res, 200, doc ?? { events: [], activeId: null, updatedAt: 0 });
      return;
    }

    if (req.method === 'PUT') {
      assertSameOrigin(req);
      await rateLimit(store, `events-put:${user.id}`, 240, 60);
      const body = await readJson(req, MAX_BYTES);
      const events = body.events;
      if (!Array.isArray(events) || events.length > MAX_EVENTS) {
        throw new HttpError(400, `events must be an array of at most ${MAX_EVENTS} plans.`, 'invalid_events');
      }
      for (const e of events) {
        const rec = e as Record<string, unknown> | null;
        if (!rec || typeof rec !== 'object' || typeof rec.id !== 'string' || typeof rec.title !== 'string') {
          throw new HttpError(400, 'Each event must have an id and title.', 'invalid_events');
        }
        // Never persist anything that looks like a credential, even if a client mistakenly includes it.
        for (const key of Object.keys(rec)) {
          if (/apiKey|secret|token/i.test(key)) {
            delete rec[key];
          }
        }
      }
      const activeId = typeof body.activeId === 'string' ? body.activeId.slice(0, 80) : null;
      const baseUpdatedAt = typeof body.baseUpdatedAt === 'number' ? body.baseUpdatedAt : null;
      const current = await store.getEvents(user.id);
      if (current && baseUpdatedAt !== null && current.updatedAt > baseUpdatedAt && body.force !== true) {
        // Another device saved newer data – let the client decide instead of silently overwriting.
        sendJson(res, 409, { error: 'Your plans were changed on another device.', code: 'conflict', serverCopy: current, ...current });
        return;
      }
      const updatedAt = Date.now();
      await store.putEvents(user.id, { events, activeId, updatedAt });
      sendJson(res, 200, { ok: true, updatedAt });
      return;
    }

    res.setHeader('Allow', 'GET, PUT');
    throw new HttpError(405, 'Method not allowed.', 'method_not_allowed');
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message, code: err.code });
    } else if (err instanceof StorageNotConfiguredError) {
      sendJson(res, 503, { error: err.message, code: 'storage_not_configured' });
    } else {
      console.error('[events] Unhandled error', err);
      sendJson(res, 500, { error: 'Something went wrong. Please try again.', code: 'server_error' });
    }
  }
}
