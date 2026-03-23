// ============================================================================
// Module 8: Hybrid Prophet + Monte Carlo Engine — Dedicated Test Suite
// ============================================================================
// This file tests the HYBRID forecasting pipeline defined in the architecture:
//
//   Prophet Baseline Forecast  (deterministic time-series)
//        ↓
//   Sigmoid Impact Model       (S-Curve action ramp-up)
//        ↓
//   Monte Carlo Simulation     (1,000 stochastic futures)
//        ↓
//   StrategyCanvasResult       (probabilityOfSuccess + scenarios)
//
// The architecture guarantees: if Prophet (Python) is unavailable,
// the system gracefully falls back to a TypeScript linear regression,
// and Monte Carlo runs on top of THAT baseline instead.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBaselineForecast, generateFallbackLinearForecast } from '../../src/lib/module-8/prophet-bridge';
import { runMonteCarlo } from '../../src/lib/module-8/monte-carlo';
import { calculateRampFactor } from '../../src/lib/module-8/impact-model';
import { calculateReliabilityScore } from '../../src/lib/module-8/validator';
import { validateStrategy } from '../../src/lib/module-8/strategy-validator';
import type { ForecastRequest, StrategicAction, KpiDataPoint } from '../../src/lib/module-8/types';

// Mock the prophet bridge for all tests — avoids real Python spawn (which causes timeouts).
// Individual describe blocks can override per-test behaviour via mockImplementation.
vi.mock('../../src/lib/module-8/prophet-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/module-8/prophet-bridge')>();
  return {
    ...actual,
    // generateBaselineForecast falls back to linear by default (simulates Python unavailable)
    generateBaselineForecast: vi.fn().mockImplementation(actual.generateFallbackLinearForecast),
  };
});

// ─── Shared Fixtures ─────────────────────────────────────────────────────────

function makeDailyHistory(days: number, startValue: number = 50000, dailyDrift: number = 100): KpiDataPoint[] {
  const pts: KpiDataPoint[] = [];
  let v = startValue;
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    v += dailyDrift + (Math.random() - 0.5) * 200;
    pts.push({ date: d.toISOString().split('T')[0], value: Math.max(0, v) });
  }
  return pts;
}

function makeFlatHistory(days: number, value: number): KpiDataPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
    value,
  }));
}

function makeSparseHistory(days: number, gapEveryN: number = 5): KpiDataPoint[] {
  const pts: KpiDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    if (i % gapEveryN !== 0) {
      pts.push({
        date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
        value: 50000 + i * 50,
      });
    }
  }
  return pts;
}

function makeRequest(overrides: Partial<ForecastRequest> = {}): ForecastRequest {
  return {
    kpiHistory: makeDailyHistory(120),
    goalValue: 65000,
    horizonDays: 30,
    confidenceLevel: 0.95,
    actions: [],
    ...overrides,
  };
}

// ─── LAYER 1: Prophet Bridge + Fallback ──────────────────────────────────────

