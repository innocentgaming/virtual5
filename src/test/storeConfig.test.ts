import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * Accounts must live in a real database in production. An in-memory store on a serverless host
 * loses every account on the next cold start, which shows up as "I registered but cannot sign in".
 */
async function freshStoreModule() {
  vi.resetModules();
  return import('../../api/_lib/store.js');
}

function clearRedisEnv() {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
}

describe('getStore persistence rules', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to fall back to the in-memory store in production', async () => {
    clearRedisEnv();
    vi.stubEnv('VERCEL_ENV', 'production');
    const { getStore, StorageNotConfiguredError } = await freshStoreModule();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => getStore()).toThrow(StorageNotConfiguredError);
  });

  it('allows the in-memory store in production only when explicitly opted in', async () => {
    clearRedisEnv();
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('ALLOW_MEMORY_STORE', 'true');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStore } = await freshStoreModule();
    expect(getStore().kind).toBe('memory');
  });

  it('uses Redis whenever it is configured', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io/');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    const { getStore } = await freshStoreModule();
    expect(getStore().kind).toBe('redis');
  });

  it('keeps the zero-setup in-memory store for local development', async () => {
    clearRedisEnv();
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStore } = await freshStoreModule();
    expect(getStore().kind).toBe('memory');
  });
});
