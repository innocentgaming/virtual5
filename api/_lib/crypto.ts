/**
 * Cryptographic helpers for authentication (Node runtime only).
 * - Passwords: scrypt with per-user random salt; parameters are stored in the hash string
 *   so they can be raised later without invalidating existing accounts.
 * - Sessions: compact HMAC-SHA256 signed tokens (header-less JWT-like), verified in constant time.
 * - One-time tokens (password reset): random 256-bit values; only their SHA-256 digest is stored.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
let derivedSecret: string | null = null;

/** Reads (or creates, 0600) a random secret stored next to the account data so sessions survive restarts. */
function fileSecret(dir: string): string | null {
  const file = path.join(path.resolve(dir), 'auth-secret');
  const read = (): string | null => {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      return value.length >= 32 ? value : null;
    } catch {
      return null;
    }
  };
  const existing = read();
  if (existing) return existing;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const created = randomBytes(32).toString('hex');
    fs.writeFileSync(file, created, { mode: 0o600, flag: 'wx' });
    return created;
  } catch {
    return read(); // lost a creation race, or the directory is read-only
  }
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;

  // Redis configured but no AUTH_SECRET: derive a private, stable signing key from the database token
  // so that connecting Redis is the only step needed for sessions to survive restarts and instances.
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisToken) {
    derivedSecret ??= createHmac('sha256', 'eventwise-session-secret-v1').update(redisToken).digest('hex');
    return derivedSecret;
  }

  // File-backed accounts (DATA_DIR): keep the signing key on the same disk.
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    const persisted = fileSecret(dataDir);
    if (persisted) return persisted;
  }

  if (process.env.ALLOW_MEMORY_STORE === 'true') {
    devSecret ??= 'eventwise_demo_fallback_auth_secret_key_32_chars';
    return devSecret;
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters.');
  }
  // Development: persist the key in ./.data so "keep me signed in" survives dev-server restarts.
  if (process.env.NODE_ENV !== 'test') {
    const persisted = fileSecret('.data');
    if (persisted) return persisted;
  }
  devSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

export function createSessionToken(userId: string, tokenVersion: number, ttlSeconds: number): string {
  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: userId,
    tv: tokenVersion,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const secret = getAuthSecret();
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number' || typeof payload.tv !== 'number') {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(8).toString('hex')}`;
}