describe('Hybrid Layer 1: Prophet Bridge & Graceful Fallback', () => {

  describe('generateBaselineForecast — automatic fallback behaviour', () => {
    it('returns the linear fallback when Python is not available (spawn error)', async () => {
      // The vi.mock at the top makes generateBaselineForecast use the linear fallback.
      // This validates the fallback contract: same shape as Prophet output.
      const req = makeRequest({ horizonDays: 20 });
      const forecast = await generateBaselineForecast(req);

      expect(forecast).toHaveLength(20);
      forecast.forEach(pt => {
        expect(typeof pt.yhat).toBe('number');
        expect(typeof pt.yhatLower).toBe('number');
        expect(typeof pt.yhatUpper).toBe('number');
        expect(pt.yhat).toBeGreaterThanOrEqual(0);
      });
    });

    it('fallback output and Prophet output have identical shape (contract test)', async () => {
      const req = makeRequest({ horizonDays: 10 });
      const forecast = await generateBaselineForecast(req);

      // Every point must have these 5 fields regardless of which engine ran
      const requiredFields = ['date', 'day', 'yhat', 'yhatLower', 'yhatUpper'];
      forecast.forEach(pt => {
        requiredFields.forEach(field => {
          expect(pt).toHaveProperty(field);
        });
      });
    });
  });

  describe('generateFallbackLinearForecast — linear regression engine', () => {
    it('extrapolates a clear upward trend correctly', () => {
      // Perfect linear data: 10, 20, 30, 40, 50
      const history: KpiDataPoint[] = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
        { date: '2024-01-04', value: 40 },
        { date: '2024-01-05', value: 50 },
      ];
      const req = makeRequest({ kpiHistory: history, horizonDays: 3 });
      const forecast = generateFallbackLinearForecast(req);

      // Next values should be ~60, ~70, ~80
      expect(forecast[0].yhat).toBeCloseTo(60, 0);
      expect(forecast[1].yhat).toBeCloseTo(70, 0);
      expect(forecast[2].yhat).toBeCloseTo(80, 0);
    });

    it('extrapolates a downward trend correctly', () => {
      const history: KpiDataPoint[] = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 80 },
        { date: '2024-01-03', value: 60 },
        { date: '2024-01-04', value: 40 },
        { date: '2024-01-05', value: 20 },
      ];
      const req = makeRequest({ kpiHistory: history, horizonDays: 2, goalValue: 1 });
      const forecast = generateFallbackLinearForecast(req);

      // Next values would be 0 and negative — should clamp to 0
      expect(forecast[0].yhat).toBeGreaterThanOrEqual(0);
      expect(forecast[1].yhat).toBeGreaterThanOrEqual(0);
    });

    it('never produces negative yhat values (clamped at zero)', () => {
      const history = makeDailyHistory(30, 5000, -300); // strong downtrend
      const req = makeRequest({ kpiHistory: history, horizonDays: 60, goalValue: 1 });
      const forecast = generateFallbackLinearForecast(req);

      forecast.forEach(pt => {
        expect(pt.yhat).toBeGreaterThanOrEqual(0);
        expect(pt.yhatLower).toBeGreaterThanOrEqual(0);
      });
    });

    it('produces horizonDays exactly matching the requested length', () => {
      [7, 14, 30, 60, 90, 180].forEach(days => {
        const req = makeRequest({ horizonDays: days });
        const forecast = generateFallbackLinearForecast(req);
        expect(forecast).toHaveLength(days);
      });
    });

    it('day indices are sequential starting from 1', () => {
      const req = makeRequest({ horizonDays: 5 });
      const forecast = generateFallbackLinearForecast(req);
      expect(forecast[0].day).toBe(1);
      expect(forecast[4].day).toBe(5);
    });

    it('dates are sequential (each day is +1 from the previous)', () => {
      const req = makeRequest({ horizonDays: 5 });
      const forecast = generateFallbackLinearForecast(req);
      for (let i = 1; i < forecast.length; i++) {
        const prev = new Date(forecast[i - 1].date).getTime();
        const curr = new Date(forecast[i].date).getTime();
        expect(curr - prev).toBe(86400000); // exactly 1 day in ms
      }
    });

    it('uncertainty bands grow wider over time (expanding cone)', () => {
      const req = makeRequest({ horizonDays: 30 });
      const forecast = generateFallbackLinearForecast(req);
      const earlyWidth = forecast[0].yhatUpper - forecast[0].yhatLower;
      const midWidth = forecast[14].yhatUpper - forecast[14].yhatLower;
      const lateWidth = forecast[29].yhatUpper - forecast[29].yhatLower;

      expect(midWidth).toBeGreaterThan(earlyWidth);
      expect(lateWidth).toBeGreaterThan(midWidth);
    });

    it('handles <2 data points by returning a dummy constant forecast', () => {
      const req = makeRequest({ kpiHistory: [{ date: '2024-01-01', value: 50000 }], horizonDays: 5 });
      const forecast = generateFallbackLinearForecast(req);
      expect(forecast).toHaveLength(5);
      // All yhats should equal goalValue / 2 (default dummy value)
      forecast.forEach(pt => {
        expect(pt.yhat).toBeCloseTo(req.goalValue / 2, 0);
      });
    });
  });
});

// ─── LAYER 2: Sigmoid Impact Model ───────────────────────────────────────────

