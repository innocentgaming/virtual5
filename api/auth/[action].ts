/**
 * Authentication API (single serverless function, routed by /api/auth/<action>).
 *
 *   POST signup | login | logout | forgot-password | reset-password |
 *        change-password | update-profile | delete-account
 *   GET  me
 */
import { createSessionToken, getDummyHash, hashPassword, newId, randomToken, sha256, verifyPassword } from '../_lib/crypto.js';
import {
  HttpError,
  assertSameOrigin,
  clearSessionCookie,
  getClientIp,
  getSessionUser,
  rateLimit,
  readJson,
  sendJson,
  sessionCookie,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { escapeHtml, isMailerConfigured, sendEmail } from '../_lib/mailer.js';
import { StorageNotConfiguredError, getStore, type Role, type Store, type UserRecord } from '../_lib/store.js';
import {
  ROLES,
  checkPasswordPolicy,
  isValidEmail,
  normalizeEmail,
  toPublicUser,
  validateName,
  validateOrganization,
} from '../_lib/user.js';

const DAY = 24 * 60 * 60;
const REMEMBER_TTL = 30 * DAY;
const SESSION_TTL = DAY;
const RESET_TTL = 30 * 60;
const LOGIN_ERROR = 'Incorrect email or password.';

function issueSession(res: ApiResponse, user: UserRecord, remember: boolean): void {
  const ttl = remember ? REMEMBER_TTL : SESSION_TTL;
  const token = createSessionToken(user.id, user.tokenVersion, ttl);
  res.setHeader('Set-Cookie', sessionCookie(token, remember ? ttl : undefined));
}

function appBaseUrl(req: ApiRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:5173');
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

async function requireUser(req: ApiRequest, store: Store): Promise<UserRecord> {
  const user = await getSessionUser(req, store);
  if (!user) throw new HttpError(401, 'You need to sign in to continue.', 'unauthenticated');
  return user;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Handler = (req: ApiRequest, res: ApiResponse, store: Store) => Promise<void>;

const signup: Handler = async (req, res, store) => {
  const ip = getClientIp(req);
  await rateLimit(store, `signup:${ip}`, 10, 60 * 60);
  const body = await readJson(req, 16 * 1024);

  const name = validateName(body.name);
  const email = normalizeEmail(body.email);
  const role = (ROLES as readonly string[]).includes(String(body.role)) ? (body.role as Role) : 'host';
  if (!name) throw new HttpError(400, 'Please enter your full name (2–80 characters).', 'invalid_name');
  if (!isValidEmail(email)) throw new HttpError(400, 'Please enter a valid email address.', 'invalid_email');
  const pwError = checkPasswordPolicy(body.password, email);
  if (pwError) throw new HttpError(400, pwError, 'weak_password');
  if (body.acceptTerms !== true) throw new HttpError(400, 'Please accept the Terms and Privacy Policy to continue.', 'terms_required');

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: newId('usr'),
    email,
    name,
    role,
    organization: validateOrganization(body.organization),
    passwordHash: await hashPassword(String(body.password)),
    tokenVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (!(await store.createUser(user))) {
    throw new HttpError(409, 'An account with this email already exists. Try signing in instead.', 'email_taken');
  }
  issueSession(res, user, true);
  sendJson(res, 201, { user: toPublicUser(user) });
};

const login: Handler = async (req, res, store) => {
  const ip = getClientIp(req);
  const body = await readJson(req, 16 * 1024);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 128) throw new HttpError(400, 'Enter your email and password.', 'missing_credentials');

  await rateLimit(store, `login-ip:${ip}`, 30, 15 * 60);
  await rateLimit(store, `login-email:${email}`, 8, 15 * 60);

  const id = await store.getUserIdByEmail(email);
  const user = id ? await store.getUser(id) : null;
  // Always burn one scrypt computation so response time does not reveal whether the account exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError(401, LOGIN_ERROR, 'invalid_credentials');

  issueSession(res, user, body.remember !== false);
  sendJson(res, 200, { user: toPublicUser(user) });
};

const logout: Handler = async (req, res, store) => {
  let body: Record<string, unknown> = {};
  try {
    body = await readJson(req, 1024);
  } catch {
    /* body is optional */
  }
  if (body.everywhere === true) {
    const user = await getSessionUser(req, store);
    if (user) await store.updateUser({ ...user, tokenVersion: user.tokenVersion + 1, updatedAt: new Date().toISOString() });
  }
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
};

const me: Handler = async (req, res, store) => {
  const user = await getSessionUser(req, store);
  if (!user) {
    sendJson(res, 200, { user: null }, { 'Set-Cookie': req.headers.cookie?.includes('ew_session') ? clearSessionCookie() : [] });
    return;
  }
  sendJson(res, 200, { user: toPublicUser(user) });
};

const forgotPassword: Handler = async (req, res, store) => {
  const ip = getClientIp(req);
  await rateLimit(store, `forgot-ip:${ip}`, 10, 60 * 60);
  const body = await readJson(req, 4 * 1024);
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new HttpError(400, 'Please enter a valid email address.', 'invalid_email');
  await rateLimit(store, `forgot-email:${email}`, 3, 60 * 60);

  const generic = { ok: true, message: 'If an account exists for that email, a reset link is on its way.' };
  const id = await store.getUserIdByEmail(email);
  const user = id ? await store.getUser(id) : null;
  if (!user) {
    sendJson(res, 200, generic);
    return;
  }

  const token = randomToken();
  await store.putResetToken(sha256(token), user.id, RESET_TTL);
  const link = `${appBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

  if (isMailerConfigured()) {
    const safeName = escapeHtml(user.name.split(' ')[0]);
    await sendEmail({
      to: user.email,
      subject: 'Reset your EventWise AI password',
      text: `Hi ${user.name.split(' ')[0]},\n\nUse this link to choose a new password (valid for 30 minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${safeName},</p><p><a href="${link}">Choose a new password</a> (link valid for 30 minutes).</p><p>If you didn't ask for this, you can safely ignore this email.</p>`,
    });
    sendJson(res, 200, generic);
    return;
  }

  // No mail provider: never expose the link in production (it would allow account takeover).
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!isProd) {
    console.info(`[auth] Password reset link for ${user.email}: ${link}`);
    sendJson(res, 200, { ...generic, devResetLink: link });
  } else {
    console.error('[auth] Password reset requested but RESEND_API_KEY / EMAIL_FROM are not configured.');
    sendJson(res, 200, generic);
  }
};

