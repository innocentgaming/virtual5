/**
 * Persistence layer for accounts and per-user event data.
 *
 * Production: Upstash Redis over its REST API (works on Vercel through the Upstash / Vercel KV
 * marketplace integration – the env vars are injected automatically).
 * Self-hosted / local: a JSON file store (set DATA_DIR, defaults to ./.data in development) so accounts
 * survive restarts without a database.
 * Last resort: an in-memory store. It is VOLATILE: every restart / cold start / extra serverless instance
 * forgets all accounts, which shows up as "I registered but my password is wrong".
 */
import fs from 'node:fs';
import path from 'node:path';

export type Role = 'planner' | 'host' | 'vendor';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization?: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  /** Platform administrator (the first account ever created, plus anyone an admin promotes). */
  isAdmin?: boolean;
  /** Disabled accounts cannot sign in and their sessions stop working immediately. */
  disabled?: boolean;
  lastLoginAt?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  type: string;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetEmail?: string;
  ip?: string;
  detail?: string;
}

export interface RsvpLink {
  token: string;
  userId: string;
  eventId: string;
  title: string;
  date?: string;
  venue?: string;
  hosts?: string;
  closed: boolean;
  createdAt: string;
}

export type RsvpDiet = 'veg' | 'jain' | 'nonveg';

export interface RsvpResponse {
  /** Deterministic per guest (email, else name) so a guest changing their answer updates one row. */
  id: string;
  name: string;
  email?: string;
  attending: boolean;
  /** Extra people coming with this guest (0-5). */
  guests: number;
  diet: RsvpDiet;
  note?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface BackupSnapshot {
  version: 1;
  createdAt: string;
  adminClaimedBy: string | null;
  users: UserRecord[];
  events: [string, EventsDoc][];
  rsvpLinks: RsvpLink[];
  rsvpResponses: [string, RsvpResponse[]][];
  audit: AuditEntry[];
}

export const MAX_RSVP_RESPONSES = 500;
export const MAX_AUDIT_ENTRIES = 1000;

export interface EventsDoc {
  events: unknown[];
  activeId: string | null;
  updatedAt: number;
}

export interface Store {
  readonly kind: 'redis' | 'file' | 'memory';
  getUserIdByEmail(email: string): Promise<string | null>;
  getUser(id: string): Promise<UserRecord | null>;
  /** Atomically claims the email; returns false if it is already registered. */
  createUser(user: UserRecord): Promise<boolean>;
  updateUser(user: UserRecord): Promise<void>;
  deleteUser(user: UserRecord): Promise<void>;
  putResetToken(digest: string, userId: string, ttlSeconds: number): Promise<void>;
  /** Single-use: returns the user id and deletes the token. */
  consumeResetToken(digest: string): Promise<string | null>;
  getEvents(userId: string): Promise<EventsDoc | null>;
  putEvents(userId: string, doc: EventsDoc): Promise<void>;
  /** Fixed-window counter used for rate limiting. Returns the new count. */
  incr(key: string, windowSeconds: number): Promise<number>;

  /** Cheap liveness probe for /api/health. Throws when the backing database is unreachable. */
  ping(): Promise<void>;
  /** Atomic "first one wins": true only for the very first caller ever (bootstraps the first admin). */
  claimFirstAdmin(userId: string): Promise<boolean>;
  listUserIds(): Promise<string[]>;

  appendAudit(entry: AuditEntry): Promise<void>;
  /** Newest first. */
  listAudit(limit: number): Promise<AuditEntry[]>;

  putRsvpLink(link: RsvpLink): Promise<void>;
  getRsvpLink(token: string): Promise<RsvpLink | null>;
  getRsvpTokenFor(userId: string, eventId: string): Promise<string | null>;
  /** Insert or update one guest's response. 'full' when the per-link cap is reached. */
  upsertRsvpResponse(token: string, response: RsvpResponse): Promise<'created' | 'updated' | 'full'>;
  listRsvpResponses(token: string): Promise<RsvpResponse[]>;

