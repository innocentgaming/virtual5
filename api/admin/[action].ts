/**
 * Admin API (single serverless function, routed by /api/admin/<action>). Every route is admin-only and the
 * check happens here on the server – hiding the button in the UI is not authorization.
 *
 *   GET  stats | users | activity | backup
 *   POST user-update | user-revoke | user-delete
 */
import { audit } from '../_lib/audit.js';
import {
  HttpError,
  assertSameOrigin,
  rateLimit,
  readJson,
  requireAdmin,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { reportServerError } from '../_lib/log.js';
import { StorageNotConfiguredError, getStore, type Role, type Store, type UserRecord } from '../_lib/store.js';
import { ROLES } from '../_lib/user.js';

const MAX_USERS_SCANNED = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Handler = (req: ApiRequest, res: ApiResponse, store: Store, admin: UserRecord) => Promise<void>;

async function loadUsers(store: Store): Promise<UserRecord[]> {
  const ids = (await store.listUserIds()).slice(0, MAX_USERS_SCANNED);
  const users: UserRecord[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = await Promise.all(ids.slice(i, i + 50).map((id) => store.getUser(id)));
    for (const u of chunk) if (u) users.push(u);
  }
  return users;
}

async function eventCountOf(store: Store, userId: string): Promise<number> {
  const doc = await store.getEvents(userId);
  return doc?.events.length ?? 0;
}

function adminRow(u: UserRecord, eventCount?: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    organization: u.organization ?? null,
    isAdmin: u.isAdmin === true,
    disabled: u.disabled === true,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
    ...(eventCount === undefined ? {} : { eventCount }),
  };
}

function queryString(req: ApiRequest, name: string): string {
  const raw = req.query?.[name];
  return (Array.isArray(raw) ? raw[0] : raw ?? '').toString();
}

function boundedInt(value: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

const stats: Handler = async (_req, res, store) => {
  const users = await loadUsers(store);
  const now = Date.now();
  const byRole: Record<Role, number> = { planner: 0, host: 0, vendor: 0 };
  const perDay = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) perDay.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), 0);
  let admins = 0;
  let disabled = 0;
  let new7 = 0;
  let new30 = 0;
  let active30 = 0;
  for (const u of users) {
    byRole[u.role] += 1;
    if (u.isAdmin) admins += 1;
    if (u.disabled) disabled += 1;
    const created = Date.parse(u.createdAt);
    if (now - created <= 7 * DAY_MS) new7 += 1;
    if (now - created <= 30 * DAY_MS) new30 += 1;
    if (u.lastLoginAt && now - Date.parse(u.lastLoginAt) <= 30 * DAY_MS) active30 += 1;
    const day = u.createdAt.slice(0, 10);
    if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  let events = 0;
  let usersWithEvents = 0;
  for (let i = 0; i < users.length; i += 25) {
    const counts = await Promise.all(users.slice(i, i + 25).map((u) => eventCountOf(store, u.id)));
    for (const c of counts) {
      events += c;
      if (c > 0) usersWithEvents += 1;
    }
  }

  const recent = await store.listAudit(500);
  const failedLogins24h = recent.filter((a) => a.type === 'login_failed' && now - Date.parse(a.at) <= DAY_MS).length;

  sendJson(res, 200, {
    storage: store.kind,
    generatedAt: new Date(now).toISOString(),
    totals: { users: users.length, admins, disabled, events, usersWithEvents, new7, new30, active30, failedLogins24h },
    byRole,
    signupsByDay: [...perDay.entries()].map(([date, count]) => ({ date, count })),
    truncated: users.length >= MAX_USERS_SCANNED,
  });
};

const users: Handler = async (req, res, store) => {
  const q = queryString(req, 'q').trim().toLowerCase().slice(0, 80);
  const page = boundedInt(queryString(req, 'page'), 1, 1, 10_000);
  const pageSize = boundedInt(queryString(req, 'pageSize'), 20, 5, 50);
  const filter = queryString(req, 'filter');

  let all = await loadUsers(store);
  if (q) all = all.filter((u) => u.email.includes(q) || u.name.toLowerCase().includes(q) || (u.organization ?? '').toLowerCase().includes(q));
  if (filter === 'admins') all = all.filter((u) => u.isAdmin);
  else if (filter === 'disabled') all = all.filter((u) => u.disabled);
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const slice = all.slice((page - 1) * pageSize, page * pageSize);
  const rows = await Promise.all(slice.map(async (u) => adminRow(u, await eventCountOf(store, u.id))));
  sendJson(res, 200, { users: rows, total: all.length, page, pageSize });
};

async function otherActiveAdmins(store: Store, exceptId: string): Promise<number> {
  return (await loadUsers(store)).filter((u) => u.isAdmin && !u.disabled && u.id !== exceptId).length;
}

async function targetOf(req: ApiRequest, store: Store, admin: UserRecord): Promise<{ target: UserRecord; body: Record<string, unknown> }> {
  const body = await readJson(req, 4 * 1024);
  const id = typeof body.id === 'string' ? body.id.slice(0, 80) : '';
  const target = id ? await store.getUser(id) : null;
  if (!target) throw new HttpError(404, 'That user no longer exists.', 'not_found');
  if (target.id === admin.id) {
    throw new HttpError(400, 'You cannot do that to your own account. Ask another administrator.', 'self_action');
  }
  return { target, body };
}

