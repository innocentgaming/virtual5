/**
 * Real RSVP flow (single serverless function, routed by /api/rsvp/<action>).
 *
 *   Owner (signed in):  POST create-link | set-closed      GET lookup | responses
 *   Public (guests):    GET info                           POST submit
 *
 * A host creates one unguessable link per event. Guests open /rsvp/<token> (no account needed), answer, and the
 * answer is stored server-side; the host sees it live and can import it into the guest list.
 */
import { audit } from '../_lib/audit.js';
import { randomToken, sha256 } from '../_lib/crypto.js';
import {
  HttpError,
  assertSameOrigin,
  getClientIp,
  getSessionUser,
  rateLimit,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { reportServerError } from '../_lib/log.js';
import { StorageNotConfiguredError, getStore, type RsvpDiet, type RsvpLink, type RsvpResponse, type Store, type UserRecord } from '../_lib/store.js';
import { isValidEmail, normalizeEmail } from '../_lib/user.js';

type Handler = (req: ApiRequest, res: ApiResponse, store: Store) => Promise<void>;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}

function query(req: ApiRequest, name: string): string {
  const raw = req.query?.[name];
  return (Array.isArray(raw) ? raw[0] : raw ?? '').toString();
}

function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

async function requireUser(req: ApiRequest, store: Store): Promise<UserRecord> {
  const user = await getSessionUser(req, store);
  if (!user) throw new HttpError(401, 'You need to sign in to continue.', 'unauthenticated');
  return user;
}

async function ownedLink(store: Store, user: UserRecord, token: unknown): Promise<RsvpLink> {
  const link = validToken(token) ? await store.getRsvpLink(token) : null;
  if (!link || link.userId !== user.id) throw new HttpError(404, 'RSVP link not found.', 'not_found');
  return link;
}

function publicInfo(link: RsvpLink) {
  return { title: link.title, date: link.date ?? null, venue: link.venue ?? null, hosts: link.hosts ?? null, closed: link.closed };
}

const createLink: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  await rateLimit(store, `rsvp-create:${user.id}`, 30, 60 * 60);
  const body = await readJson(req, 8 * 1024);
  const eventId = clean(body.eventId, 80);
  const title = clean(body.title, 120);
  if (!eventId || !title) throw new HttpError(400, 'An event id and title are required.', 'invalid_request');

  const existingToken = await store.getRsvpTokenFor(user.id, eventId);
  const existing = existingToken ? await store.getRsvpLink(existingToken) : null;
  const link: RsvpLink = {
    token: existing?.token ?? randomToken(24),
    userId: user.id,
    eventId,
    title,
    date: clean(body.date, 40) || undefined,
    venue: clean(body.venue, 160) || undefined,
    hosts: clean(body.hosts, 120) || undefined,
    closed: existing?.closed ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await store.putRsvpLink(link);
  if (!existing) await audit(store, req, 'rsvp_link_created', { actor: user, detail: title });
  sendJson(res, existing ? 200 : 201, { token: link.token, closed: link.closed });
};

const lookup: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  const eventId = clean(query(req, 'eventId'), 80);
  const token = eventId ? await store.getRsvpTokenFor(user.id, eventId) : null;
  const link = token ? await store.getRsvpLink(token) : null;
  sendJson(res, 200, link && link.userId === user.id ? { token: link.token, closed: link.closed } : { token: null, closed: false });
};

const setClosed: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  const body = await readJson(req, 2 * 1024);
  const link = await ownedLink(store, user, body.token);
  if (typeof body.closed !== 'boolean') throw new HttpError(400, 'closed must be true or false.', 'invalid_request');
  await store.putRsvpLink({ ...link, closed: body.closed });
  sendJson(res, 200, { ok: true, closed: body.closed });
};

const responses: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  await rateLimit(store, `rsvp-list:${user.id}`, 120, 60);
  const link = await ownedLink(store, user, query(req, 'token'));
  sendJson(res, 200, { link: { ...publicInfo(link), token: link.token }, responses: await store.listRsvpResponses(link.token) });
};

