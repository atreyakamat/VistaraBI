// Module 7 → Module 8 Bridge Integration Test
// Spec §8 — "module-7-to-8-bridge.test.ts"
// Verifies that Module 7 StrategyCanvas output is correctly parsed
// into Module 8 ForecastRequest regressors and that the full pipeline runs.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankActions } from '../../src/lib/module-7/action-ranker';
import { parseGoal } from '../../src/lib/module-7/goal-parser';
import { decomposeGoal } from '../../src/lib/module-7/goal-decomposer';
import { generateFallbackLinearForecast } from '../../src/lib/module-8/prophet-bridge';
import { validateStrategy } from '../../src/lib/module-8/strategy-validator';
import type { ForecastRequest, StrategicAction } from '../../src/lib/module-8/types';
import type { GeneratedAction } from '../../src/lib/module-7/action-generator';

// ─── Mock Heavy Dependencies ──────────────────────────────────────────────────

// Mock the prophet bridge so tests don't need Python
vi.mock('../../src/lib/module-8/prophet-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/module-8/prophet-bridge')>();
  return {
    ...actual,
    generateBaselineForecast: vi.fn().mockImplementation(actual.generateFallbackLinearForecast),
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeKpiHistory(days: number, baseValue: number = 50000): { date: string; value: number }[] {
  const history = [];
  let val = baseValue;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    val += (Math.random() - 0.4) * 200;
    history.push({ date: d.toISOString().split('T')[0], value: Math.max(0, val) });
  }
  return history;
}

// Simulates what the GoalStrategyPanel converts from a Module 7 RankedAction
function convertM7ActionToM8Regressor(
  actionName: string,
  confidenceScore: number,           // Module 7: 0-100
  startDayOffset: number = 14,
  rampDays: number = 30
): StrategicAction {
  return {
    id: `m8-${actionName.toLowerCase().replace(/\s+/g, '-')}`,
    name: actionName,
    // Convert Module 7 confidence (0-100) to Module 8 uplift (0.0-0.5 range)
    expectedUplift: (confidenceScore / 100) * 0.3,
    rampDays,
    startDayOffset,
  };
}