  exportAll(): Promise<BackupSnapshot>;
  importAll(snapshot: BackupSnapshot): Promise<void>;
}

const k = {
  user: (id: string) => `ew:user:${id}`,
  email: (email: string) => `ew:email:${email}`,
  reset: (digest: string) => `ew:reset:${digest}`,
  events: (id: string) => `ew:events:${id}`,
  rl: (key: string) => `ew:rl:${key}`,
  users: 'ew:users',
  admin: 'ew:admin-claimed',
  audit: 'ew:audit',
  rsvp: (token: string) => `ew:rsvp:${token}`,
  rsvpOf: (userId: string, eventId: string) => `ew:rsvpof:${userId}:${eventId}`,
  rsvpLinks: 'ew:rsvplinks',
  rsvpResp: (token: string) => `ew:rsvpresp:${token}`,
};

// ---------------------------------------------------------------------------
// Upstash Redis (REST)
// ---------------------------------------------------------------------------

export class RedisStore implements Store {
  readonly kind = 'redis' as const;
  private readonly url: string;
  private readonly token: string;
  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
    if (!res.ok || data.error) {
      throw new Error(`Redis error: ${data.error ?? res.status}`);
    }
    return data.result as T;
  }

  async getUserIdByEmail(email: string) {
    return (await this.cmd<string | null>('GET', k.email(email))) ?? null;
  }
  async getUser(id: string) {
    const raw = await this.cmd<string | null>('GET', k.user(id));
    return raw ? (JSON.parse(raw) as UserRecord) : null;
  }
  async createUser(user: UserRecord) {
    const claimed = await this.cmd<string | null>('SET', k.email(user.email), user.id, 'NX');
    if (claimed !== 'OK') return false;
    await this.cmd('SET', k.user(user.id), JSON.stringify(user));
    await this.cmd('SADD', k.users, user.id);
    return true;
  }
  async updateUser(user: UserRecord) {
    await this.cmd('SET', k.user(user.id), JSON.stringify(user));
  }
  async deleteUser(user: UserRecord) {
    await this.cmd('DEL', k.user(user.id), k.email(user.email), k.events(user.id));
    await this.cmd('SREM', k.users, user.id);
  }
  async putResetToken(digest: string, userId: string, ttlSeconds: number) {
    await this.cmd('SET', k.reset(digest), userId, 'EX', ttlSeconds);
  }
  async consumeResetToken(digest: string) {
    return (await this.cmd<string | null>('GETDEL', k.reset(digest))) ?? null;
  }
  async getEvents(userId: string) {
    const raw = await this.cmd<string | null>('GET', k.events(userId));
    return raw ? (JSON.parse(raw) as EventsDoc) : null;
  }
  async putEvents(userId: string, doc: EventsDoc) {
    await this.cmd('SET', k.events(userId), JSON.stringify(doc));
  }
  async incr(key: string, windowSeconds: number) {
    // Create the counter with its TTL first (NX), then increment. Doing INCR then EXPIRE would leave a
    // counter without any expiry if the function dies in between, locking that key out permanently.
    await this.cmd('SET', k.rl(key), 0, 'EX', windowSeconds, 'NX');
    return this.cmd<number>('INCR', k.rl(key));
  }

