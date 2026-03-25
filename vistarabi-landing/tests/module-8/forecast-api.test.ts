import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/app/api/v1/forecast/validate/route';

// Mock the Auth Layer
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ userId: 'test-user', email: 'test@example.com' }),
  getAuthCookie: vi.fn().mockResolvedValue('test-token'),
  verifyToken: vi.fn().mockReturnValue({ userId: 'test-user', email: 'test@example.com' }),
}));

// Mock Rate Limiter
vi.mock('@/lib/security/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 10, limit: 20, reset: Date.now() + 60000 }),
  getIdentifier: vi.fn().mockReturnValue('test-user'),
  buildRateLimitHeaders: vi.fn().mockReturnValue({}),
  RATE_LIMITS: {
    FORECAST: { limit: 20, windowMs: 60_000 },
    AI: { limit: 20, windowMs: 60_000 },
  },
}));

// Mock the validateStrategy function
vi.mock('@/lib/module-8/strategy-validator', () => ({
  validateStrategy: vi.fn().mockImplementation(async (body) => {
    // Mimic the validation logic in the route
    if (!body.kpiHistory || !body.goalValue || !body.horizonDays) {
      throw new Error('Missing required fields');
    }
    return {
      reliabilityScore: 85,
      probabilityOfSuccess: 0.75,
      scenarios: {
        baseline: [],
        optimistic: [],
        conservative: []
      },
      sensitivity: {
        primaryDriver: 'Ads',
        riskFactor: 'Market'
      },
      milestones: []
    };
  })
}));

describe('Module 8: Forecast Validation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if required fields are missing', async () => {
    // Note: The route itself throws 400 if body validation fails,
    // but in our test we catch it in the try block and throw 500 if it's not handled.
    // However, the route.ts has explicit checks before validateStrategy.
    const req = new Request('http://localhost:3000/api/v1/forecast/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 if kpiHistory is missing', async () => {
    const req = new Request('http://localhost:3000/api/v1/forecast/validate', {
      method: 'POST',
      body: JSON.stringify({ goalValue: 100, horizonDays: 30 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 200 and the validation result for valid requests', async () => {
    const payload = {
      kpiHistory: [{ date: '2023-01-01', value: 100 }],
      goalValue: 150,
      horizonDays: 30,
      actions: [],
      confidenceLevel: 0.95
    };

    const req = new Request('http://localhost:3000/api/v1/forecast/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.probabilityOfSuccess).toBe(0.75);
    expect(body.reliabilityScore).toBe(85);
  });
});
