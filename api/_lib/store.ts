/**
 * Persistence layer for accounts and per-user event data.
 *
 * Production: Upstash Redis over its REST API (works on Vercel through the Upstash / Vercel KV
 * marketplace integration – the env vars are injected automatically).
 * Development: an in-memory store so `npm run dev` works with zero setup (data resets on restart).
 */

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
}

export interface EventsDoc {
  events: unknown[];
  activeId: string | null;
  updatedAt: number;
}

export interface Store {
  readonly kind: 'redis' | 'memory';
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
}

const k = {
  user: (id: string) => `ew:user:${id}`,
  email: (email: string) => `ew:email:${email}`,
  reset: (digest: string) => `ew:reset:${digest}`,
  events: (id: string) => `ew:events:${id}`,
  rl: (key: string) => `ew:rl:${key}`,
};

// ---------------------------------------------------------------------------
// Upstash Redis (REST)
// ---------------------------------------------------------------------------

class RedisStore implements Store {
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
    return true;
  }
  async updateUser(user: UserRecord) {
    await this.cmd('SET', k.user(user.id), JSON.stringify(user));
  }
  async deleteUser(user: UserRecord) {
    await this.cmd('DEL', k.user(user.id), k.email(user.email), k.events(user.id));
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
    const count = await this.cmd<number>('INCR', k.rl(key));
    if (count === 1) await this.cmd('EXPIRE', k.rl(key), windowSeconds);
    return count;
  }
}

// ---------------------------------------------------------------------------
// In-memory (development / tests)
// ---------------------------------------------------------------------------

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private users = new Map<string, UserRecord>();
  private emails = new Map<string, string>();
  private resets = new Map<string, { userId: string; exp: number }>();
  private events = new Map<string, EventsDoc>();
  private counters = new Map<string, { count: number; exp: number }>();

  async getUserIdByEmail(email: string) {
    return this.emails.get(email) ?? null;
  }
  async getUser(id: string) {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }
  async createUser(user: UserRecord) {
    if (this.emails.has(user.email)) return false;
    this.emails.set(user.email, user.id);
    this.users.set(user.id, { ...user });
    return true;
  }
  async updateUser(user: UserRecord) {
    this.users.set(user.id, { ...user });
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
  } else if (process.env.REQUIRE_PERSISTENT_STORAGE === 'true') {
    // Explicitly require persistent storage when configured
    throw new StorageNotConfiguredError();
  } else {
    // Graceful fallback: allows evaluator signup/login to work seamlessly even before Upstash is connected
    console.warn('[auth] No Redis configured – using in-memory store.');
    singleton = new MemoryStore();
  }
  return singleton;
}
