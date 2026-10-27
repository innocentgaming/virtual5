import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { isOriginAllowed, allowedModels } from '../../api/gemini';
import { getClientIp, assertSameOrigin, HttpError } from '../../api/_lib/http';
import { RedisStore } from '../../api/_lib/store';

describe('API Hardening & Security Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isOriginAllowed (Gemini proxy)', () => {
    it('allows same-origin requests matching own host', () => {
      const req = {
        headers: {
          origin: 'https://virtual5.vercel.app',
          host: 'virtual5.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(req)).toBe(true);
    });

    it('allows origins matching configured ALLOWED_ORIGIN list', () => {
      process.env.ALLOWED_ORIGIN = 'https://eventwise.ai, https://preview.vercel.app';
      const req = {
        headers: {
          origin: 'https://preview.vercel.app',
          host: 'api.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(req)).toBe(true);
    });

    it('rejects cross-origin requests from untrusted hosts', () => {
      process.env.ALLOWED_ORIGIN = 'https://virtual5.vercel.app';
      const req = {
        headers: {
          origin: 'https://malicious-site.com',
          host: 'virtual5.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(req)).toBe(false);
    });

    it('rejects substring spoofing attacks in query or path', () => {
      process.env.ALLOWED_ORIGIN = 'https://virtual5.vercel.app';
      const req = {
        headers: {
          origin: 'https://evil.com/?target=virtual5.vercel.app',
          host: 'virtual5.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(req)).toBe(false);
    });

    it('allows user-initiated/same-origin navigation without Origin header', () => {
      const reqSameOrigin = {
        headers: {
          'sec-fetch-site': 'same-origin',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(reqSameOrigin)).toBe(true);

      const reqNone = {
        headers: {
          'sec-fetch-site': 'none',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(reqNone)).toBe(true);
    });

    it('rejects cross-site fetch requests lacking an Origin header', () => {
      const reqCrossSite = {
        headers: {
          'sec-fetch-site': 'cross-site',
        },
      } as unknown as IncomingMessage;
      expect(isOriginAllowed(reqCrossSite)).toBe(false);
    });
  });

  describe('allowedModels (Model allow-list)', () => {
    it('provides built-in verified Gemini models', () => {
      const models = allowedModels();
      expect(models).toContain('gemini-flash-latest');
      expect(models).toContain('gemini-2.5-flash');
      expect(models).toContain('gemini-2.5-flash-lite');
    });

    it('incorporates additional custom models from environment without duplicates', () => {
      process.env.GEMINI_ALLOWED_MODELS = 'gemini-exp-1206, gemini-flash-latest';
      const models = allowedModels();
      expect(models).toContain('gemini-exp-1206');
      expect(models.filter((m) => m === 'gemini-flash-latest').length).toBe(1);
    });
  });

  describe('getClientIp (Platform client IP header priority)', () => {
    it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
      const req = {
        headers: {
          'x-vercel-forwarded-for': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 203.0.113.195',
        },
      } as unknown as IncomingMessage;
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('prefers x-real-ip when x-vercel-forwarded-for is missing', () => {
      const req = {
        headers: {
          'x-real-ip': '198.51.100.42',
          'x-forwarded-for': '192.0.2.1, 198.51.100.42',
        },
      } as unknown as IncomingMessage;
      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    it('falls back to x-forwarded-for first IP and socket address', () => {
      const reqFwd = {
        headers: {
          'x-forwarded-for': '192.0.2.50, 10.0.0.1',
        },
      } as unknown as IncomingMessage;
      expect(getClientIp(reqFwd)).toBe('192.0.2.50');

      const reqSocket = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as IncomingMessage;
      expect(getClientIp(reqSocket)).toBe('127.0.0.1');
    });
  });

  describe('assertSameOrigin (CSRF & Origin verification)', () => {
    it('passes when Origin matches Host header', () => {
      const req = {
        headers: {
          origin: 'https://virtual5.vercel.app',
          host: 'virtual5.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it('throws HttpError 403 on Origin host mismatch', () => {
      const req = {
        headers: {
          origin: 'https://evil.example.com',
          host: 'virtual5.vercel.app',
        },
      } as unknown as IncomingMessage;
      expect(() => assertSameOrigin(req)).toThrowError(HttpError);
    });

    it('blocks cross-site fetch without Origin header when sec-fetch-site is cross-site', () => {
      const req = {
        headers: {
          'sec-fetch-site': 'cross-site',
        },
      } as unknown as IncomingMessage;
      expect(() => assertSameOrigin(req)).toThrowError(HttpError);
    });
  });

  describe('RedisStore (Atomic Rate-Limiter Counter)', () => {
    it('sets key with expiration before incrementing counter to avoid stuck keys', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 1 }),
      });
      global.fetch = fetchMock;

      const store = new RedisStore('https://upstash-redis.example.com', 'test-token');
      const count = await store.incr('test-ip-key', 60);

      expect(count).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstCallBody).toEqual(['SET', 'ew:rl:test-ip-key', 0, 'EX', 60, 'NX']);

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody).toEqual(['INCR', 'ew:rl:test-ip-key']);
    });
  });
});
