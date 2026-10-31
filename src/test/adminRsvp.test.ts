// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http, { type Server } from 'node:http';
import authHandler from '../../api/auth/[action].js';
import adminHandler from '../../api/admin/[action].js';
import rsvpHandler from '../../api/rsvp/[action].js';
import healthHandler from '../../api/health.js';
import clientErrorHandler from '../../api/client-error.js';
import { MemoryStore, setStoreForTesting, type Store } from '../../api/_lib/store.js';

/**
 * API, authorization and abuse tests for the admin area and the public RSVP flow.
 * The server below mirrors server.mjs routing so the real handlers run unchanged.
 */

let server: Server;
let base: string;

beforeAll(async () => {
  process.env.AUTH_SECRET = 'this-is-a-super-secret-key-that-is-at-least-32-chars-long';
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const q: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (q[k] = v));
    (req as unknown as { query: Record<string, string> }).query = q;
    const multi = /^\/api\/(auth|admin|rsvp)\/([^/]+)$/.exec(url.pathname);
    if (multi) {
      q.action = multi[2];
      const h = { auth: authHandler, admin: adminHandler, rsvp: rsvpHandler }[multi[1] as 'auth' | 'admin' | 'rsvp'];
      return h(req, res);
    }
    if (url.pathname === '/api/health') return healthHandler(req, res);
    if (url.pathname === '/api/client-error') return clientErrorHandler(req, res);
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  setStoreForTesting(null);
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTesting(store);
});

