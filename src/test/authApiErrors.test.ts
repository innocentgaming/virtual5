import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../services/authApi';

describe('authApi Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns friendly rate limit message on 429 status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 429, statusText: 'Too Many Requests' })
    );

    const res = await authApi.login({ email: 'test@example.com', password: 'password123' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Too many requests. Please wait a moment and try again.');
      expect(res.status).toBe(429);
    }
  });

  it('returns friendly server error message on 5xx status codes', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' })
    );

    const res = await authApi.me();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Server error. Please try again later.');
      expect(res.status).toBe(502);
    }
  });

  it('treats non-JSON 200 response as a failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('<!DOCTYPE html><html><body>Login page</body></html>', { status: 200 })
    );

    const res = await authApi.me();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Unexpected response from server. Please try again.');
      expect(res.code).toBe('invalid_response');
    }
  });

  it('preserves structured error message from upstream JSON responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Incorrect email or password.', code: 'invalid_credentials' }), {
        status: 401,
      })
    );

    const res = await authApi.login({ email: 'user@example.com', password: 'wrong' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Incorrect email or password.');
      expect(res.code).toBe('invalid_credentials');
      expect(res.status).toBe(401);
    }
  });
});
