// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import http, { type Server } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import authHandler from '../../api/auth/[action].js';
import { FileStore, MemoryStore, setStoreForTesting, type UserRecord } from '../../api/_lib/store.js';
import { createSessionToken } from '../../api/_lib/crypto.js';

/**
 * Regression tests for "I registered, but now my correct password is rejected".
 * Accounts kept only in server memory vanish on every restart / cold start, so the store must be able to
 * persist, and a "keep me signed in" session must stay valid across a restart and be renewed while in use.
 */

let server: Server;
let baseUrl: string;
let dir: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = 'this-is-a-super-secret-key-that-is-at-least-32-chars-long';
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const action = url.pathname.slice('/api/auth/'.length).split('/')[0];
    (req as unknown as { query: Record<string, string> }).query = { action };
    await authHandler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  setStoreForTesting(null);
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

const post = (action: string, body: unknown, cookie?: string) =>
  fetch(`${baseUrl}/api/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });

const sessionOf = (res: Response) => /ew_session=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1];

const SIGNUP = { email: 'asha@example.com', password: 'Sunrise#2026x', name: 'Asha Rao', role: 'host', acceptTerms: true };

function tmpDir() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-store-'));
  return dir;
}

describe('FileStore', () => {
  it('keeps accounts across a restart (a fresh store reading the same directory)', async () => {
    const d = tmpDir();
    setStoreForTesting(new FileStore(d));
    const signup = await post('signup', SIGNUP);
    expect(signup.status).toBe(201);
    const cookie = `ew_session=${sessionOf(signup)}`;

    // "Restart": brand-new store instance, nothing carried over in memory.
    setStoreForTesting(new FileStore(d));

    const login = await post('login', { email: SIGNUP.email, password: SIGNUP.password, remember: true });
    expect(login.status).toBe(200);

    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    const data = (await me.json()) as { user: { email: string } | null; storage: string };
    expect(data.user?.email).toBe(SIGNUP.email);
    expect(data.storage).toBe('file');
  });

  it('still rejects a wrong password after a restart', async () => {
    const d = tmpDir();
    setStoreForTesting(new FileStore(d));
    await post('signup', SIGNUP);
    setStoreForTesting(new FileStore(d));
    const login = await post('login', { email: SIGNUP.email, password: 'Not-the-password1' });
    expect(login.status).toBe(401);
  });

  it('shows why the memory store is the culprit: the same login fails after a restart', async () => {
    setStoreForTesting(new MemoryStore());
    await post('signup', SIGNUP);
    setStoreForTesting(new MemoryStore());
    const login = await post('login', { email: SIGNUP.email, password: SIGNUP.password });
    expect(login.status).toBe(401);
    const me = await fetch(`${baseUrl}/api/auth/me`);
    expect(((await me.json()) as { storage: string }).storage).toBe('memory');
  });

  it('keeps a backup instead of overwriting a corrupted store file', () => {
    const d = tmpDir();
    fs.writeFileSync(path.join(d, 'eventwise-store.json'), '{ not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    new FileStore(d);
    expect(fs.readdirSync(d).some((f) => f.includes('.corrupt-'))).toBe(true);
  });

  it('does not leave temp files behind and writes the file privately', async () => {
    const d = tmpDir();
    const store = new FileStore(d);
    const user: UserRecord = {
      id: 'usr_1', email: 'a@b.co', name: 'A B', role: 'host', passwordHash: 'x', tokenVersion: 1,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await store.createUser(user);
    expect(fs.readdirSync(d)).toEqual(['eventwise-store.json']);
    if (process.platform !== 'win32') expect(fs.statSync(path.join(d, 'eventwise-store.json')).mode & 0o077).toBe(0);
  });
});

describe('keep me signed in', () => {
  const DAY = 86_400;
  const setup = async () => {
    setStoreForTesting(new MemoryStore());
    const signup = await post('signup', SIGNUP);
    const body = (await signup.json()) as { user: { id: string } };
    return body.user.id;
  };

  it('renews a remembered session that is at least a day old', async () => {
    const uid = await setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() - 3 * DAY * 1000);
    const old = createSessionToken(uid, 1, 30 * DAY);
    vi.useRealTimers();

    const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: `ew_session=${old}` } });
    expect(((await res.json()) as { user: unknown }).user).not.toBeNull();
    const renewed = res.headers.get('set-cookie') ?? '';
    expect(renewed).toContain('ew_session=');
    expect(renewed).toContain(`Max-Age=${30 * DAY}`);
    expect(sessionOf(res)).not.toBe(old);
  });

  it('does not re-issue a brand-new session, nor stretch a browser-session one', async () => {
    const uid = await setup();
    const fresh = createSessionToken(uid, 1, 30 * DAY);
    const r1 = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: `ew_session=${fresh}` } });
    expect(r1.headers.get('set-cookie')).toBeNull();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() - 2 * 3600 * 1000);
    const shortLived = createSessionToken(uid, 1, DAY); // not "remembered"
    vi.useRealTimers();
    const r2 = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: `ew_session=${shortLived}` } });
    expect(r2.headers.get('set-cookie')).toBeNull();
  });

  it('login and signup issue a 30-day cookie by default', async () => {
    setStoreForTesting(new MemoryStore());
    const signup = await post('signup', SIGNUP);
    expect(signup.headers.get('set-cookie')).toContain(`Max-Age=${30 * DAY}`);
    const login = await post('login', { email: SIGNUP.email, password: SIGNUP.password });
    expect(login.headers.get('set-cookie')).toContain(`Max-Age=${30 * DAY}`);
    const noRemember = await post('login', { email: SIGNUP.email, password: SIGNUP.password, remember: false });
    expect(noRemember.headers.get('set-cookie')).not.toContain('Max-Age');
  });
});

describe('session signing secret', () => {
  async function freshCrypto() {
    vi.resetModules();
    return import('../../api/_lib/crypto.js');
  }
  function noEnvSecrets() {
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
    vi.stubEnv('ALLOW_MEMORY_STORE', '');
  }

  it('is stable across restarts when accounts live in DATA_DIR', async () => {
    noEnvSecrets();
    vi.stubEnv('DATA_DIR', tmpDir());
    const first = (await freshCrypto()).getAuthSecret();
    const second = (await freshCrypto()).getAuthSecret();
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(second).toBe(first);
  });

  it('is derived from the Redis token when AUTH_SECRET is missing, so Redis alone is enough', async () => {
    noEnvSecrets();
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-token-abc');
    const a = (await freshCrypto()).getAuthSecret();
    const b = (await freshCrypto()).getAuthSecret();
    expect(a).toBe(b);
    expect(a).not.toContain('redis-token-abc');
  });
});

