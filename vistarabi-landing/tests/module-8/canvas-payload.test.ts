// Module 8: Strategy Canvas Payload Validation Test
// Spec §8 — "canvas-payload.test.ts"
// Ensures the API response payload contains all UI-required lines
// and confidence zones as defined in MODULE_8_STRATEGY_FORECASTING.md §6.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/app/api/v1/forecast/validate/route';

// ─── Mock Auth Layer — prevent cookies() scope errors ────────────────────────

vi.mock('../../src/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ userId: 'test-user', email: 'test@example.com' }),
  getAuthCookie: vi.fn().mockResolvedValue('test-token'),
  verifyToken: vi.fn().mockReturnValue({ userId: 'test-user', email: 'test@example.com' }),
}));

// ─── Mock Rate Limiter ────────────────────────────────────────────────────────

vi.mock('../../src/lib/security/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 10, limit: 20, reset: Date.now() + 60000 }),
  getIdentifier: vi.fn().mockReturnValue('test-user'),
  buildRateLimitHeaders: vi.fn().mockReturnValue({}),
  RATE_LIMITS: { FORECAST: { limit: 20, windowMs: 60000 } }
}));

// ─── Mock Prophet bridge — use linear fallback so no Python required ──────────

vi.mock('../../src/lib/module-8/prophet-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/module-8/prophet-bridge')>();
  return {
    ...actual,
    generateBaselineForecast: vi.fn().mockImplementation(actual.generateFallbackLinearForecast),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKpiHistory(days: number): { date: string; value: number }[] {
  const pts = [];
  let v = 50000;
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    v += (Math.random() - 0.4) * 300;
    pts.push({ date: d.toISOString().split('T')[0], value: Math.max(0, v) });
  }
  return pts;
}

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    kpiHistory: makeKpiHistory(120),
    goalValue: 75000,
    horizonDays: 30,
    confidenceLevel: 0.95,
    actions: [
      {
        id: 'a1',
        name: 'Email Campaign',
        expectedUplift: 0.10,
        rampDays: 14,
        startDayOffset: 7,
      }
    ],
    ...overrides,
  };
}

