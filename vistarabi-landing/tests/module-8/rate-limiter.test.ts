import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getIdentifier, RATE_LIMITS } from '@/lib/security/rate-limiter';

// Access the internal store to reset it between tests
// Note: In production, this would be handled by the rate limiter module
declare module '@/lib/security/rate-limiter' {
  function resetStore(): void;
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow the first request', () => {
      const result = checkRateLimit('user:test:first', RATE_LIMITS.FORECAST);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.FORECAST.limit - 1);
    });

    it('should allow requests up to the limit', () => {
      const limit = RATE_LIMITS.FORECAST.limit;
      // Use a unique identifier to avoid interference from other tests
      const userId = `user:test:limit:${Date.now()}`;
      
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
        expect(result.success).toBe(true);
      }

      // Next request should fail
      const result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return reset time', () => {
      const now = Date.now();
      const userId = `user:test:reset:${Date.now()}`;
      const result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
      
      const expectedReset = now + RATE_LIMITS.FORECAST.windowMs;
      expect(result.reset).toBeGreaterThanOrEqual(now);
      expect(result.reset).toBeLessThanOrEqual(expectedReset + 100); // Allow small time difference
    });

    it('should reset after the window expires', () => {
      const limit = RATE_LIMITS.FORECAST.limit;
      const userId = `user:test:window:${Date.now()}`;
      
      // Fill up the rate limit
      for (let i = 0; i < limit; i++) {
        checkRateLimit(userId, RATE_LIMITS.FORECAST);
      }

      // Should be rate limited
      let result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(false);

      // Move time forward past the window
      vi.advanceTimersByTime(RATE_LIMITS.FORECAST.windowMs + 1);

      // Should be allowed again
      result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(true);
    });

    it('should track different identifiers separately', () => {
      const limit = RATE_LIMITS.FORECAST.limit;
      
      // Fill rate limit for user1
      const user1 = `user:user1:${Date.now()}`;
      for (let i = 0; i < limit; i++) {
        checkRateLimit(user1, RATE_LIMITS.FORECAST);
      }

      // User1 should be rate limited
      let result = checkRateLimit(user1, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(false);

      // User2 should not be rate limited
      const user2 = `user:user2:${Date.now()}`;
      result = checkRateLimit(user2, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(true);
    });

    it('should handle different rate limit configs', () => {
      const authId = `ip:auth:${Date.now()}`;
      // Test AUTH limit (tighter)
      for (let i = 0; i < RATE_LIMITS.AUTH.limit; i++) {
        const result = checkRateLimit(authId, RATE_LIMITS.AUTH);
        expect(result.success).toBe(true);
      }

      // Next should fail
      let result = checkRateLimit(authId, RATE_LIMITS.AUTH);
      expect(result.success).toBe(false);

      // Reset time and move to API limit (more generous)
      vi.advanceTimersByTime(RATE_LIMITS.AUTH.windowMs + 1);

      // Should work with API limit
      const apiId = `ip:api:${Date.now()}`;
      result = checkRateLimit(apiId, RATE_LIMITS.API);
      expect(result.success).toBe(true);
    });
  });

  describe('getIdentifier', () => {
    it('should prefer user ID when available', () => {
      const request = new Request('http://localhost:3000');
      const identifier = getIdentifier(request, 'user123');
      expect(identifier).toBe('user:user123');
    });

    it('should include suffix if provided', () => {
      const request = new Request('http://localhost:3000');
      const identifier = getIdentifier(request, 'user123', 'forecast');
      expect(identifier).toBe('user:user123:forecast');
    });

    it('should fall back to IP when no user ID', () => {
      const request = new Request('http://localhost:3000');
      const identifier = getIdentifier(request);
      expect(identifier).toMatch(/^ip:/);
    });

    it('should use x-forwarded-for header for IP', () => {
      const request = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '192.168.1.1, 192.168.1.2' }
      });
      const identifier = getIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('Forecast rate limit edge cases', () => {
    it('should handle concurrent requests from same user', () => {
      const limit = RATE_LIMITS.FORECAST.limit;
      const results = [];
      const userId = `user:concurrent:${Date.now()}`;

      // Simulate concurrent requests
      for (let i = 0; i < limit + 5; i++) {
        const result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
        results.push(result.success);
      }

      // First `limit` should succeed, rest should fail
      expect(results.slice(0, limit).every(r => r)).toBe(true);
      expect(results.slice(limit).some(r => r)).toBe(false);
    });

    it('should provide accurate Retry-After value', () => {
      const limit = RATE_LIMITS.FORECAST.limit;
      const userId = `user:retry:${Date.now()}`;
      
      // Fill up the rate limit
      for (let i = 0; i < limit; i++) {
        checkRateLimit(userId, RATE_LIMITS.FORECAST);
      }

      // Get rate limited response
      const result = checkRateLimit(userId, RATE_LIMITS.FORECAST);
      expect(result.success).toBe(false);

      // Reset time should be in the future
      expect(result.reset).toBeGreaterThan(Date.now());
      
      // The remaining time should be close to the window
      const remainingMs = result.reset - Date.now();
      expect(remainingMs).toBeLessThanOrEqual(RATE_LIMITS.FORECAST.windowMs);
      expect(remainingMs).toBeGreaterThan(0);
    });
  });
});