const info: Handler = async (req, res, store) => {
  await rateLimit(store, `rsvp-info:${getClientIp(req)}`, 120, 60 * 60);
  const token = query(req, 'token');
  const link = validToken(token) ? await store.getRsvpLink(token) : null;
  const owner = link ? await store.getUser(link.userId) : null;
  if (!link || !owner || owner.disabled) throw new HttpError(404, 'This RSVP link is not valid.', 'not_found');
  sendJson(res, 200, publicInfo(link), { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
};

const submit: Handler = async (req, res, store) => {
  const ip = getClientIp(req);
  await rateLimit(store, `rsvp-submit-ip:${ip}`, 20, 60 * 60);
  const body = await readJson(req, 4 * 1024);
  if (!validToken(body.token)) throw new HttpError(404, 'This RSVP link is not valid.', 'not_found');

  // Honeypot: real people never fill the hidden "website" field; bots do. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const link = await store.getRsvpLink(body.token);
  const owner = link ? await store.getUser(link.userId) : null;
  if (!link || !owner || owner.disabled) throw new HttpError(404, 'This RSVP link is not valid.', 'not_found');
  if (link.closed) throw new HttpError(403, 'RSVPs for this event are now closed.', 'rsvp_closed');
  await rateLimit(store, `rsvp-submit-token:${link.token}`, 400, 24 * 60 * 60);

  const name = clean(body.name, 80);
  if (name.length < 2) throw new HttpError(400, 'Please enter your name.', 'invalid_name');
  const email = normalizeEmail(body.email);
  if (email && !isValidEmail(email)) throw new HttpError(400, 'That email address does not look right.', 'invalid_email');
  if (typeof body.attending !== 'boolean') throw new HttpError(400, 'Please tell us whether you can come.', 'invalid_request');
  const diet = (['veg', 'jain', 'nonveg'] as const).includes(body.diet as RsvpDiet) ? (body.diet as RsvpDiet) : 'veg';
  const rawGuests = typeof body.guests === 'number' && Number.isInteger(body.guests) ? body.guests : 0;
  const guests = body.attending ? Math.min(5, Math.max(0, rawGuests)) : 0;

  const now = new Date().toISOString();
  const response: RsvpResponse = {
    id: sha256((email || name).toLowerCase()).slice(0, 16),
    name,
    email: email || undefined,
    attending: body.attending,
    guests,
    diet,
    note: clean(body.note, 300) || undefined,
    submittedAt: now,
    updatedAt: now,
  };
  const outcome = await store.upsertRsvpResponse(link.token, response);
  if (outcome === 'full') throw new HttpError(409, 'This event has reached its RSVP limit. Please contact the host directly.', 'rsvp_full');
  sendJson(res, outcome === 'created' ? 201 : 200, { ok: true, updated: outcome === 'updated' });
};

const ROUTES: Record<string, { method: 'GET' | 'POST'; handler: Handler }> = {
  'create-link': { method: 'POST', handler: createLink },
  'set-closed': { method: 'POST', handler: setClosed },
  lookup: { method: 'GET', handler: lookup },
  responses: { method: 'GET', handler: responses },
  info: { method: 'GET', handler: info },
  submit: { method: 'POST', handler: submit },
};

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    const raw = req.query?.action;
    const action = Array.isArray(raw) ? raw[0] : raw ?? new URL(req.url ?? '', 'http://x').pathname.split('/').pop() ?? '';
    const route = Object.hasOwn(ROUTES, action) ? ROUTES[action] : undefined;
    if (!route) throw new HttpError(404, 'Not found.', 'not_found');
    if (req.method !== route.method) {
      res.setHeader('Allow', route.method);
      throw new HttpError(405, `Use ${route.method} for this endpoint.`, 'method_not_allowed');
    }
    if (route.method === 'POST') assertSameOrigin(req);
    await route.handler(req, res, getStore());
  } catch (err) {
    if (err instanceof HttpError) {
      const headers: Record<string, string> = {};
      if (err.status === 429) headers['Retry-After'] = String(err.extra?.retryAfterSeconds ?? 600);
      sendJson(res, err.status, { error: err.message, code: err.code }, headers);
    } else if (err instanceof StorageNotConfiguredError) {
      sendJson(res, 503, { error: err.message, code: 'storage_not_configured' });
    } else {
      reportServerError('rsvp', err);
      sendJson(res, 500, { error: 'Something went wrong. Please try again.', code: 'server_error' });
    }
  }
}