  async ping() {
    await this.cmd('PING');
  }
  async claimFirstAdmin(userId: string) {
    return (await this.cmd<string | null>('SET', k.admin, userId, 'NX')) === 'OK';
  }
  async listUserIds() {
    let ids = await this.cmd<string[]>('SMEMBERS', k.users);
    if (ids.length === 0) {
      // Accounts created before the index existed: rebuild it once from the user keys.
      let cursor = '0';
      const found: string[] = [];
      do {
        const [next, keys] = await this.cmd<[string, string[]]>('SCAN', cursor, 'MATCH', 'ew:user:*', 'COUNT', 500);
        cursor = String(next);
        for (const key of keys) found.push(key.slice('ew:user:'.length));
      } while (cursor !== '0');
      if (found.length) {
        await this.cmd('SADD', k.users, ...found);
        ids = found;
      }
    }
    return ids;
  }
  async appendAudit(entry: AuditEntry) {
    await this.cmd('LPUSH', k.audit, JSON.stringify(entry));
    await this.cmd('LTRIM', k.audit, 0, MAX_AUDIT_ENTRIES - 1);
  }
  async listAudit(limit: number) {
    const rows = await this.cmd<string[]>('LRANGE', k.audit, 0, Math.max(0, limit - 1));
    return rows.map((r) => JSON.parse(r) as AuditEntry);
  }
  async putRsvpLink(link: RsvpLink) {
    await this.cmd('SET', k.rsvp(link.token), JSON.stringify(link));
    await this.cmd('SET', k.rsvpOf(link.userId, link.eventId), link.token);
    await this.cmd('SADD', k.rsvpLinks, link.token);
  }
  async getRsvpLink(token: string) {
    const raw = await this.cmd<string | null>('GET', k.rsvp(token));
    return raw ? (JSON.parse(raw) as RsvpLink) : null;
  }
  async getRsvpTokenFor(userId: string, eventId: string) {
    return (await this.cmd<string | null>('GET', k.rsvpOf(userId, eventId))) ?? null;
  }
  async upsertRsvpResponse(token: string, response: RsvpResponse) {
    const prev = await this.cmd<string | null>('HGET', k.rsvpResp(token), response.id);
    if (!prev && (await this.cmd<number>('HLEN', k.rsvpResp(token))) >= MAX_RSVP_RESPONSES) return 'full' as const;
    const merged = prev ? { ...response, submittedAt: (JSON.parse(prev) as RsvpResponse).submittedAt } : response;
    await this.cmd('HSET', k.rsvpResp(token), response.id, JSON.stringify(merged));
    return prev ? ('updated' as const) : ('created' as const);
  }
  async listRsvpResponses(token: string) {
    const rows = await this.cmd<string[]>('HVALS', k.rsvpResp(token));
    return rows.map((r) => JSON.parse(r) as RsvpResponse).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  }
  async exportAll(): Promise<BackupSnapshot> {
    const ids = await this.listUserIds();
    const users = (await Promise.all(ids.map((id) => this.getUser(id)))).filter((u): u is UserRecord => !!u);
    const events: [string, EventsDoc][] = [];
    for (const u of users) {
      const doc = await this.getEvents(u.id);
      if (doc) events.push([u.id, doc]);
    }
    const tokens = await this.cmd<string[]>('SMEMBERS', k.rsvpLinks);
    const rsvpLinks = (await Promise.all(tokens.map((t) => this.getRsvpLink(t)))).filter((l): l is RsvpLink => !!l);
    const rsvpResponses: [string, RsvpResponse[]][] = [];
    for (const l of rsvpLinks) rsvpResponses.push([l.token, await this.listRsvpResponses(l.token)]);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      adminClaimedBy: (await this.cmd<string | null>('GET', k.admin)) ?? null,
      users,
      events,
      rsvpLinks,
      rsvpResponses,
      audit: await this.listAudit(MAX_AUDIT_ENTRIES),
    };
  }
  async importAll(snap: BackupSnapshot) {
    for (const u of snap.users) {
      await this.cmd('SET', k.user(u.id), JSON.stringify(u));
      await this.cmd('SET', k.email(u.email), u.id);
      await this.cmd('SADD', k.users, u.id);
    }
    for (const [id, doc] of snap.events) await this.putEvents(id, doc);
    for (const l of snap.rsvpLinks) await this.putRsvpLink(l);
    for (const [token, rows] of snap.rsvpResponses) {
      for (const r of rows) await this.cmd('HSET', k.rsvpResp(token), r.id, JSON.stringify(r));
    }
    if (snap.audit.length) {
      await this.cmd('DEL', k.audit);
      await this.cmd('RPUSH', k.audit, ...snap.audit.map((a) => JSON.stringify(a)));
    }
    if (snap.adminClaimedBy) await this.cmd('SET', k.admin, snap.adminClaimedBy);
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback (local development / zero-setup testing)
// ---------------------------------------------------------------------------

export class MemoryStore implements Store {
  readonly kind: 'memory' | 'file' = 'memory';
  protected users = new Map<string, UserRecord>();
  protected emails = new Map<string, string>();
  protected resets = new Map<string, { userId: string; exp: number }>();
  protected events = new Map<string, EventsDoc>();
  protected counters = new Map<string, { count: number; exp: number }>();
  protected audit: AuditEntry[] = [];
  protected rsvpLinks = new Map<string, RsvpLink>();
  protected rsvpByEvent = new Map<string, string>();
  protected rsvpResponses = new Map<string, Map<string, RsvpResponse>>();
  protected adminClaimedBy: string | null = null;

  async getUserIdByEmail(email: string) {
    return this.emails.get(email) ?? null;
  }
  async getUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async createUser(user: UserRecord) {
    if (this.emails.has(user.email)) return false;
    this.emails.set(user.email, user.id);
    this.users.set(user.id, user);
    return true;
  }
  async updateUser(user: UserRecord) {
    this.users.set(user.id, user);
  }
  async deleteUser(user: UserRecord) {
    this.users.delete(user.id);
    this.emails.delete(user.email);
    this.events.delete(user.id);
  }
  async putResetToken(digest: string, userId: string, ttlSeconds: number) {
    this.resets.set(digest, { userId, exp: Date.now() + ttlSeconds * 1000 });
  }
  async consumeResetToken(digest: string) {
    const rec = this.resets.get(digest);
    this.resets.delete(digest);
    return rec && rec.exp > Date.now() ? rec.userId : null;
  }
  async getEvents(userId: string) {
    return this.events.get(userId) ?? null;
  }
  async putEvents(userId: string, doc: EventsDoc) {
    this.events.set(userId, doc);
  }
  async incr(key: string, windowSeconds: number) {
    const now = Date.now();
    const rec = this.counters.get(key);
    if (!rec || rec.exp < now) {
      this.counters.set(key, { count: 1, exp: now + windowSeconds * 1000 });
      return 1;
    }
    rec.count += 1;
    return rec.count;
  }

  async ping() {
    /* always alive */
  }
  async claimFirstAdmin(userId: string) {
    if (this.adminClaimedBy) return false;
    this.adminClaimedBy = userId;
    return true;
  }
  async listUserIds() {
    return [...this.users.keys()];
  }
  async appendAudit(entry: AuditEntry) {
    this.audit.unshift(entry);
    if (this.audit.length > MAX_AUDIT_ENTRIES) this.audit.length = MAX_AUDIT_ENTRIES;
  }
  async listAudit(limit: number) {
    return this.audit.slice(0, limit);
  }
  async putRsvpLink(link: RsvpLink) {
    this.rsvpLinks.set(link.token, { ...link });
    this.rsvpByEvent.set(`${link.userId}:${link.eventId}`, link.token);
  }
  async getRsvpLink(token: string) {
    const l = this.rsvpLinks.get(token);
    return l ? { ...l } : null;
  }
  async getRsvpTokenFor(userId: string, eventId: string) {
    return this.rsvpByEvent.get(`${userId}:${eventId}`) ?? null;
  }
  async upsertRsvpResponse(token: string, response: RsvpResponse) {
    let rows = this.rsvpResponses.get(token);
    if (!rows) this.rsvpResponses.set(token, (rows = new Map()));
    const prev = rows.get(response.id);
    if (!prev && rows.size >= MAX_RSVP_RESPONSES) return 'full' as const;
    rows.set(response.id, prev ? { ...response, submittedAt: prev.submittedAt } : { ...response });
    return prev ? ('updated' as const) : ('created' as const);
  }
  async listRsvpResponses(token: string) {
    return [...(this.rsvpResponses.get(token)?.values() ?? [])].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  }
  async exportAll(): Promise<BackupSnapshot> {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      adminClaimedBy: this.adminClaimedBy,
      users: [...this.users.values()].map((u) => ({ ...u })),
      events: [...this.events.entries()],
      rsvpLinks: [...this.rsvpLinks.values()],
      rsvpResponses: [...this.rsvpResponses.entries()].map(([t, rows]) => [t, [...rows.values()]] as [string, RsvpResponse[]]),
      audit: [...this.audit],
    };
  }
  async importAll(snap: BackupSnapshot) {
    for (const u of snap.users) {
      this.users.set(u.id, { ...u });
      this.emails.set(u.email, u.id);
    }
    for (const [id, doc] of snap.events) this.events.set(id, doc);
    for (const l of snap.rsvpLinks) await this.putRsvpLink(l);
    for (const [token, rows] of snap.rsvpResponses) this.rsvpResponses.set(token, new Map(rows.map((r) => [r.id, r])));
    if (snap.audit.length) this.audit = [...snap.audit];
    if (snap.adminClaimedBy) this.adminClaimedBy = snap.adminClaimedBy;
  }
}

