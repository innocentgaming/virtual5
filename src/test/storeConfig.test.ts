import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

  it('keeps the zero-setup in-memory store under the test runner', async () => {
    clearRedisEnv();
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATA_DIR', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStore } = await freshStoreModule();
    expect(getStore().kind).toBe('memory');
  });

  it('persists accounts to a file when DATA_DIR is set, even in production', async () => {
    clearRedisEnv();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-data-'));
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('DATA_DIR', dir);
    try {
      const { getStore } = await freshStoreModule();
      expect(getStore().kind).toBe('file');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to the production rule when DATA_DIR is not writable', async () => {
    clearRedisEnv();
    // A directory path *inside a regular file* can never be created (ENOTDIR), even when running as root.
    const blocker = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-block-'));
    const notADir = path.join(blocker, 'file.txt');
    fs.writeFileSync(notADir, 'x');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('DATA_DIR', path.join(notADir, 'data'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { getStore, StorageNotConfiguredError } = await freshStoreModule();
      expect(() => getStore()).toThrow(StorageNotConfiguredError);
    } finally {
      fs.rmSync(blocker, { recursive: true, force: true });
    }
  });
});