const call = (method: 'GET' | 'POST', path: string, body?: unknown, cookie?: string, extraHeaders: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const cookieOf = (res: Response) => `ew_session=${/ew_session=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1]}`;

let n = 0;
async function signup(name = 'Person') {
  n += 1;
  const res = await call('POST', '/api/auth/signup', { name: `${name} ${n}`, email: `user${n}@example.com`, password: 'Sunrise#2026x', role: 'host', acceptTerms: true });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { user: { id: string; email: string; isAdmin: boolean } };
  return { cookie: cookieOf(res), user: body.user, email: `user${n}@example.com` };
}

describe('first signup becomes administrator', () => {
  it('only the very first account is an admin', async () => {
    const first = await signup('Owner');
    const second = await signup();
    expect(first.user.isAdmin).toBe(true);
    expect(second.user.isAdmin).toBe(false);
    const me = (await (await call('GET', '/api/auth/me', undefined, second.cookie)).json()) as { user: { isAdmin: boolean; permissions: string[] } };
    expect(me.user.isAdmin).toBe(false);
    expect(me.user.permissions).not.toContain('admin');
  });

  it('two simultaneous first signups can never both become admin', async () => {
    const make = (i: number) =>
      call('POST', '/api/auth/signup', { name: `Racer ${i}`, email: `race${i}@example.com`, password: 'Sunrise#2026x', role: 'host', acceptTerms: true });
    const results = await Promise.all([make(1), make(2), make(3)]);
    const users = await Promise.all(results.map(async (r) => ((await r.json()) as { user: { isAdmin: boolean } }).user));
    expect(users.filter((u) => u.isAdmin).length).toBeLessThanOrEqual(1);
  });

  it('ADMIN_EMAILS promotes a listed email on signup', async () => {
    await signup('Owner');
    process.env.ADMIN_EMAILS = 'vip@example.com';
    try {
      const res = await call('POST', '/api/auth/signup', { name: 'Vip Person', email: 'vip@example.com', password: 'Sunrise#2026x', role: 'host', acceptTerms: true });
      expect(((await res.json()) as { user: { isAdmin: boolean } }).user.isAdmin).toBe(true);
    } finally {
      delete process.env.ADMIN_EMAILS;
    }
  });
});

describe('admin API authorization', () => {
  it('rejects anonymous (401) and non-admin (403) users on every route', async () => {
    const admin = await signup('Owner');
    const normal = await signup();
    for (const [method, path] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/users'], ['GET', '/api/admin/activity'], ['GET', '/api/admin/backup']] as const) {
      expect((await call(method, path)).status).toBe(401);
      expect((await call(method, path, undefined, normal.cookie)).status).toBe(403);
      expect((await call(method, path, undefined, admin.cookie)).status).toBe(200);
    }
    for (const path of ['/api/admin/user-update', '/api/admin/user-revoke', '/api/admin/user-delete']) {
      expect((await call('POST', path, { id: admin.user.id })).status).toBe(401);
      expect((await call('POST', path, { id: admin.user.id, isAdmin: false }, normal.cookie)).status).toBe(403);
    }
  });

  it('a normal user cannot promote themselves through update-profile', async () => {
    await signup('Owner');
    const normal = await signup();
    await call('POST', '/api/auth/update-profile', { isAdmin: true, role: 'planner' }, normal.cookie);
    const me = (await (await call('GET', '/api/auth/me', undefined, normal.cookie)).json()) as { user: { isAdmin: boolean } };
    expect(me.user.isAdmin).toBe(false);
  });

  it('blocks cross-origin admin writes (CSRF)', async () => {
    const admin = await signup('Owner');
    const victim = await signup();
    const res = await call('POST', '/api/admin/user-update', { id: victim.user.id, disabled: true }, admin.cookie, { Origin: 'https://evil.example' });
    expect(res.status).toBe(403);
  });

  it('rejects unknown actions and wrong methods', async () => {
    const admin = await signup('Owner');
    expect((await call('GET', '/api/admin/nope', undefined, admin.cookie)).status).toBe(404);
    expect((await call('POST', '/api/admin/stats', {}, admin.cookie)).status).toBe(405);
  });
});

describe('admin user management', () => {
  it('disabling a user ends their session at once and blocks sign-in', async () => {
    const admin = await signup('Owner');
    const victim = await signup();
    expect((await call('GET', '/api/auth/me', undefined, victim.cookie).then((r) => r.json()) as { user: unknown }).user).not.toBeNull();

    const res = await call('POST', '/api/admin/user-update', { id: victim.user.id, disabled: true }, admin.cookie);
    expect(res.status).toBe(200);

    const me = (await (await call('GET', '/api/auth/me', undefined, victim.cookie)).json()) as { user: unknown };
    expect(me.user).toBeNull();
    const login = await call('POST', '/api/auth/login', { email: victim.email, password: 'Sunrise#2026x' });
    expect(login.status).toBe(403);
    expect(((await login.json()) as { code: string }).code).toBe('account_disabled');

    await call('POST', '/api/admin/user-update', { id: victim.user.id, disabled: false }, admin.cookie);
    expect((await call('POST', '/api/auth/login', { email: victim.email, password: 'Sunrise#2026x' })).status).toBe(200);
  });

  it('protects the last administrator and the acting admin', async () => {
    const admin = await signup('Owner');
    const self = await call('POST', '/api/admin/user-update', { id: admin.user.id, disabled: true }, admin.cookie);
    expect(self.status).toBe(400);
    expect(((await self.json()) as { code: string }).code).toBe('self_action');

    const other = await signup();
    await call('POST', '/api/admin/user-update', { id: other.user.id, isAdmin: true }, admin.cookie);
    // The new admin may not delete the account that is the only OTHER admin once they are the last one standing.
    const demote = await call('POST', '/api/admin/user-update', { id: admin.user.id, isAdmin: false }, other.cookie);
    expect(demote.status).toBe(200);
    const demoteLast = await call('POST', '/api/admin/user-update', { id: other.user.id, isAdmin: false }, other.cookie);
    expect(demoteLast.status).toBe(400);
  });

  it('the only administrator cannot delete their own account', async () => {
    const admin = await signup('Owner');
    const res = await call('POST', '/api/auth/delete-account', { password: 'Sunrise#2026x' }, admin.cookie);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('last_admin');
  });

  it('deleting a user needs the email typed and removes them', async () => {
    const admin = await signup('Owner');
    const victim = await signup();
    const refused = await call('POST', '/api/admin/user-delete', { id: victim.user.id, confirmEmail: 'wrong@example.com' }, admin.cookie);
    expect(refused.status).toBe(400);
    const ok = await call('POST', '/api/admin/user-delete', { id: victim.user.id, confirmEmail: victim.email }, admin.cookie);
    expect(ok.status).toBe(200);
    expect((await call('POST', '/api/auth/login', { email: victim.email, password: 'Sunrise#2026x' })).status).toBe(401);
  });

  it('revoke signs a user out everywhere', async () => {
    const admin = await signup('Owner');
    const victim = await signup();
    await call('POST', '/api/admin/user-revoke', { id: victim.user.id }, admin.cookie);
    const me = (await (await call('GET', '/api/auth/me', undefined, victim.cookie)).json()) as { user: unknown };
    expect(me.user).toBeNull();
  });

  it('lists, searches and paginates users and never leaks password hashes', async () => {
    const admin = await signup('Owner');
    for (let i = 0; i < 6; i += 1) await signup('Guest');
    const all = (await (await call('GET', '/api/admin/users?pageSize=5', undefined, admin.cookie)).json()) as { users: Record<string, unknown>[]; total: number };
    expect(all.total).toBe(7);
    expect(all.users).toHaveLength(5);
    expect(JSON.stringify(all)).not.toMatch(/passwordHash|scrypt/i);
    const found = (await (await call('GET', `/api/admin/users?q=${encodeURIComponent(admin.email.toUpperCase())}`, undefined, admin.cookie)).json()) as { total: number };
    expect(found.total).toBe(1);
    const admins = (await (await call('GET', '/api/admin/users?filter=admins', undefined, admin.cookie)).json()) as { total: number };
    expect(admins.total).toBe(1);
  });

  it('reports stats and records an audit trail', async () => {
    const admin = await signup('Owner');
    await signup();
    await call('POST', '/api/auth/login', { email: admin.email, password: 'wrong-password-1' });
    const stats = (await (await call('GET', '/api/admin/stats', undefined, admin.cookie)).json()) as { totals: Record<string, number>; storage: string; signupsByDay: unknown[] };
    expect(stats.totals.users).toBe(2);
    expect(stats.totals.admins).toBe(1);
    expect(stats.totals.failedLogins24h).toBe(1);
    expect(stats.signupsByDay).toHaveLength(30);
    const act = (await (await call('GET', '/api/admin/activity', undefined, admin.cookie)).json()) as { entries: { type: string }[] };
    const types = act.entries.map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['signup', 'login_failed']));
    const onlyFailed = (await (await call('GET', '/api/admin/activity?type=login_failed', undefined, admin.cookie)).json()) as { entries: { type: string }[] };
    expect(onlyFailed.entries.every((e) => e.type === 'login_failed')).toBe(true);
  });
});