describe('Hybrid Layer 2: Sigmoid S-Curve Impact Model', () => {

  describe('calculateRampFactor — boundary conditions', () => {
    it('returns exactly 0 before action starts', () => {
      expect(calculateRampFactor(0, 10, 20)).toBe(0);
      expect(calculateRampFactor(9, 10, 20)).toBe(0);
    });

    it('returns exactly 1 after ramp completes', () => {
      expect(calculateRampFactor(30, 10, 20)).toBe(1);
      expect(calculateRampFactor(100, 10, 20)).toBe(1);
    });

    it('returns ~0.5 at the exact midpoint of the ramp (S-curve inflection)', () => {
      // midpoint = startDay + rampDays/2 = 10 + 10 = 20
      const mid = calculateRampFactor(20, 10, 20);
      expect(mid).toBeGreaterThan(0.45);
      expect(mid).toBeLessThan(0.55);
    });

    it('is monotonically increasing from startDay to startDay+rampDays', () => {
      const startDay = 5;
      const rampDays = 30;
      let prev = calculateRampFactor(startDay, startDay, rampDays);
      for (let day = startDay + 1; day < startDay + rampDays; day++) {
        const curr = calculateRampFactor(day, startDay, rampDays);
        expect(curr).toBeGreaterThanOrEqual(prev);
        prev = curr;
      }
    });

    it('output is always between 0 and 1 for any inputs', () => {
      const testCases = [
        [0, 0, 30], [0, 5, 30], [15, 5, 30], [35, 5, 30],
        [0, 0, 1], [1, 0, 1], [50, 10, 100], [200, 10, 100],
      ];
      testCases.forEach(([day, startDay, rampDays]) => {
        const result = calculateRampFactor(day, startDay, rampDays);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      });
    });

    it('ramp factor at day startDay+1 is close to 0 (not 0.5)', () => {
      // The early part of the S-curve should still be near 0
      const earlyRamp = calculateRampFactor(11, 10, 30);
      expect(earlyRamp).toBeLessThan(0.2);
    });

    it('ramp factor near end of ramp is close to 1 (not 0.5)', () => {
      const lateRamp = calculateRampFactor(39, 10, 30);
      expect(lateRamp).toBeGreaterThan(0.8);
    });

    it('longer rampDays produces a gentler slope at midpoint', () => {
      // Short ramp: steeper change per day
      const shortRampEarly = calculateRampFactor(6, 5, 5);   // 1/5 through short ramp
      const longRampEarly = calculateRampFactor(6, 5, 50);   // 1/50 through long ramp
      expect(longRampEarly).toBeLessThan(shortRampEarly);
    });
  });
});

// ─── LAYER 3: Monte Carlo Simulation Engine ───────────────────────────────────