function parseLiftPercent(rawLift: string | undefined): number | null {
  if (!rawLift) return null;
  const match = rawLift.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveSimulatorUplift(
  action: { confidenceScore: number; scenarios: Array<{ level: 'LEAN' | 'BALANCED' | 'PREMIUM'; expectedKpiLift: string }> }
): number {
  const balanced = action.scenarios.find((s) => s.level === 'BALANCED');
  const fallback = action.scenarios[0];
  const parsedLift = parseLiftPercent(balanced?.expectedKpiLift) ?? parseLiftPercent(fallback?.expectedKpiLift);
  return parsedLift ?? Math.max(1, Math.round(action.confidenceScore * 0.3));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Module 7 → Module 8 Bridge', () => {

  describe('Module 7 Output Shapes', () => {
    it('parseGoal returns a valid ParsedGoal with all required fields', async () => {
      const goal = await parseGoal('Increase revenue by 20% this quarter');
      expect(goal).toHaveProperty('targetMetric');
      expect(goal).toHaveProperty('targetValue');
      expect(goal).toHaveProperty('timeframe');
      expect(goal).toHaveProperty('changeDirection');
      expect(['increase', 'decrease', 'maintain']).toContain(goal.changeDirection);
    });

    it('decomposeGoal returns factors array with weight and description', async () => {
      const goal = await parseGoal('Increase MRR by $50k in 6 months');
      const decomposed = decomposeGoal(goal, 'SAAS');
      expect(decomposed.factors.length).toBeGreaterThan(0);
      decomposed.factors.forEach(f => {
        expect(f).toHaveProperty('metric');
        expect(f).toHaveProperty('requiredChange');
        expect(f).toHaveProperty('weight');
        expect(f.weight).toBeGreaterThan(0);
        expect(f.weight).toBeLessThanOrEqual(1);
      });
    });

    it('rankActions returns top 3 sorted by confidenceScore descending', () => {
      const mockActions: GeneratedAction[] = [
        { id: '1', actionName: 'Email Campaign', description: 'Send emails', estimatedEffectiveness: 7, domainFit: 9, costToImplement: 2, speedToMarket: 8 },
        { id: '2', actionName: 'SEO Optimization', description: 'Improve SEO', estimatedEffectiveness: 6, domainFit: 7, costToImplement: 3, speedToMarket: 4 },
        { id: '3', actionName: 'Paid Ads', description: 'Run ads', estimatedEffectiveness: 8, domainFit: 8, costToImplement: 7, speedToMarket: 9 },
        { id: '4', actionName: 'Content Marketing', description: 'Create content', estimatedEffectiveness: 5, domainFit: 7, costToImplement: 2, speedToMarket: 3 },
      ];
      const top3 = rankActions(mockActions, 3);
      expect(top3).toHaveLength(3);
      expect(top3[0].confidenceScore).toBeGreaterThanOrEqual(top3[1].confidenceScore);
      expect(top3[1].confidenceScore).toBeGreaterThanOrEqual(top3[2].confidenceScore);
      expect(['high', 'medium', 'low']).toContain(top3[0].tier);
    });
  });

  describe('Action → Regressor Conversion', () => {
    it('converts a Module 7 high-confidence action to a valid M8 StrategicAction', () => {
      const regressor = convertM7ActionToM8Regressor('Email Campaign', 85);
      expect(regressor.id).toBeTruthy();
      expect(regressor.name).toBe('Email Campaign');
      expect(regressor.expectedUplift).toBeGreaterThan(0);
      expect(regressor.expectedUplift).toBeLessThanOrEqual(0.5); // Max uplift cap
      expect(regressor.rampDays).toBeGreaterThan(0);
      expect(regressor.startDayOffset).toBeGreaterThanOrEqual(0);
    });

    it('high-confidence actions (85%) produce higher uplift than low-confidence (30%)', () => {
      const highConf = convertM7ActionToM8Regressor('Strategy A', 85);
      const lowConf = convertM7ActionToM8Regressor('Strategy B', 30);
      expect(highConf.expectedUplift).toBeGreaterThan(lowConf.expectedUplift);
    });

    it('startDayOffset defaults to 14 (2-week launch delay per spec)', () => {
      const regressor = convertM7ActionToM8Regressor('Any Action', 70);
      expect(regressor.startDayOffset).toBe(14);
    });

    it('derives simulator uplift from BALANCED expectedKpiLift to avoid handoff data loss', () => {
      const mockAction = {
        confidenceScore: 81,
        scenarios: [
          { level: 'LEAN' as const, expectedKpiLift: '3–7%' },
          { level: 'BALANCED' as const, expectedKpiLift: '8-15%' },
          { level: 'PREMIUM' as const, expectedKpiLift: '15–30%' },
        ],
      };
      const uplift = deriveSimulatorUplift(mockAction);
      expect(uplift).toBe(8);
    });
  });

  describe('M7 → M8 Full Pipeline Integration', () => {
    it('builds a valid ForecastRequest from M7 actions and runs validateStrategy', async () => {
      const actions: StrategicAction[] = [
        convertM7ActionToM8Regressor('Email Campaign', 82, 14, 21),
        convertM7ActionToM8Regressor('SEO Push', 65, 7, 30),
      ];

      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(180),
        goalValue: 75000,
        horizonDays: 90,
        confidenceLevel: 0.95,
        actions,
        domain: 'ECOMMERCE',
      };

      const result = await validateStrategy(req);

      // StrategyCanvasResult must include all required fields per spec
      expect(result).toHaveProperty('reliabilityScore');
      expect(result).toHaveProperty('probabilityOfSuccess');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('sensitivity');
      expect(result).toHaveProperty('milestones');
    });

    it('preserves handoff payload fields from M7 action into M8 request without mutation', async () => {
      const sourceAction = {
        actionName: 'Email Campaign',
        confidenceScore: 82,
        scenarios: [
          { level: 'LEAN' as const, expectedKpiLift: '3–7%' },
          { level: 'BALANCED' as const, expectedKpiLift: '8-15%' },
          { level: 'PREMIUM' as const, expectedKpiLift: '15–30%' },
        ],
      };
      const uplift = deriveSimulatorUplift(sourceAction);
      const strategicAction: StrategicAction = {
        id: 'm8-email-campaign',
        name: sourceAction.actionName,
        expectedUplift: uplift / 100,
        rampDays: 30,
        startDayOffset: 14,
      };

      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120),
        goalValue: 75000,
        horizonDays: 60,
        confidenceLevel: 0.95,
        actions: [strategicAction],
      };
      const result = await validateStrategy(req);

      expect(req.actions[0].name).toBe(sourceAction.actionName);
      expect(req.actions[0].expectedUplift).toBeCloseTo(0.08, 5);
      expect(result.sensitivity.primaryDriver).toBe(sourceAction.actionName);
    });

    it('scenarios contain baseline, optimistic, and conservative arrays', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120),
        goalValue: 60000,
        horizonDays: 60,
        confidenceLevel: 0.95,
        actions: [convertM7ActionToM8Regressor('Paid Ads', 75, 7, 14)],
      };

      const result = await validateStrategy(req);

      expect(result.scenarios.baseline.length).toBe(60);
      expect(result.scenarios.optimistic.length).toBe(60);
      expect(result.scenarios.conservative.length).toBe(60);
    });

    it('optimistic scenario is always >= baseline at every point', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120, 40000),
        goalValue: 55000,
        horizonDays: 30,
        confidenceLevel: 0.95,
        actions: [convertM7ActionToM8Regressor('Flash Sale', 80, 5, 10)],
      };

      const result = await validateStrategy(req);

      result.scenarios.baseline.forEach((basePoint, i) => {
        const optPoint = result.scenarios.optimistic[i];
        expect(optPoint.yhat).toBeGreaterThanOrEqual(basePoint.yhat);
      });
    });

    it('conservative scenario is always <= baseline at every point', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120, 40000),
        goalValue: 55000,
        horizonDays: 30,
        confidenceLevel: 0.95,
        actions: [convertM7ActionToM8Regressor('Flash Sale', 80, 5, 10)],
      };

      const result = await validateStrategy(req);

      result.scenarios.baseline.forEach((basePoint, i) => {
        const consPoint = result.scenarios.conservative[i];
        expect(consPoint.yhat).toBeLessThanOrEqual(basePoint.yhat * 1.001); // small float tolerance
      });
    });

    it('milestones include action_start, ramp_complete, and target milestone types', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120),
        goalValue: 70000,
        horizonDays: 60,
        confidenceLevel: 0.95,
        actions: [convertM7ActionToM8Regressor('Email Campaign', 80, 7, 21)],
      };

      const result = await validateStrategy(req);
      const types = result.milestones.map(m => m.type);
      expect(types).toContain('action_start');
      expect(types).toContain('ramp_complete');
      expect(types).toContain('target');
    });

    it('sensitivity.primaryDriver matches the action with highest expectedUplift', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(120),
        goalValue: 70000,
        horizonDays: 60,
        confidenceLevel: 0.95,
        actions: [
          { id: '1', name: 'Small Action', expectedUplift: 0.05, rampDays: 14, startDayOffset: 7 },
          { id: '2', name: 'Big Campaign', expectedUplift: 0.30, rampDays: 21, startDayOffset: 14 },
        ],
      };

      const result = await validateStrategy(req);
      expect(result.sensitivity.primaryDriver).toBe('Big Campaign');
    });

    it('probabilityOfSuccess is a number between 0 and 1', async () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(100),
        goalValue: 65000,
        horizonDays: 45,
        confidenceLevel: 0.95,
        actions: [convertM7ActionToM8Regressor('Actions', 70, 7, 14)],
      };

      const result = await validateStrategy(req);
      expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1);
    });
  });

  describe('Fallback Linear Forecaster', () => {
    it('linear forecast produces correct number of points for horizonDays', () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(90),
        goalValue: 60000,
        horizonDays: 30,
        confidenceLevel: 0.95,
        actions: [],
      };
      const forecast = generateFallbackLinearForecast(req);
      expect(forecast).toHaveLength(30);
    });

    it('each forecast point has date, day, yhat, yhatLower, yhatUpper', () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(90),
        goalValue: 60000,
        horizonDays: 10,
        confidenceLevel: 0.95,
        actions: [],
      };
      const forecast = generateFallbackLinearForecast(req);
      forecast.forEach(pt => {
        expect(pt).toHaveProperty('date');
        expect(pt).toHaveProperty('day');
        expect(pt).toHaveProperty('yhat');
        expect(pt).toHaveProperty('yhatLower');
        expect(pt).toHaveProperty('yhatUpper');
        expect(pt.yhatLower).toBeLessThanOrEqual(pt.yhat);
        expect(pt.yhatUpper).toBeGreaterThanOrEqual(pt.yhat);
      });
    });

    it('confidence bounds widen over time (uncertainty grows)', () => {
      const req: ForecastRequest = {
        kpiHistory: makeKpiHistory(90, 50000),
        goalValue: 60000,
        horizonDays: 20,
        confidenceLevel: 0.95,
        actions: [],
      };
      const forecast = generateFallbackLinearForecast(req);
      const earlyWidth = forecast[1].yhatUpper - forecast[1].yhatLower;
      const lateWidth = forecast[19].yhatUpper - forecast[19].yhatLower;
      expect(lateWidth).toBeGreaterThan(earlyWidth);
    });
  });
});