// ---------------------------------------------------------------------------
// JSON file store (persists across restarts; single server process)
// ---------------------------------------------------------------------------

interface FileSnapshot extends Partial<BackupSnapshot> {
  users: UserRecord[];
  emails: [string, string][];
  resets: [string, { userId: string; exp: number }][];
  events: [string, EventsDoc][];
}

export class FileStore extends MemoryStore {
  override readonly kind = 'file' as const;
  private readonly file: string;

  constructor(dir: string) {
    super();
    const resolved = path.resolve(dir);
    fs.mkdirSync(resolved, { recursive: true });
    this.file = path.join(resolved, 'eventwise-store.json');
    this.load();
    this.persist(); // fail fast (so getStore can fall back) if the directory is not writable
  }

  private load(): void {
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('[auth] Could not read account store:', err);
      return;
    }
    try {
      const snap = JSON.parse(raw) as Partial<FileSnapshot>;
      for (const u of snap.users ?? []) this.users.set(u.id, u);
      for (const [email, id] of snap.emails ?? []) this.emails.set(email, id);
      for (const [digest, rec] of snap.resets ?? []) if (rec.exp > Date.now()) this.resets.set(digest, rec);
      for (const [id, doc] of snap.events ?? []) this.events.set(id, doc);
      for (const u of snap.users ?? []) this.emails.set(u.email, u.id);
      for (const l of snap.rsvpLinks ?? []) {
        this.rsvpLinks.set(l.token, l);
        this.rsvpByEvent.set(`${l.userId}:${l.eventId}`, l.token);
      }
      for (const [token, rows] of snap.rsvpResponses ?? []) this.rsvpResponses.set(token, new Map(rows.map((r) => [r.id, r])));
      this.audit = snap.audit ?? [];
      this.adminClaimedBy = snap.adminClaimedBy ?? null;
    } catch (err) {
      // Never silently overwrite a file we could not understand: keep a copy for recovery.
      console.error('[auth] Account store is corrupted; keeping a backup and starting empty.', err);
      try {
        fs.copyFileSync(this.file, `${this.file}.corrupt-${Date.now()}`);
      } catch {
        /* best effort */
      }
    }
  }

  private persist(): void {
    const snap: FileSnapshot = {
      users: [...this.users.values()],
      emails: [...this.emails.entries()],
      resets: [...this.resets.entries()].filter(([, r]) => r.exp > Date.now()),
      events: [...this.events.entries()],
      version: 1,
      createdAt: new Date().toISOString(),
      adminClaimedBy: this.adminClaimedBy,
      rsvpLinks: [...this.rsvpLinks.values()],
      rsvpResponses: [...this.rsvpResponses.entries()].map(([t, rows]) => [t, [...rows.values()]] as [string, RsvpResponse[]]),
      audit: this.audit,
    };
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snap), { mode: 0o600 });
    fs.renameSync(tmp, this.file); // atomic: a crash mid-write can never leave a half-written store
  }

  override async createUser(user: UserRecord) {
    const created = await super.createUser(user);
    if (created) this.persist();
    return created;
  }
  override async updateUser(user: UserRecord) {
    await super.updateUser(user);
    this.persist();
  }
  override async deleteUser(user: UserRecord) {
    await super.deleteUser(user);
    this.persist();
  }
  override async putResetToken(digest: string, userId: string, ttlSeconds: number) {
    await super.putResetToken(digest, userId, ttlSeconds);
    this.persist();
  }
  override async consumeResetToken(digest: string) {
    const id = await super.consumeResetToken(digest);
    this.persist();
    return id;
  }
  override async putEvents(userId: string, doc: EventsDoc) {
    await super.putEvents(userId, doc);
    this.persist();
  }
  override async claimFirstAdmin(userId: string) {
    const won = await super.claimFirstAdmin(userId);
    if (won) this.persist();
    return won;
  }
  override async appendAudit(entry: AuditEntry) {
    await super.appendAudit(entry);
    this.persist();
  }
  override async putRsvpLink(link: RsvpLink) {
    await super.putRsvpLink(link);
    this.persist();
  }
  override async upsertRsvpResponse(token: string, response: RsvpResponse) {
    const out = await super.upsertRsvpResponse(token, response);
    if (out !== 'full') this.persist();
    return out;
  }
  override async importAll(snap: BackupSnapshot) {
    await super.importAll(snap);
    this.persist();
  }
}