const userUpdate: Handler = async (req, res, store, admin) => {
  const { target, body } = await targetOf(req, store, admin);
  const next: UserRecord = { ...target, updatedAt: new Date().toISOString() };
  const changes: string[] = [];

  if (body.role !== undefined) {
    if (!(ROLES as readonly string[]).includes(String(body.role))) throw new HttpError(400, 'Unknown role.', 'invalid_role');
    if (next.role !== body.role) changes.push(`role ${next.role}→${String(body.role)}`);
    next.role = body.role as Role;
  }
  if (body.isAdmin !== undefined) {
    if (typeof body.isAdmin !== 'boolean') throw new HttpError(400, 'isAdmin must be true or false.', 'invalid_request');
    if (!body.isAdmin && target.isAdmin && (await otherActiveAdmins(store, target.id)) < 1) {
      throw new HttpError(400, 'There must always be at least one active administrator.', 'last_admin');
    }
    if (next.isAdmin !== body.isAdmin) changes.push(body.isAdmin ? 'made admin' : 'removed admin');
    next.isAdmin = body.isAdmin;
  }
  if (body.disabled !== undefined) {
    if (typeof body.disabled !== 'boolean') throw new HttpError(400, 'disabled must be true or false.', 'invalid_request');
    if (body.disabled && target.isAdmin && (await otherActiveAdmins(store, target.id)) < 1) {
      throw new HttpError(400, 'There must always be at least one active administrator.', 'last_admin');
    }
    if ((next.disabled === true) !== body.disabled) changes.push(body.disabled ? 'disabled' : 'enabled');
    next.disabled = body.disabled;
    if (body.disabled) next.tokenVersion += 1; // cuts off every open session immediately
  }
  if (changes.length === 0) {
    sendJson(res, 200, { user: adminRow(target) });
    return;
  }
  await store.updateUser(next);
  await audit(store, req, 'admin_user_updated', { actor: admin, target: next, detail: changes.join(', ') });
  sendJson(res, 200, { user: adminRow(next) });
};

const userRevoke: Handler = async (req, res, store, admin) => {
  const { target } = await targetOf(req, store, admin);
  await store.updateUser({ ...target, tokenVersion: target.tokenVersion + 1, updatedAt: new Date().toISOString() });
  await audit(store, req, 'admin_sessions_revoked', { actor: admin, target });
  sendJson(res, 200, { ok: true });
};

const userDelete: Handler = async (req, res, store, admin) => {
  const { target, body } = await targetOf(req, store, admin);
  if (body.confirmEmail !== target.email) {
    throw new HttpError(400, 'Type the user\'s email to confirm deletion.', 'confirmation_required');
  }
  if (target.isAdmin && (await otherActiveAdmins(store, target.id)) < 1) {
    throw new HttpError(400, 'There must always be at least one active administrator.', 'last_admin');
  }
  await store.deleteUser(target);
  await audit(store, req, 'admin_user_deleted', { actor: admin, target });
  sendJson(res, 200, { ok: true });
};

const activity: Handler = async (req, res, store) => {
  const limit = boundedInt(queryString(req, 'limit'), 100, 1, 500);
  const type = queryString(req, 'type').slice(0, 40);
  const rows = await store.listAudit(500);
  const filtered = (type ? rows.filter((r) => r.type === type) : rows).slice(0, limit);
  sendJson(res, 200, { entries: filtered });
};

const backup: Handler = async (req, res, store, admin) => {
  await rateLimit(store, `admin-backup:${admin.id}`, 6, 60 * 60);
  const snapshot = await store.exportAll();
  await audit(store, req, 'admin_backup_downloaded', { actor: admin, detail: `${snapshot.users.length} users` });
  const stamp = snapshot.createdAt.replace(/[:.]/g, '-');
  sendJson(res, 200, snapshot, { 'Content-Disposition': `attachment; filename="eventwise-backup-${stamp}.json"` });
};

const ROUTES: Record<string, { method: 'GET' | 'POST'; handler: Handler }> = {
  stats: { method: 'GET', handler: stats },
  users: { method: 'GET', handler: users },
  activity: { method: 'GET', handler: activity },
  backup: { method: 'GET', handler: backup },
  'user-update': { method: 'POST', handler: userUpdate },
  'user-revoke': { method: 'POST', handler: userRevoke },
  'user-delete': { method: 'POST', handler: userDelete },
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
    const store = getStore();
    const admin = await requireAdmin(req, store);
    await rateLimit(store, `admin:${admin.id}`, 240, 60);
    await route.handler(req, res, store, admin);
  } catch (err) {
    if (err instanceof HttpError) {
      const headers: Record<string, string> = {};
      if (err.status === 429) headers['Retry-After'] = String(err.extra?.retryAfterSeconds ?? 60);
      sendJson(res, err.status, { error: err.message, code: err.code }, headers);
    } else if (err instanceof StorageNotConfiguredError) {
      sendJson(res, 503, { error: err.message, code: 'storage_not_configured' });
    } else {
      reportServerError('admin', err);
      sendJson(res, 500, { error: 'Something went wrong. Please try again.', code: 'server_error' });
    }
  }
}