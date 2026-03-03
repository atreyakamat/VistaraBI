// Module 5.5 — KPI Summary Engine Tests
// Validates that all trend classifications, threshold bands, and headline/detail
// strings produce the correct deterministic output.

import { describe, it, expect } from 'vitest';
import { generateDeterministicSummary } from '../../src/lib/dashboard-state/kpi-summary-engine';
import type { KPIExecutionResult } from '../../src/lib/execution/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<KPIExecutionResult>): KPIExecutionResult {
    return {
        kpiId: 'ec-001',
        kpiName: 'Total Revenue',
        category: 'revenue',
        primaryValue: 100_000,
        previousValue: null,
        delta: null,
        deltaPercent: null,
        deltaDirection: null,
        dataset: [],
        datasetSize: 0,
        profiling: {
            recordCount: 10,
            uniqueCategoryCount: 5,
            numberOfSeries: 1,
            hasTimeDimension: false,
            numericDimensionCount: 1,
            hierarchicalDepth: 0,
            volatilityIndex: 0.05,   // Low volatility by default
            distributionSkew: 0,
            cardinalityLevel: 'low',
            isSequentialChange: false,
        },
        recommendedChartType: 'metric_card',
        recommendedChartLibrary: 'chartjs',
        disableAnimation: false,
        aiExplanation: null,
        lineage: { tables: ['orders'], joins: [], formula: 'SUM(revenue)', aggregations: ['SUM(revenue)'] },
        performance: {
            totalTimeMs: 50,
            dataLoadTimeMs: 0,
            computeTimeMs: 50,
            profilingTimeMs: 5,
            cacheHit: false,
            cacheKey: null,
        },
        ...overrides,
    };
}

// ─── No Comparison ────────────────────────────────────────────────────────────

describe('KPI Summary Engine — No Comparison', () => {

    it('Returns no_comparison when previousValue is null', () => {
        const result = makeResult({ previousValue: null, deltaPercent: null, deltaDirection: null });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('no_comparison');
        expect(summary.thresholdBand).toBe('none');
        expect(summary.headline).toContain('Total Revenue');
    });

    it('Headline includes current value', () => {
        const result = makeResult({ primaryValue: 1_250_000, previousValue: null });
        const summary = generateDeterministicSummary(result);
        expect(summary.headline).toContain('1.25M');
    });

    it('generatedAt is an ISO string', () => {
        const summary = generateDeterministicSummary(makeResult({}));
        expect(() => new Date(summary.generatedAt)).not.toThrow();
        expect(summary.generatedAt).toMatch(/^\d{4}-/);
    });

});

// ─── Stable (small delta) ─────────────────────────────────────────────────────

describe('KPI Summary Engine — Stable (<5% change)', () => {

    it('3% increase → stable', () => {
        const result = makeResult({
            primaryValue: 103_000, previousValue: 100_000,
            delta: 3_000, deltaPercent: 3.0, deltaDirection: 'up',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('stable');
        expect(summary.thresholdBand).toBe('low');
        expect(summary.headline).toContain('stable');
    });

    it('2% decrease → stable', () => {
        const result = makeResult({
            primaryValue: 98_000, previousValue: 100_000,
            delta: -2_000, deltaPercent: -2.0, deltaDirection: 'down',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('stable');
    });

    it('0% flat → stable', () => {
        const result = makeResult({
            primaryValue: 100_000, previousValue: 100_000,
            delta: 0, deltaPercent: 0, deltaDirection: 'flat',
        });
        expect(generateDeterministicSummary(result).trendLabel).toBe('stable');
    });

});

// ─── Notable Change (5–20%) ───────────────────────────────────────────────────

describe('KPI Summary Engine — Notable Change (5–20%)', () => {

    it('12% increase → notable_increase', () => {
        const result = makeResult({
            primaryValue: 112_000, previousValue: 100_000,
            delta: 12_000, deltaPercent: 12.0, deltaDirection: 'up',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('notable_increase');
        expect(summary.thresholdBand).toBe('medium');
        expect(summary.headline).toContain('grew');
        expect(summary.headline).toContain('12.0%');
    });

    it('15% decrease → notable_decrease', () => {
        const result = makeResult({
            primaryValue: 85_000, previousValue: 100_000,
            delta: -15_000, deltaPercent: -15.0, deltaDirection: 'down',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('notable_decrease');
        expect(summary.headline).toContain('declined');
    });

});

// ─── Significant Change (≥20%) ────────────────────────────────────────────────

describe('KPI Summary Engine — Significant Change (≥20%)', () => {

    it('24% increase → significant_increase', () => {
        const result = makeResult({
            primaryValue: 124_000, previousValue: 100_000,
            delta: 24_000, deltaPercent: 24.0, deltaDirection: 'up',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('significant_increase');
        expect(summary.thresholdBand).toBe('high');
        expect(summary.headline).toContain('surged');
    });

    it('45% decrease → significant_decrease', () => {
        const result = makeResult({
            primaryValue: 55_000, previousValue: 100_000,
            delta: -45_000, deltaPercent: -45.0, deltaDirection: 'down',
        });
        const summary = generateDeterministicSummary(result);
        expect(summary.trendLabel).toBe('significant_decrease');
        expect(summary.thresholdBand).toBe('high');
        expect(summary.headline).toContain('dropped sharply');
    });

    it('Exactly 20% → significant (boundary)', () => {
        const result = makeResult({
            primaryValue: 120_000, previousValue: 100_000,
            delta: 20_000, deltaPercent: 20.0, deltaDirection: 'up',
        });
        expect(generateDeterministicSummary(result).trendLabel).toBe('significant_increase');
    });

});

// ─── Volatility Annotation ────────────────────────────────────────────────────

describe('KPI Summary Engine — High Volatility Annotation', () => {

    it('High volatility (>0.3) annotates detail string', () => {
        const result = makeResult({
            primaryValue: 112_000, previousValue: 100_000,
            delta: 12_000, deltaPercent: 12.0, deltaDirection: 'up',
            profiling: {
                recordCount: 20, uniqueCategoryCount: 5,
                numberOfSeries: 1, hasTimeDimension: true,
                numericDimensionCount: 1, hierarchicalDepth: 0,
                volatilityIndex: 0.45,  // HIGH
                distributionSkew: 0, cardinalityLevel: 'medium',
                isSequentialChange: true,
            },
        });
        expect(generateDeterministicSummary(result).detail).toContain('high variability');
    });

    it('Low volatility (<0.3) has no annotation', () => {
        const result = makeResult({
            primaryValue: 112_000, previousValue: 100_000,
            delta: 12_000, deltaPercent: 12.0, deltaDirection: 'up',
        });
        expect(generateDeterministicSummary(result).detail).not.toContain('variability');
    });

});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('KPI Summary Engine — Determinism', () => {

    it('Same inputs always produce same output', () => {
        const result = makeResult({
            primaryValue: 112_000, previousValue: 100_000,
            delta: 12_000, deltaPercent: 12.0, deltaDirection: 'up',
        });
        const s1 = generateDeterministicSummary(result);
        const s2 = generateDeterministicSummary(result);
        expect(s1.headline).toBe(s2.headline);
        expect(s1.trendLabel).toBe(s2.trendLabel);
        expect(s1.thresholdBand).toBe(s2.thresholdBand);
    });

});