// ---------------------------------------------------------------------------

let singleton: Store | null = null;
let override: Store | null = null;

export function setStoreForTesting(store: Store | null): void {
  override = store;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Account storage is not configured on this deployment.');
  }
}

export function getStore(): Store {
  if (override) return override;
  if (singleton) return singleton;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    singleton = new RedisStore(url.replace(/\/$/, ''), token);
    return singleton;
  }

  // Self-hosted with a persistent disk (e.g. a Render disk mounted at DATA_DIR): accounts live in a file.
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    try {
      singleton = new FileStore(dataDir);
      return singleton;
    } catch (err) {
      console.error(`[auth] DATA_DIR "${dataDir}" is not usable, ignoring it:`, err);
    }
  }

  // A serverless deployment (Vercel) has no shared memory between invocations: accounts kept in a
  // MemoryStore silently disappear on the next cold start, so "Sign in" fails for people who already
  // registered. In production we therefore refuse to run without a real database instead of pretending
  // that signup worked. Set ALLOW_MEMORY_STORE=true only for throwaway demos.
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'production';
  if (process.env.REQUIRE_PERSISTENT_STORAGE === 'true' || (isProd && process.env.ALLOW_MEMORY_STORE !== 'true')) {
    console.error(
      '[auth] No Redis configured. Connect Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) so accounts persist.'
    );
    throw new StorageNotConfiguredError();
  }

  // Local development: keep accounts in ./.data so they survive dev-server restarts.
  if (!isProd && process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    try {
      singleton = new FileStore('.data');
      console.warn('[auth] No Redis configured – storing accounts in ./.data (development only).');
      return singleton;
    } catch (err) {
      console.warn('[auth] Could not use ./.data, falling back to memory:', err);
    }
  }

  console.warn(
    '[auth] No Redis configured – using the VOLATILE in-memory store: every account is lost on restart. Connect Upstash Redis (or set DATA_DIR to a persistent disk).'
  );
  singleton = new MemoryStore();
  return singleton;
}
