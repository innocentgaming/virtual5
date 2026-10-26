// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http, { type Server } from 'node:http';
import authHandler from '../../api/auth/[action].js';
import eventsHandler from '../../api/events.js';
import { setStoreForTesting, MemoryStore } from '../../api/_lib/store.js';

let server: Server;
let baseUrl: string;
let store: MemoryStore;

beforeAll(async () => {
  process.env.AUTH_SECRET = 'this-is-a-super-secret-key-that-is-at-least-32-chars-long';
  process.env.NODE_ENV = 'test';

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    const query: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      query[k] = v;
    }
    (req as unknown as { query: Record<string, string> }).query = query;

    if (pathname.startsWith('/api/auth/')) {
      const action = pathname.slice('/api/auth/'.length).split('/')[0];
      query.action = action;
      await authHandler(req, res);
      return;
    }

    if (pathname === '/api/events') {
      await eventsHandler(req, res);
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  store = new MemoryStore();
  setStoreForTesting(store);
});

function parseCookies(resHeaders: Headers): Record<string, string> {
  const cookieHeader = resHeaders.get('set-cookie');
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(/,(?=[^;]+=[^;]+)/)) {
    const match = part.trim().match(/^([^=]+)=([^;]*)/);
    if (match) {
      cookies[match[1].trim()] = match[2].trim();
    }
  }
  return cookies;
}

