import { describe, it, expect, vi, beforeEach } from 'vitest';
import { passwordStrength } from '../components/auth/passwordStrength';
import { reportClientError } from '../utils/reportError';

describe('Core Utilities Suite', () => {
  describe('passwordStrength function', () => {
    it('returns level 0 and empty label for empty password', () => {
      const res = passwordStrength('');
      expect(res.level).toBe(0);
      expect(res.label).toBe('');
    });

    it('returns level 1 and Too short for short passwords under 8 characters', () => {
      const res = passwordStrength('Ab1!');
      expect(res.level).toBe(1);
      expect(res.label).toBe('Too short');
    });

    it('evaluates weak passwords that meet min length but lack character diversity', () => {
      const res = passwordStrength('abcdefgh');
      expect(res.level).toBe(1);
      expect(res.label).toBe('Weak');
    });

    it('evaluates fair passwords with mixed case and min length', () => {
      const res = passwordStrength('Abcdefgh');
      expect(res.level).toBe(2);
      expect(res.label).toBe('Fair');
    });

    it('evaluates good passwords with numbers and length over 12', () => {
      const res = passwordStrength('Abcdefghijkl1');
      expect(res.level).toBe(3);
      expect(res.label).toBe('Good');
    });

    it('evaluates strong passwords with symbols, numbers, mixed case, and long length', () => {
      const res = passwordStrength('RoyalWedding2026!#');
      expect(res.level).toBe(4);
      expect(res.label).toBe('Strong');
    });
  });

  describe('reportClientError function', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('dispatches client error report via fetch without throwing', () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));
      expect(() => reportClientError(new Error('Network glitch'), 'testContext')).not.toThrow();
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('handles non-Error objects safely', () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));
      expect(() => reportClientError('Raw string error message')).not.toThrow();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
