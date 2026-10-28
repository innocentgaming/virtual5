/**
 * Cryptographic helpers for authentication (Node runtime only).
 * - Passwords: scrypt with per-user random salt; parameters are stored in the hash string
 *   so they can be raised later without invalidating existing accounts.
 * - Sessions: compact HMAC-SHA256 signed tokens (header-less JWT-like), verified in constant time.
 * - One-time tokens (password reset): random 256-bit values; only their SHA-256 digest is stored.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const MAX_MEM = 128 * 1024 * 1024;

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: n, r, p, maxmem: MAX_MEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  try {
    const expected = Buffer.from(keyB64, 'base64url');
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64url'), Number(n), Number(r), Number(p));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Used to equalise timing when the account does not exist (prevents user enumeration by latency). */
let dummyHashPromise: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(12).toString('hex'));
  return dummyHashPromise;
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

export interface SessionPayload {
  uid: string;
  /** User token version – bumping it on the user record revokes every outstanding session. */
  tv: number;
  iat: number;
  exp: number;
}

let devSecret: string | null = null;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.ALLOW_MEMORY_STORE === 'true') {
    devSecret ??= 'eventwise_demo_fallback_auth_secret_key_32_chars';
    return devSecret;
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters.');
  }
  // Development convenience: ephemeral secret (sessions reset when the dev server restarts).
  devSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

function sign(data: string): string {
  return createHmac('sha256', getAuthSecret()).update(data).digest('base64url');
}

export function createSessionToken(uid: string, tokenVersion: number, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { uid, tv: tokenVersion, iat: now, exp: now + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || token.length > 1024) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.uid !== 'string' || typeof payload.tv !== 'number' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// One-time tokens & ids
// ---------------------------------------------------------------------------

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}