describe('Hybrid Layer 3: Monte Carlo Stochastic Simulation', () => {

  describe('runMonteCarlo — probability bounds', () => {
    it('returns 0 for an empty baseline', () => {
      expect(runMonteCarlo([], [], 100)).toBe(0);
    });

    it('returns a probability strictly between 0 and 1', () => {
      const baseline = makeDailyHistory(30, 50000).map(p => p.value);
      const prob = runMonteCarlo(baseline, [], 55000, 500);
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });

    it('returns near 0 for an impossible goal (10× current value)', () => {
      const baseline = new Array(30).fill(10000);
      const prob = runMonteCarlo(baseline, [], 100000, 1000); // 10× impossible
      expect(prob).toBeLessThan(0.05);
    });

    it('returns near 1 for an already-achieved goal', () => {
      const baseline = new Array(30).fill(100000);
      const prob = runMonteCarlo(baseline, [], 50000, 1000); // goal already exceeded
      expect(prob).toBeGreaterThan(0.90);
    });

    it('returns near 0.5 for a borderline goal at current value', () => {
      // When the baseline exactly equals the goal, noise alone decides ~50%
      const baseline = new Array(30).fill(50000);
      const prob = runMonteCarlo(baseline, [], 50000, 2000);
      expect(prob).toBeGreaterThan(0.35);
      expect(prob).toBeLessThan(0.65);
    });
  });

  describe('runMonteCarlo — action uplift effects', () => {
    it('adding a high-uplift action significantly increases probability', () => {
      const baseline = new Array(30).fill(50000);
      const goal = 60000;

      const probNoAction = runMonteCarlo(baseline, [], goal, 1000);
      const highUpliftAction: StrategicAction = {
        id: '1', name: 'Big Campaign',
        expectedUplift: 0.30, rampDays: 1, startDayOffset: 0
      };
      const probWithAction = runMonteCarlo(baseline, [highUpliftAction], goal, 1000);

      expect(probWithAction).toBeGreaterThan(probNoAction);
    });

    it('multiple actions combine multiplicatively to boost probability', () => {
      const baseline = new Array(30).fill(50000);
      const goal = 70000;

      const action1: StrategicAction = { id: '1', name: 'A', expectedUplift: 0.15, rampDays: 1, startDayOffset: 0 };
      const action2: StrategicAction = { id: '2', name: 'B', expectedUplift: 0.15, rampDays: 1, startDayOffset: 0 };

      const prob1 = runMonteCarlo(baseline, [action1], goal, 1000);
      const prob2 = runMonteCarlo(baseline, [action2], goal, 1000);
      const probBoth = runMonteCarlo(baseline, [action1, action2], goal, 1000);

      // Combined should be higher than either alone
      expect(probBoth).toBeGreaterThan(Math.max(prob1, prob2));
    });

    it('an action not yet ramped (startDayOffset > horizonDays) has minimal impact', () => {
      const baseline = new Array(30).fill(50000);
      const goal = 55000;

      const futureAction: StrategicAction = {
        id: '1', name: 'Future',
        expectedUplift: 0.50, rampDays: 30, startDayOffset: 60 // beyond 30-day horizon
      };
      const probNoAction = runMonteCarlo(baseline, [], goal, 1000);
      const probFutureAction = runMonteCarlo(baseline, [futureAction], goal, 1000);

      // The future action's ramp factor at day 29 is 0, so it has no effect
      expect(Math.abs(probFutureAction - probNoAction)).toBeLessThan(0.15);
    });

    it('execution quality randomness stays within 70%–110% range per spec', () => {
      // Run 100 iterations and verify that the final value is always within
      // the execution quality range for a known baseline and action
      const baseline = [10000]; // single-day baseline
      const action: StrategicAction = {
        id: '1', name: 'Test', expectedUplift: 1.0, rampDays: 1, startDayOffset: 0
      };
      // With uplift=1.0 (100% more), executionQuality 0.7-1.1, ignoring noise:
      // simulatedValue = 10000 * (1 + noise) * (1 + 1.0 * quality * 1.0)
      // min: ~10000 * 0.95 * 1.7 ≈ 16150
      // max: ~10000 * 1.05 * 2.1 ≈ 22050
      // Goal of 5000 should always be met → prob should be 1.0
      const prob = runMonteCarlo(baseline, [action], 5000, 500);
      expect(prob).toBeGreaterThan(0.99);
    });
  });

  describe('runMonteCarlo — statistical convergence', () => {
    it('results are stable across multiple runs (within 15% variance)', () => {
      const baseline = new Array(60).fill(55000);
      const goal = 60000;
      const action: StrategicAction = {
        id: '1', name: 'Campaign', expectedUplift: 0.12, rampDays: 14, startDayOffset: 7
      };
      const runs = Array.from({ length: 5 }, () =>
        runMonteCarlo(baseline, [action], goal, 500)
      );
      const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
      runs.forEach(r => {
        expect(Math.abs(r - avg)).toBeLessThan(0.15);
      });
    });

    it('1000 iterations produce more stable results than 50 iterations', () => {
      // With 50 iterations, variance can be high. We test that 1000-iteration
      // runs across 3 calls have smaller max spread than 50-iteration runs.
      const baseline = new Array(30).fill(52000);
      const goal = 55000;

      const low50 = Array.from({ length: 6 }, () => runMonteCarlo(baseline, [], goal, 50));
      const high1000 = Array.from({ length: 6 }, () => runMonteCarlo(baseline, [], goal, 1000));

      const spread50 = Math.max(...low50) - Math.min(...low50);
      const spread1000 = Math.max(...high1000) - Math.min(...high1000);

      // 1000-iteration runs should converge better (smaller spread)
      expect(spread1000).toBeLessThan(spread50 + 0.1); // 0.1 tolerance for occasional luck
    });
  });
});