const resetPassword: Handler = async (req, res, store) => {
  const ip = getClientIp(req);
  await rateLimit(store, `reset-ip:${ip}`, 20, 60 * 60);
  const body = await readJson(req, 4 * 1024);
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.length > 200) throw new HttpError(400, 'This reset link is invalid or has expired.', 'invalid_token');

  const pwError = checkPasswordPolicy(body.password);
  if (pwError) throw new HttpError(400, pwError, 'weak_password');

  const userId = await store.consumeResetToken(sha256(token));
  const user = userId ? await store.getUser(userId) : null;
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.', 'invalid_token');

  await store.updateUser({
    ...user,
    passwordHash: await hashPassword(String(body.password)),
    tokenVersion: user.tokenVersion + 1, // signs out every existing session
    updatedAt: new Date().toISOString(),
  });
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
};

const changePassword: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  await rateLimit(store, `chpw:${user.id}`, 10, 15 * 60);
  const body = await readJson(req, 4 * 1024);
  if (!(await verifyPassword(String(body.currentPassword ?? ''), user.passwordHash))) {
    throw new HttpError(403, 'Your current password is incorrect.', 'invalid_credentials');
  }
  const pwError = checkPasswordPolicy(body.newPassword, user.email);
  if (pwError) throw new HttpError(400, pwError, 'weak_password');

  const updated: UserRecord = {
    ...user,
    passwordHash: await hashPassword(String(body.newPassword)),
    tokenVersion: user.tokenVersion + 1,
    updatedAt: new Date().toISOString(),
  };
  await store.updateUser(updated);
  issueSession(res, updated, true); // keep this device signed in, revoke all others
  sendJson(res, 200, { ok: true });
};

const updateProfile: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  const body = await readJson(req, 4 * 1024);
  const name = body.name === undefined ? user.name : validateName(body.name);
  if (!name) throw new HttpError(400, 'Please enter your full name (2–80 characters).', 'invalid_name');
  const role = body.role === undefined ? user.role : (ROLES as readonly string[]).includes(String(body.role)) ? (body.role as Role) : null;
  if (!role) throw new HttpError(400, 'Unknown role.', 'invalid_role');
  const updated: UserRecord = {
    ...user,
    name,
    role,
    organization: body.organization === undefined ? user.organization : validateOrganization(body.organization),
    updatedAt: new Date().toISOString(),
  };
  await store.updateUser(updated);
  sendJson(res, 200, { user: toPublicUser(updated) });
};

const deleteAccount: Handler = async (req, res, store) => {
  const user = await requireUser(req, store);
  await rateLimit(store, `delacct:${user.id}`, 5, 15 * 60);
  const body = await readJson(req, 4 * 1024);
  if (!(await verifyPassword(String(body.password ?? ''), user.passwordHash))) {
    throw new HttpError(403, 'Password is incorrect.', 'invalid_credentials');
  }
  await store.deleteUser(user);
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
};

const ROUTES: Record<string, { method: 'GET' | 'POST'; handler: Handler }> = {
  signup: { method: 'POST', handler: signup },
  login: { method: 'POST', handler: login },
  logout: { method: 'POST', handler: logout },
  me: { method: 'GET', handler: me },
  'forgot-password': { method: 'POST', handler: forgotPassword },
  'reset-password': { method: 'POST', handler: resetPassword },
  'change-password': { method: 'POST', handler: changePassword },
  'update-profile': { method: 'POST', handler: updateProfile },
  'delete-account': { method: 'POST', handler: deleteAccount },
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
      if (err.status === 429) headers['Retry-After'] = String(err.extra?.retryAfterSeconds ?? 900);
      sendJson(res, err.status, { error: err.message, code: err.code }, headers);
    } else if (err instanceof StorageNotConfiguredError) {
      sendJson(res, 503, { error: err.message, code: 'storage_not_configured' });
    } else {
      console.error('[auth] Unhandled error', err);
      sendJson(res, 500, { error: 'Something went wrong. Please try again.', code: 'server_error' });
    }
  }
}