describe('Serverless Auth & Cloud Events API', () => {
  it('signs up a new user, logs in, checks /me, and logs out', async () => {
    // 1. Signup
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        email: 'test@eventwise.ai',
        password: 'ValidPassword123!',
        name: 'Priya Sharma',
        role: 'planner',
        acceptTerms: true,
      }),
    });

    expect(signupRes.status).toBe(201);
    const signupData = (await signupRes.json()) as { user: { email: string; name: string } };
    expect(signupData.user.email).toBe('test@eventwise.ai');
    expect(signupData.user.name).toBe('Priya Sharma');

    const signupCookies = parseCookies(signupRes.headers);
    expect(signupCookies['ew_session']).toBeDefined();
    const sessionCookie = `ew_session=${signupCookies['ew_session']}`;

    // 2. Check /me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    expect(meRes.status).toBe(200);
    const meData = (await meRes.json()) as { user: { email: string } };
    expect(meData.user.email).toBe('test@eventwise.ai');

    // 3. Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        Cookie: sessionCookie,
      },
      body: JSON.stringify({}),
    });
    expect(logoutRes.status).toBe(200);
    const logoutCookies = parseCookies(logoutRes.headers);
    expect(logoutCookies['ew_session']).toBe('');

    // 4. Verify logged out (me returns 200 with user: null)
    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `ew_session=${logoutCookies['ew_session']}` },
    });
    expect(meAfterLogout.status).toBe(200);
    const meAfterData = (await meAfterLogout.json()) as { user: unknown };
    expect(meAfterData.user).toBeNull();
  });

  it('rejects duplicate email registrations with 409', async () => {
    const payload = {
      email: 'duplicate@eventwise.ai',
      password: 'StrongPassword123!',
      name: 'Aditi Rao',
      role: 'host',
      acceptTerms: true,
    };

    const res1 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(201);

    const res2 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(409);
    const data = (await res2.json()) as { code: string };
    expect(data.code).toBe('email_taken');
  });

  it('enforces same-origin and JSON content-type security checks', async () => {
    // Cross-origin request
    const crossRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://malicious-site.com',
      },
      body: JSON.stringify({
        email: 'hacker@malicious.com',
        password: 'Password123!',
        name: 'Attacker',
        role: 'host',
        acceptTerms: true,
      }),
    });
    expect(crossRes.status).toBe(403);

    // Non-JSON content type
    const nonJsonRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Origin: baseUrl,
      },
      body: 'email=hacker@malicious.com',
    });
    expect(nonJsonRes.status).toBe(415);
  });

  it('handles full password reset lifecycle and dev reset link', async () => {
    // 1. Create user
    await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'resetme@eventwise.ai',
        password: 'OldPassword123!',
        name: 'Reset User',
        role: 'host',
        acceptTerms: true,
      }),
    });

    // 2. Request forgot-password
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({ email: 'resetme@eventwise.ai' }),
    });
    expect(forgotRes.status).toBe(200);
    const forgotData = (await forgotRes.json()) as { ok: boolean; devResetLink?: string };
    expect(forgotData.ok).toBe(true);
    expect(forgotData.devResetLink).toBeDefined();

    // Extract token from dev reset link
    const resetUrl = new URL(forgotData.devResetLink!);
    const token = resetUrl.searchParams.get('token');
    expect(token).toBeTruthy();

    // 3. Reset password
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        token,
        password: 'NewStrongPassword456!',
      }),
    });
    expect(resetRes.status).toBe(200);

    // 4. Old password should fail
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'resetme@eventwise.ai',
        password: 'OldPassword123!',
      }),
    });
    expect(oldLoginRes.status).toBe(401);

    // 5. New password should succeed
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'resetme@eventwise.ai',
        password: 'NewStrongPassword456!',
      }),
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('revokes existing sessions when password is changed', async () => {
    // 1. Signup
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'revokeme@eventwise.ai',
        password: 'PasswordOne123!',
        name: 'Revoke Test',
        role: 'host',
        acceptTerms: true,
      }),
    });
    const sessionCookie = `ew_session=${parseCookies(signupRes.headers)['ew_session']}`;

    // 2. Change password
    const changeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: 'PasswordOne123!',
        newPassword: 'PasswordTwo456!',
      }),
    });
    expect(changeRes.status).toBe(200);

    // 3. Verify old session token is no longer accepted because tokenVersion was incremented
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    expect(meRes.status).toBe(200);
    const meData = (await meRes.json()) as { user: unknown };
    expect(meData.user).toBeNull();
  });

  it('deletes user account and wipes session', async () => {
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'deleteme@eventwise.ai',
        password: 'MyPassword123!',
        name: 'Delete Me',
        role: 'host',
        acceptTerms: true,
      }),
    });
    const sessionCookie = `ew_session=${parseCookies(signupRes.headers)['ew_session']}`;

    // Delete account
    const delRes = await fetch(`${baseUrl}/api/auth/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ password: 'MyPassword123!' }),
    });
    expect(delRes.status).toBe(200);

    // Try login again
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'deleteme@eventwise.ai',
        password: 'MyPassword123!',
      }),
    });
    expect(loginRes.status).toBe(401);
  });

  it('syncs events, isolates user data, strips secrets, and flags conflicts', async () => {
    // 1. Create User A
    const userARes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'usera@eventwise.ai',
        password: 'UserASecret123!',
        name: 'User A',
        role: 'planner',
        acceptTerms: true,
      }),
    });
    const cookieA = `ew_session=${parseCookies(userARes.headers)['ew_session']}`;

    // 2. Create User B
    const userBRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({
        email: 'userb@eventwise.ai',
        password: 'UserBSecret123!',
        name: 'User B',
        role: 'planner',
        acceptTerms: true,
      }),
    });
    const cookieB = `ew_session=${parseCookies(userBRes.headers)['ew_session']}`;

    // 3. User A uploads events containing sensitive apiKey and secret properties
    const eventWithSecrets = {
      id: 'event-1',
      title: 'Grand Jaipur Wedding',
      eventType: 'wedding',
      budget: 1500000,
      apiKey: 'secret-gemini-key-12345',
      secretToken: 'shh-private',
      timeline: [],
    };

    const putRes = await fetch(`${baseUrl}/api/events`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        events: [eventWithSecrets],
        activeId: 'event-1',
        baseUpdatedAt: 0,
      }),
    });
    expect(putRes.status).toBe(200);
    const putData = (await putRes.json()) as { ok: boolean; updatedAt: number };
    expect(putData.ok).toBe(true);

    // 4. User A fetches events: verify secrets stripped
    const getResA = await fetch(`${baseUrl}/api/events`, {
      headers: { Cookie: cookieA },
    });
    expect(getResA.status).toBe(200);
    const dataA = (await getResA.json()) as { events: Array<Record<string, unknown>> };
    expect(dataA.events.length).toBe(1);
    expect(dataA.events[0].title).toBe('Grand Jaipur Wedding');
    expect(dataA.events[0].apiKey).toBeUndefined();
    expect(dataA.events[0].secretToken).toBeUndefined();

    // 5. User B fetches events: verify isolation
    const getResB = await fetch(`${baseUrl}/api/events`, {
      headers: { Cookie: cookieB },
    });
    expect(getResB.status).toBe(200);
    const dataB = (await getResB.json()) as { events: Array<unknown> };
    expect(dataB.events.length).toBe(0);

    // 6. Test conflict detection: User A sends stale baseUpdatedAt
    const conflictRes = await fetch(`${baseUrl}/api/events`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        events: [{ id: 'event-1', title: 'Conflicting Edit' }],
        activeId: 'event-1',
        baseUpdatedAt: putData.updatedAt - 1000, // Stale!
      }),
    });
    expect(conflictRes.status).toBe(409);
    const conflictData = (await conflictRes.json()) as { code: string; serverCopy: { updatedAt: number } };
    expect(conflictData.code).toBe('conflict');
    expect(conflictData.serverCopy.updatedAt).toBe(putData.updatedAt);
  });
});