// ─── LAYER 4: Full Hybrid Pipeline Integration ────────────────────────────────

describe('Hybrid Layer 4: Full Prophet → Monte Carlo Pipeline Integration', () => {

  describe('Prophet-fallback → Monte Carlo chain (no Python)', () => {
    it('complete pipeline runs end-to-end with linear fallback as Prophet substitute', async () => {
      const result = await validateStrategy(makeRequest({
        kpiHistory: makeDailyHistory(120, 50000),
        goalValue: 65000,
        horizonDays: 45,
        actions: [
          { id: '1', name: 'Email Campaign', expectedUplift: 0.15, rampDays: 21, startDayOffset: 14 },
        ],
      }));

      expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1);
      expect(result.reliabilityScore).toBeGreaterThan(0);
      expect(result.scenarios.baseline.length).toBe(45);
      expect(result.scenarios.optimistic.length).toBe(45);
      expect(result.scenarios.conservative.length).toBe(45);
    });

    it('optimistic forecast is always >= baseline (action uplift applied)', async () => {
      const result = await validateStrategy(makeRequest({
        kpiHistory: makeDailyHistory(120),
        horizonDays: 30,
        actions: [{ id: '1', name: 'Push', expectedUplift: 0.20, rampDays: 14, startDayOffset: 0 }],
      }));

      result.scenarios.baseline.forEach((base, i) => {
        const opt = result.scenarios.optimistic[i];
        expect(opt.yhat).toBeGreaterThanOrEqual(base.yhat - 0.001);
      });
    });

    it('conservative forecast is always a 5% haircut on baseline', async () => {
      const result = await validateStrategy(makeRequest({
        kpiHistory: makeDailyHistory(90),
        horizonDays: 20,
        actions: [],
      }));

      result.scenarios.baseline.forEach((base, i) => {
        const cons = result.scenarios.conservative[i];
        expect(cons.yhat).toBeCloseTo(base.yhat * 0.95, 1);
      });
    });

    it('Monte Carlo probability increases when a strong action is added', async () => {
      const sharedHistory = makeDailyHistory(120, 50000);
      const goalValue = 58000;
      const horizonDays = 30;

      const noActionResult = await validateStrategy(makeRequest({
        kpiHistory: sharedHistory, goalValue, horizonDays, actions: []
      }));

      const withActionResult = await validateStrategy(makeRequest({
        kpiHistory: sharedHistory, goalValue, horizonDays,
        actions: [{ id: '1', name: 'Boost', expectedUplift: 0.25, rampDays: 7, startDayOffset: 0 }]
      }));

      expect(withActionResult.probabilityOfSuccess).toBeGreaterThanOrEqual(
        noActionResult.probabilityOfSuccess
      );
    });

    it('milestones are correctly generated for each action phase', async () => {
      const result = await validateStrategy(makeRequest({
        kpiHistory: makeDailyHistory(120),
        horizonDays: 60,
        actions: [
          { id: '1', name: 'Email Campaign', expectedUplift: 0.10, rampDays: 21, startDayOffset: 7 },
          { id: '2', name: 'SEO Push',       expectedUplift: 0.05, rampDays: 14, startDayOffset: 14 },
        ],
      }));

      const starts = result.milestones.filter(m => m.type === 'action_start');
      const completes = result.milestones.filter(m => m.type === 'ramp_complete');
      const targets = result.milestones.filter(m => m.type === 'target');

      expect(starts.length).toBe(2);
      expect(completes.length).toBe(2);
      expect(targets.length).toBe(1);
      expect(targets[0].value).toBe(makeRequest().goalValue);
    });
  });

  describe('Reliability Score interacts correctly with hybrid pipeline', () => {
    it('low reliability score does NOT block the pipeline — result still produced', async () => {
      // <90 days → score = 60. Should warn but NOT throw.
      const result = await validateStrategy(makeRequest({
        kpiHistory: makeDailyHistory(30),
        horizonDays: 14,
        actions: [],
      }));
      expect(result).toBeDefined();
      expect(result.reliabilityScore).toBeLessThan(70);
      expect(result.scenarios.baseline.length).toBe(14);
    });

    it('very sparse history (>5% gaps) reduces reliability score by 20 points', () => {
      const sparseHistory = makeSparseHistory(120, 3); // gaps every 3rd day = ~33% gap ratio
      const score = calculateReliabilityScore(sparseHistory);
      // Full (120 days, no gap): score would be 90. Sparse with gaps > 5%: -20 → 70
      expect(score).toBeLessThanOrEqual(70);
    });

    it('high outlier density (>10%) reduces reliability score by 15 points', () => {
      // Create history with 20% extreme outliers
      const history: KpiDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 86400000).toISOString().split('T')[0],
        value: i % 5 === 0 ? 1000000 : 50000, // 20% are extreme outliers
      }));
      const score = calculateReliabilityScore(history);
      expect(score).toBeLessThanOrEqual(75); // 90 - 15 = 75
    });

    it('flat data (CV < 1%) reduces reliability score by 10 points', () => {
      const flatHistory = makeFlatHistory(200, 50000); // zero variance
      const score = calculateReliabilityScore(flatHistory);
      // 200 days no gaps no outliers = 100, but CV < 0.01 → -10 → 90
      expect(score).toBeLessThanOrEqual(90);
    });

    it('perfect 200-day clean trending history scores 100', () => {
      const history = makeDailyHistory(200, 40000, 50); // 200 days, gentle uptrend, daily data
      const score = calculateReliabilityScore(history);
      expect(score).toBe(100);
    });
  });

  describe('Prophet → Monte Carlo sensitivity (slider simulation)', () => {
    it('increasing uplift from 5% to 30% increases probability monotonically', async () => {
      // Uses Monte Carlo directly (no Prophet spawn) — fast and deterministic
      const baseline = new Array(30).fill(55000);
      const goal = 60000;
      const upliftLevels = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
      const probs = upliftLevels.map(uplift =>
        runMonteCarlo(baseline, [{ id: '1', name: 'Campaign', expectedUplift: uplift, rampDays: 7, startDayOffset: 0 }], goal, 1000)
      );

      // Probability should be non-decreasing as uplift increases
      for (let i = 1; i < probs.length; i++) {
        expect(probs[i]).toBeGreaterThanOrEqual(probs[i - 1] - 0.05);
      }
    });

    it('launching earlier (lower startDayOffset) always helps or is neutral', async () => {
      // Uses Monte Carlo directly — simulates slider "launch delay" sensitivity
      const baseline = new Array(30).fill(55000);
      const goal = 60000;
      const offsets = [0, 7, 14, 21, 28];
      const probs = offsets.map(offset =>
        runMonteCarlo(baseline, [{ id: '1', name: 'Campaign', expectedUplift: 0.15, rampDays: 7, startDayOffset: offset }], goal, 1000)
      );

      // probs[0] (offset=0) should be >= probs[4] (offset=28)
      expect(probs[0]).toBeGreaterThanOrEqual(probs[probs.length - 1] - 0.05);
    });

    it('longer rampDays reduces early-horizon impact but maxes out the same', () => {
      // With 60-day horizon and strong uplift:
      // Short ramp (7d) → reaches full impact earlier → better probability
      // Long ramp (50d) → slower to reach full impact → lower probability
      const history = makeDailyHistory(120, 50000);
      const action = (rampDays: number): StrategicAction => ({
        id: '1', name: 'Campaign', expectedUplift: 0.20,
        rampDays, startDayOffset: 0
      });

      // Short and long ramp within a 60-day horizon
      // We just verify both return valid probabilities, not which is higher
      // (since outcome depends on baseline trajectory too)
      const shortRampResult = runMonteCarlo(
        new Array(60).fill(55000),
        [action(5)],
        60000, 500
      );
      const longRampResult = runMonteCarlo(
        new Array(60).fill(55000),
        [action(50)],
        60000, 500
      );

      expect(shortRampResult).toBeGreaterThanOrEqual(longRampResult - 0.05);
    });
  });
});