describe('backup and restore', () => {
  it('exports everything and a fresh database restored from it accepts the same password', async () => {
    const admin = await signup('Owner');
    const guest = await signup();
    await call('POST', '/api/rsvp/create-link', { eventId: 'evt1', title: 'Shaadi' }, guest.cookie);
    const res = await call('GET', '/api/admin/backup', undefined, admin.cookie);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="eventwise-backup-/);
    const snapshot = await res.json();
    expect(snapshot.users).toHaveLength(2);
    expect(snapshot.rsvpLinks).toHaveLength(1);

    const fresh = new MemoryStore();
    await fresh.importAll(snapshot);
    setStoreForTesting(fresh);
    expect((await call('POST', '/api/auth/login', { email: guest.email, password: 'Sunrise#2026x' })).status).toBe(200);
    expect((await call('GET', '/api/admin/stats', undefined, (await call('POST', '/api/auth/login', { email: admin.email, password: 'Sunrise#2026x' }).then(cookieOf)))).status).toBe(200);
  });
});

describe('RSVP flow', () => {
  async function eventWithLink() {
    const owner = await signup('Host');
    const create = await call('POST', '/api/rsvp/create-link', { eventId: 'evt1', title: 'Asha weds Ravi', date: '2027-02-14', venue: 'Jaipur' }, owner.cookie);
    expect(create.status).toBe(201);
    const { token } = (await create.json()) as { token: string };
    return { owner, token };
  }
  const answer = (token: string, extra: Record<string, unknown> = {}) =>
    call('POST', '/api/rsvp/submit', { token, name: 'Meera Shah', email: 'meera@example.com', attending: true, guests: 2, diet: 'jain', ...extra });

  it('creating a link needs sign-in and is idempotent per event', async () => {
    expect((await call('POST', '/api/rsvp/create-link', { eventId: 'e', title: 'T' })).status).toBe(401);
    const { owner, token } = await eventWithLink();
    const again = await call('POST', '/api/rsvp/create-link', { eventId: 'evt1', title: 'Renamed' }, owner.cookie);
    expect(again.status).toBe(200);
    expect(((await again.json()) as { token: string }).token).toBe(token);
    const lookup = (await (await call('GET', '/api/rsvp/lookup?eventId=evt1', undefined, owner.cookie)).json()) as { token: string };
    expect(lookup.token).toBe(token);
  });

  it('guests need no account: info is public, answers are stored and shown to the owner only', async () => {
    const { owner, token } = await eventWithLink();
    const info = (await (await call('GET', `/api/rsvp/info?token=${token}`)).json()) as Record<string, unknown>;
    expect(info.title).toBe('Asha weds Ravi');
    expect(JSON.stringify(info)).not.toMatch(/userId|email/i);

    const res = await answer(token);
    expect(res.status).toBe(201);

    const list = (await (await call('GET', `/api/rsvp/responses?token=${token}`, undefined, owner.cookie)).json()) as { responses: { name: string; guests: number; diet: string }[] };
    expect(list.responses).toHaveLength(1);
    expect(list.responses[0]).toMatchObject({ name: 'Meera Shah', guests: 2, diet: 'jain' });

    expect((await call('GET', `/api/rsvp/responses?token=${token}`)).status).toBe(401);
    const stranger = await signup();
    expect((await call('GET', `/api/rsvp/responses?token=${token}`, undefined, stranger.cookie)).status).toBe(404);
    expect((await call('POST', '/api/rsvp/set-closed', { token, closed: true }, stranger.cookie)).status).toBe(404);
  });

  it('a guest answering again updates their row instead of duplicating it', async () => {
    const { owner, token } = await eventWithLink();
    await answer(token);
    const second = await answer(token, { attending: false });
    expect(second.status).toBe(200);
    const list = (await (await call('GET', `/api/rsvp/responses?token=${token}`, undefined, owner.cookie)).json()) as { responses: { attending: boolean; guests: number }[] };
    expect(list.responses).toHaveLength(1);
    expect(list.responses[0]).toMatchObject({ attending: false, guests: 0 });
  });

  it('validates input and clamps extras', async () => {
    const { owner, token } = await eventWithLink();
    expect((await answer(token, { name: 'A' })).status).toBe(400);
    expect((await answer(token, { email: 'not-an-email' })).status).toBe(400);
    expect((await answer(token, { attending: 'yes' })).status).toBe(400);
    expect((await answer('short')).status).toBe(404);
    expect((await answer('x'.repeat(30))).status).toBe(404);
    await answer(token, { guests: 99, diet: 'martian', note: '<script>alert(1)</script>' });
    const list = (await (await call('GET', `/api/rsvp/responses?token=${token}`, undefined, owner.cookie)).json()) as { responses: { guests: number; diet: string; note: string }[] };
    expect(list.responses[0].guests).toBe(5);
    expect(list.responses[0].diet).toBe('veg');
    expect(list.responses[0].note).toBe('<script>alert(1)</script>'); // stored as text; the UI renders it escaped
  });

  it('ignores bots that fill the hidden honeypot field', async () => {
    const { owner, token } = await eventWithLink();
    const res = await answer(token, { website: 'http://spam.example' });
    expect(res.status).toBe(200);
    const list = (await (await call('GET', `/api/rsvp/responses?token=${token}`, undefined, owner.cookie)).json()) as { responses: unknown[] };
    expect(list.responses).toHaveLength(0);
  });

  it('closing RSVPs stops new answers and reopening restores them', async () => {
    const { owner, token } = await eventWithLink();
    await call('POST', '/api/rsvp/set-closed', { token, closed: true }, owner.cookie);
    const refused = await answer(token);
    expect(refused.status).toBe(403);
    expect(((await refused.json()) as { code: string }).code).toBe('rsvp_closed');
    await call('POST', '/api/rsvp/set-closed', { token, closed: false }, owner.cookie);
    expect((await answer(token)).status).toBe(201);
  });

  it('rate limits floods from one address', async () => {
    const { token } = await eventWithLink();
    let limited = 0;
    for (let i = 0; i < 25; i += 1) {
      const res = await answer(token, { name: `Guest ${i}`, email: `g${i}@example.com` });
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });

  it('stops serving a link once its owner is deleted or disabled', async () => {
    const admin = await signup('Owner');
    const host = await signup('Host');
    const { token } = (await (await call('POST', '/api/rsvp/create-link', { eventId: 'e1', title: 'Party' }, host.cookie)).json()) as { token: string };
    expect((await call('GET', `/api/rsvp/info?token=${token}`)).status).toBe(200);
    await call('POST', '/api/admin/user-update', { id: host.user.id, disabled: true }, admin.cookie);
    expect((await call('GET', `/api/rsvp/info?token=${token}`)).status).toBe(404);
    expect((await answer(token)).status).toBe(404);
  });

  it('refuses cross-origin submissions', async () => {
    const { token } = await eventWithLink();
    const res = await call('POST', '/api/rsvp/submit', { token, name: 'Bot Person', attending: true }, undefined, { Origin: 'https://evil.example' });
    expect(res.status).toBe(403);
  });
});

describe('health and client error reporting', () => {
  it('health is OK with a working database and 503 when it is down, without leaking details', async () => {
    const ok = await call('GET', '/api/health');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ status: 'ok', storage: 'memory' });

    const broken = new MemoryStore() as Store;
    broken.ping = async () => {
      throw new Error('redis password=hunter2 unreachable');
    };
    setStoreForTesting(broken);
    const bad = await call('GET', '/api/health');
    expect(bad.status).toBe(503);
    expect(JSON.stringify(await bad.json())).not.toMatch(/hunter2|redis/i);
  });

  it('accepts browser error reports and rejects cross-origin ones', async () => {
    expect((await call('POST', '/api/client-error', { message: 'boom', stack: 'at x' })).status).toBe(202);
    expect((await call('POST', '/api/client-error', { message: 'boom' }, undefined, { Origin: 'https://evil.example' })).status).toBe(403);
  });
});