async function postForecast(body: unknown) {
  const req = new Request('http://localhost:3000/api/v1/forecast/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Module 8: Strategy Canvas API Payload (Spec §6 + §7)', () => {

  describe('Input Validation (POST /api/v1/forecast/validate)', () => {
    it('returns 400 when kpiHistory is missing', async () => {
      const res = await postForecast({ goalValue: 75000, horizonDays: 30 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when goalValue is missing', async () => {
      const res = await postForecast({ kpiHistory: makeKpiHistory(30), horizonDays: 30 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when horizonDays is missing', async () => {
      const res = await postForecast({ kpiHistory: makeKpiHistory(30), goalValue: 75000 });
      expect(res.status).toBe(400);
    });

    it('returns 200 for a valid request', async () => {
      const res = await postForecast(makeValidPayload());
      expect(res.status).toBe(200);
    });
  });

  describe('Spec §6 — Forecast Layers (Canvas Lines)', () => {
    it('response contains all 3 scenario lines: baseline, optimistic, conservative', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      expect(body.scenarios).toBeDefined();
      expect(body.scenarios).toHaveProperty('baseline');
      expect(body.scenarios).toHaveProperty('optimistic');
      expect(body.scenarios).toHaveProperty('conservative');
    });

    it('baseline (Solid Blue) — is an array of forecast points', async () => {
      const res = await postForecast(makeValidPayload({ horizonDays: 30 }));
      const body = await res.json();
      expect(Array.isArray(body.scenarios.baseline)).toBe(true);
      expect(body.scenarios.baseline.length).toBe(30);
    });

    it('optimistic (Dotted Green) — is an array the same length as baseline', async () => {
      const res = await postForecast(makeValidPayload({ horizonDays: 30 }));
      const body = await res.json();
      expect(body.scenarios.optimistic.length).toBe(body.scenarios.baseline.length);
    });

    it('conservative (Dotted Red) — is an array the same length as baseline', async () => {
      const res = await postForecast(makeValidPayload({ horizonDays: 30 }));
      const body = await res.json();
      expect(body.scenarios.conservative.length).toBe(body.scenarios.baseline.length);
    });

    it('Cone of Uncertainty — each baseline point has yhatLower and yhatUpper', async () => {
      const res = await postForecast(makeValidPayload({ horizonDays: 10 }));
      const body = await res.json();
      body.scenarios.baseline.forEach((pt: { yhat: number; yhatLower: number; yhatUpper: number }) => {
        expect(pt).toHaveProperty('yhat');
        expect(pt).toHaveProperty('yhatLower');
        expect(pt).toHaveProperty('yhatUpper');
        expect(pt.yhatLower).toBeLessThanOrEqual(pt.yhat);
        expect(pt.yhatUpper).toBeGreaterThanOrEqual(pt.yhat);
      });
    });
  });

  describe('Spec §7 — API Response Structure', () => {
    it('probabilityOfSuccess is present and between 0 and 1', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      expect(body).toHaveProperty('probabilityOfSuccess');
      expect(body.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
      expect(body.probabilityOfSuccess).toBeLessThanOrEqual(1);
    });

    it('reliabilityScore is present and between 0 and 100', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      expect(body).toHaveProperty('reliabilityScore');
      expect(body.reliabilityScore).toBeGreaterThanOrEqual(0);
      expect(body.reliabilityScore).toBeLessThanOrEqual(100);
    });

    it('sensitivity object contains primaryDriver and riskFactor', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      expect(body.sensitivity).toHaveProperty('primaryDriver');
      expect(body.sensitivity).toHaveProperty('riskFactor');
      expect(typeof body.sensitivity.primaryDriver).toBe('string');
    });

    it('sensitivity.primaryDriver matches the name of the action with highest uplift', async () => {
      const payload = makeValidPayload({
        actions: [
          { id: 'a1', name: 'Small Action', expectedUplift: 0.05, rampDays: 14, startDayOffset: 7 },
          { id: 'a2', name: 'Big Campaign', expectedUplift: 0.25, rampDays: 21, startDayOffset: 14 },
        ]
      });
      const res = await postForecast(payload);
      const body = await res.json();
      expect(body.sensitivity.primaryDriver).toBe('Big Campaign');
    });

    it('milestones array is present and sorted by day ascending', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      expect(Array.isArray(body.milestones)).toBe(true);
      for (let i = 1; i < body.milestones.length; i++) {
        expect(body.milestones[i].day).toBeGreaterThanOrEqual(body.milestones[i - 1].day);
      }
    });

    it('milestones include action_start and target types', async () => {
      const res = await postForecast(makeValidPayload());
      const body = await res.json();
      const types: string[] = body.milestones.map((m: { type: string }) => m.type);
      expect(types).toContain('action_start');
      expect(types).toContain('target');
    });

    it('each forecast point has date string, day number, and numeric yhat fields', async () => {
      const res = await postForecast(makeValidPayload({ horizonDays: 5 }));
      const body = await res.json();
      body.scenarios.baseline.forEach((pt: { date: string; day: number; yhat: number }) => {
        expect(typeof pt.date).toBe('string');
        expect(typeof pt.day).toBe('number');
        expect(typeof pt.yhat).toBe('number');
      });
    });
  });

  describe('Spec §5 — Data Validation Guardrails', () => {
    it('short history (<90 days) produces a reliability score below 70', async () => {
      const res = await postForecast(makeValidPayload({
        kpiHistory: makeKpiHistory(30), // Only 30 days — penalty of -40
      }));
      const body = await res.json();
      expect(body.reliabilityScore).toBeLessThan(70);
    });

    it('deep history (200 days, no gaps) produces a reliability score above 80', async () => {
      const res = await postForecast(makeValidPayload({
        kpiHistory: makeKpiHistory(200),
      }));
      const body = await res.json();
      expect(body.reliabilityScore).toBeGreaterThan(80);
    });

    it('empty actions array → sensitivity.primaryDriver is "Organic Growth"', async () => {
      const res = await postForecast(makeValidPayload({ actions: [] }));
      const body = await res.json();
      expect(body.sensitivity.primaryDriver).toBe('Organic Growth');
    });
  });

  describe('Spec §6 — Interactive Slider Sensitivity', () => {
    it('higher expectedUplift produces higher probabilityOfSuccess for same goal', async () => {
      const lowUpliftPayload = makeValidPayload({
        actions: [{ id: '1', name: 'Action', expectedUplift: 0.02, rampDays: 14, startDayOffset: 7 }],
        goalValue: 65000,
        horizonDays: 30,
        kpiHistory: makeKpiHistory(120),
      });
      const highUpliftPayload = makeValidPayload({
        actions: [{ id: '1', name: 'Action', expectedUplift: 0.40, rampDays: 14, startDayOffset: 7 }],
        goalValue: 65000,
        horizonDays: 30,
        kpiHistory: makeKpiHistory(120),
      });

      const [lowRes, highRes] = await Promise.all([
        postForecast(lowUpliftPayload),
        postForecast(highUpliftPayload),
      ]);
      const [lowBody, highBody] = await Promise.all([lowRes.json(), highRes.json()]);
      expect(highBody.probabilityOfSuccess).toBeGreaterThanOrEqual(lowBody.probabilityOfSuccess);
    });

    it('later launch delay (startDayOffset=60 vs 7) produces lower or equal probability', async () => {
      const earlyPayload = makeValidPayload({
        actions: [{ id: '1', name: 'Action', expectedUplift: 0.15, rampDays: 14, startDayOffset: 7 }],
        horizonDays: 60,
      });
      const latePayload = makeValidPayload({
        actions: [{ id: '1', name: 'Action', expectedUplift: 0.15, rampDays: 14, startDayOffset: 55 }],
        horizonDays: 60,
      });

      const [earlyRes, lateRes] = await Promise.all([
        postForecast(earlyPayload),
        postForecast(latePayload),
      ]);
      const [earlyBody, lateBody] = await Promise.all([earlyRes.json(), lateRes.json()]);
      // Later launch = less time for ramp = lower or equal probability
      expect(earlyBody.probabilityOfSuccess).toBeGreaterThanOrEqual(lateBody.probabilityOfSuccess);
    });
  });
});
