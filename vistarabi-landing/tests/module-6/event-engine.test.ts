// event-engine.test.ts — Module 6B deterministic classification tests
import { describe, it, expect } from 'vitest';
import { classifyEvent, classifyConfidence, extractPeriodBounds, THRESHOLDS } from '../../src/lib/module-6/events/event-engine';
import type { EnrichedKPIResult } from '../../src/lib/dashboard-state/types';

// ─── Test Fixture Factory ─────────────────────────────────────────────────────

function makeResult(overrides: Partial<{
    datasetLength: number;
    deltaPercent: number | null;
    deltaDirection: 'up' | 'down' | 'flat' | null;
    anomalyDetected: boolean;
    anomalyZScore: number;
    anomalyPeriod: string;
    volatilityIndex: number;
}>): EnrichedKPIResult {
    const {
        datasetLength = 12,
        deltaPercent = 0,
        deltaDirection = 'flat',
        anomalyDetected = false,
        anomalyZScore = 0,
        anomalyPeriod = '2024-01-01',
        volatilityIndex = 0.1,
    } = overrides;

    // Build dataset array of KPIDataPoints
    const dataset = Array.from({ length: datasetLength }, (_, i) => ({
        label: `2024-${String(i + 1).padStart(2, '0')}-01`,
        value: 1000 + i * 10,
    }));

    return {
        kpiId: 'kpi-test-001',
        kpiName: 'Test Revenue',
        category: 'revenue',
        primaryValue: 1200,
        previousValue: 1000,
        delta: deltaPercent !== null ? (deltaPercent / 100) * 1000 : null,
        deltaPercent,
        deltaDirection,
        dataset,
        datasetSize: datasetLength,
        profiling: {
            recordCount: datasetLength,
            uniqueCategoryCount: 1,
            numberOfSeries: 1,
            hasTimeDimension: true,
            numericDimensionCount: 1,
            hierarchicalDepth: 0,
            volatilityIndex,
            distributionSkew: 0,
            cardinalityLevel: 'low',
            isSequentialChange: true,
        },
        recommendedChartType: 'line',
        recommendedChartLibrary: 'chart-js',
        disableAnimation: false,
        aiExplanation: null,
        lineage: { tables: ['orders'], joins: [], formula: 'SUM(revenue)', aggregations: ['SUM'] },
        performance: { totalTimeMs: 50, dataLoadTimeMs: 10, computeTimeMs: 20, profilingTimeMs: 5, cacheHit: false, cacheKey: null },
        summary: {
            headline: 'Test headline',
            detail: 'Test detail',
            trendLabel: 'stable',
            thresholdBand: 'low',
            generatedAt: new Date().toISOString(),
        },
        anomaly: anomalyDetected ? {
            detected: true,
            severity: 'high',
            worstPoint: { label: anomalyPeriod, value: 5000, zScore: anomalyZScore, severity: 'high' },
            affectedPoints: [],
            reasoning: 'Z-score exceeded threshold',
        } : {
            detected: false,
            severity: 'low',
            worstPoint: { label: '', value: 0, zScore: 0, severity: 'low' },
            affectedPoints: [],
            reasoning: '',
        },
        guardrail: null,
        unit: 'currency',
    } as unknown as EnrichedKPIResult;
}

// ─── classifyEvent Tests ──────────────────────────────────────────────────────

