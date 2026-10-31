import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifySessionToken, type SessionPayload } from './crypto.js';
import type { Store, UserRecord } from './store.js';

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}
export type ApiResponse = ServerResponse;

export const SESSION_COOKIE = 'ew_session';
const MAX_BODY_BYTES = 1024 * 1024 * 1.5;

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly extra?: Record<string, unknown>;
  constructor(status: number, message: string, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function sendJson(res: ApiResponse, status: number, body: unknown, headers: Record<string, string | string[]> = {}): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

export async function readJson(req: ApiRequest, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  const type = String(req.headers['content-type'] ?? '');
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }
  if (req.body !== undefined && req.body !== null) {
    const parsed = typeof req.body === 'string' ? safeParse(req.body) : req.body;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body too large.');
    chunks.push(buf);
  }
  const parsed = safeParse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      /* ignore malformed cookie */
    }
  }
  return out;
}

function isSecureContext(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'production';
}

/** `maxAgeSeconds` undefined => browser-session cookie. */
export function sessionCookie(token: string, maxAgeSeconds?: number): string {
  const attrs = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAgeSeconds !== undefined) attrs.push(`Max-Age=${maxAgeSeconds}`);
  if (isSecureContext()) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookie(): string {
  const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureContext()) attrs.push('Secure');
  return attrs.join('; ');
}

/**
 * Best-effort client IP for rate limiting. Platform-set headers win over the client-controllable
 * X-Forwarded-For chain, which anyone can prepend values to when the app is not behind a trusted proxy.
 */
export function getClientIp(req: IncomingMessage): string {
  for (const name of ['x-vercel-forwarded-for', 'x-real-ip'] as const) {
    const value = req.headers[name];
    if (typeof value === 'string' && value.trim()) return value.split(',')[0].trim();
  }
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * CSRF defence for state-changing requests (in addition to SameSite=Lax + JSON-only bodies):
 * - when the browser sends an Origin header it must match the host serving the API;
 * - when Origin is missing, a browser-declared cross-site fetch (Sec-Fetch-Site) is still refused.
 */
export function assertSameOrigin(req: IncomingMessage): void {
  const origin = req.headers.origin;
  if (!origin) {
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      throw new HttpError(403, 'Cross-origin request blocked.', 'forbidden_origin');
    }
    return;
  }
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '');
  try {
    if (new URL(String(origin)).host !== host) throw new Error('mismatch');
  } catch {
    throw new HttpError(403, 'Cross-origin request blocked.', 'forbidden_origin');
  }
}

export function getSessionPayload(req: ApiRequest): SessionPayload | null {
  return verifySessionToken(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
}

export async function getSessionUser(req: ApiRequest, store: Store): Promise<UserRecord | null> {
  const cookies = parseCookies(req.headers.cookie);
  const payload = verifySessionToken(cookies[SESSION_COOKIE]);
  if (!payload) return null;
  const user = await store.getUser(payload.uid);
  if (!user || user.tokenVersion !== payload.tv) return null;
  return user;
}

export async function rateLimit(store: Store, key: string, max: number, windowSeconds: number): Promise<void> {
  const count = await store.incr(key, windowSeconds);
  if (count > max) {
    throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.', 'rate_limited', {
      retryAfterSeconds: windowSeconds,
    });
  }
}