describe('event-engine.test — classifyEvent()', () => {
    it('dataset < 5 → INSUFFICIENT_DATA (first priority)', () => {
        const result = makeResult({ datasetLength: 3, anomalyDetected: true, deltaPercent: 50 });
        expect(classifyEvent(result)).toBe('INSUFFICIENT_DATA');
    });

    it('dataset exactly 5 → not INSUFFICIENT_DATA', () => {
        const result = makeResult({ datasetLength: 5, deltaPercent: 0, volatilityIndex: 0.1 });
        expect(classifyEvent(result)).not.toBe('INSUFFICIENT_DATA');
    });

    it('anomaly detected → ANOMALY (second priority)', () => {
        const result = makeResult({ anomalyDetected: true, deltaPercent: 3, volatilityIndex: 0.1 });
        expect(classifyEvent(result)).toBe('ANOMALY');
    });

    it('|deltaPercent| >= 10% → TREND_CHANGE (third priority)', () => {
        const up = makeResult({ deltaPercent: 15, deltaDirection: 'up' });
        const down = makeResult({ deltaPercent: -12, deltaDirection: 'down' });
        expect(classifyEvent(up)).toBe('TREND_CHANGE');
        expect(classifyEvent(down)).toBe('TREND_CHANGE');
    });

    it('delta < -5%, dir DOWN, < 10% → DROP', () => {
        const result = makeResult({ deltaPercent: -7, deltaDirection: 'down' });
        expect(classifyEvent(result)).toBe('DROP');
    });

    it('delta > 5%, dir UP, < 10% → SPIKE', () => {
        const result = makeResult({ deltaPercent: 7, deltaDirection: 'up' });
        expect(classifyEvent(result)).toBe('SPIKE');
    });

    it('volatilityIndex > 0.3, small delta → VOLATILITY_SHIFT', () => {
        const result = makeResult({ volatilityIndex: 0.5, deltaPercent: 2, deltaDirection: 'up' });
        expect(classifyEvent(result)).toBe('VOLATILITY_SHIFT');
    });

    it('delta < 5%, no anomaly, normal volatility → NO_SIGNIFICANT_EVENT', () => {
        const result = makeResult({ deltaPercent: 1, deltaDirection: 'flat', volatilityIndex: 0.1 });
        expect(classifyEvent(result)).toBe('NO_SIGNIFICANT_EVENT');
    });

    it('delta exactly 5% and direction UP → SPIKE (at boundary)', () => {
        const result = makeResult({ deltaPercent: 5.001, deltaDirection: 'up' });
        expect(classifyEvent(result)).toBe('SPIKE');
    });
});

// ─── classifyConfidence Tests ─────────────────────────────────────────────────

describe('event-engine.test — classifyConfidence()', () => {
    it('dataset < 5 → insufficient', () => {
        const result = makeResult({ datasetLength: 4 });
        expect(classifyConfidence(result)).toBe('insufficient');
    });

    it('anomaly + n >= 12 → high', () => {
        const result = makeResult({ datasetLength: 12, anomalyDetected: true });
        expect(classifyConfidence(result)).toBe('high');
    });

    it('delta >= 10% + n >= 8 → moderate', () => {
        const result = makeResult({ datasetLength: 8, deltaPercent: 12, anomalyDetected: false });
        expect(classifyConfidence(result)).toBe('moderate');
    });

    it('anomaly + n >= 8 (but < 12) → moderate', () => {
        const result = makeResult({ datasetLength: 9, anomalyDetected: true });
        expect(classifyConfidence(result)).toBe('moderate');
    });

    it('n >= 5 but small delta and no anomaly → low', () => {
        const result = makeResult({ datasetLength: 6, deltaPercent: 2, anomalyDetected: false });
        expect(classifyConfidence(result)).toBe('low');
    });
});

// ─── extractPeriodBounds Tests ────────────────────────────────────────────────

describe('event-engine.test — extractPeriodBounds()', () => {
    it('returns unknown for empty dataset', () => {
        const result = makeResult({ datasetLength: 0 });
        const bounds = extractPeriodBounds(result);
        expect(bounds.start).toBe('unknown');
        expect(bounds.end).toBe('unknown');
    });

    it('returns first and last sorted label for normal dataset', () => {
        const result = makeResult({ datasetLength: 3 });
        const bounds = extractPeriodBounds(result);
        expect(bounds.start).toBe('2024-01-01');
        expect(bounds.end).toBe('2024-03-01');
    });

    it('labels sort lexicographically (ISO dates)', () => {
        const result = makeResult({ datasetLength: 12 });
        const bounds = extractPeriodBounds(result);
        expect(bounds.start < bounds.end).toBe(true);
    });
});
