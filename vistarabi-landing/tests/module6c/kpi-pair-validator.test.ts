// kpi-pair-validator.test.ts — Module 6C eligibility gate tests
import { describe, it, expect } from 'vitest';
import { validateKPIPair } from '../../src/lib/module-6c/kpi-pair-validator';
import type { EnrichedKPIResult } from '../../src/lib/dashboard-state/types';

// ─── Fixture Factory ──────────────────────────────────────────────────────────

function makeKPI(overrides: {
    kpiId?: string;
    kpiName?: string;
    unit?: string;
    datasetLength?: number;
    aggregations?: string[];
    tables?: string[];
    joins?: any[];
}): EnrichedKPIResult {
    const {
        kpiId = 'kpi-a',
        kpiName = 'Test KPI',
        unit = 'currency',
        datasetLength = 12,
        aggregations = ['SUM'],
        tables = ['orders'],
        joins = [],
    } = overrides;

    return {
        kpiId,
        kpiName,
        unit,
        category: 'revenue',
        primaryValue: 1000,
        previousValue: 900,
        delta: 100,
        deltaPercent: 11,
        deltaDirection: 'up',
        dataset: Array.from({ length: datasetLength }, (_, i) => ({
            label: `2024-${String(i + 1).padStart(2, '0')}-01`,
            value: 1000 + i * 10,
        })),
        datasetSize: datasetLength,
        profiling: { recordCount: datasetLength, uniqueCategoryCount: 1, numberOfSeries: 1, hasTimeDimension: true, numericDimensionCount: 1, hierarchicalDepth: 0, volatilityIndex: 0.1, distributionSkew: 0, cardinalityLevel: 'low', isSequentialChange: true },
        recommendedChartType: 'line',
        recommendedChartLibrary: 'chart-js',
        disableAnimation: false,
        aiExplanation: null,
        lineage: { tables, joins, formula: 'SUM(revenue)', aggregations },
        performance: { totalTimeMs: 50, dataLoadTimeMs: 10, computeTimeMs: 20, profilingTimeMs: 5, cacheHit: false, cacheKey: null },
        summary: null,
        anomaly: { detected: false, severity: 'low', worstPoint: { label: '', value: 0, zScore: 0, severity: 'low' }, affectedPoints: [], reasoning: '' },
        guardrail: null,
    } as unknown as EnrichedKPIResult;
}

const KPI_A = makeKPI({ kpiId: 'kpi-revenue', kpiName: 'Total Revenue', tables: ['orders'] });
const KPI_B = makeKPI({ kpiId: 'kpi-orders', kpiName: 'Order Count', tables: ['orders'], aggregations: ['COUNT'] });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('kpi-pair-validator — validateKPIPair()', () => {
    it('valid pair → success', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-orders', 'monthly', [KPI_A, KPI_B]);
        expect(result.valid).toBe(true);
        expect(result.kpiA?.kpiId).toBe('kpi-revenue');
        expect(result.kpiB?.kpiId).toBe('kpi-orders');
    });

    it('same KPI → SAME_KPI rejection', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-revenue', 'monthly', [KPI_A]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('SAME_KPI');
    });

    it('KPI A not in snapshot → KPI_NOT_FOUND', () => {
        const result = validateKPIPair('kpi-nonexistent', 'kpi-orders', 'monthly', [KPI_B]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('KPI_NOT_FOUND');
    });

    it('KPI B not in snapshot → KPI_NOT_FOUND', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-nonexistent', 'monthly', [KPI_A]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('KPI_NOT_FOUND');
    });

    it('daily grain → GRAIN_INELIGIBLE', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-orders', 'daily', [KPI_A, KPI_B]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('GRAIN_INELIGIBLE');
    });

    it('quarterly grain → valid', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-orders', 'quarterly', [KPI_A, KPI_B]);
        expect(result.valid).toBe(true);
    });

    it('AVG aggregation → NOT_COMPOSABLE', () => {
        const avgKPI = makeKPI({ kpiId: 'kpi-avg', kpiName: 'Avg Order Value', aggregations: ['AVG'], tables: ['orders'] });
        const result = validateKPIPair('kpi-revenue', 'kpi-avg', 'monthly', [KPI_A, avgKPI]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('NOT_COMPOSABLE');
    });

    it('insufficient data on A → INSUFFICIENT_DATA_A', () => {
        const smallA = makeKPI({ kpiId: 'kpi-small', kpiName: 'Small KPI', datasetLength: 3, tables: ['orders'] });
        const result = validateKPIPair('kpi-small', 'kpi-orders', 'monthly', [smallA, KPI_B]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('INSUFFICIENT_DATA_A');
    });

    it('insufficient data on B → INSUFFICIENT_DATA_B', () => {
        const smallB = makeKPI({ kpiId: 'kpi-small', kpiName: 'Small KPI B', datasetLength: 2, tables: ['orders'] });
        const result = validateKPIPair('kpi-revenue', 'kpi-small', 'monthly', [KPI_A, smallB]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('INSUFFICIENT_DATA_B');
    });

    it('unrelated source tables → NO_JOIN_PATH', () => {
        const otherKPI = makeKPI({ kpiId: 'kpi-hr', kpiName: 'Headcount', tables: ['employees'], aggregations: ['COUNT'] });
        const result = validateKPIPair('kpi-revenue', 'kpi-hr', 'monthly', [KPI_A, otherKPI]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('NO_JOIN_PATH');
    });

    it('MANY_TO_MANY join → MANY_TO_MANY_JOIN', () => {
        const manyKPI = makeKPI({
            kpiId: 'kpi-many',
            kpiName: 'Many KPI',
            tables: ['orders'],
            joins: [{ type: 'MANY_TO_MANY' }],
        });
        const result = validateKPIPair('kpi-revenue', 'kpi-many', 'monthly', [KPI_A, manyKPI]);
        expect(result.valid).toBe(false);
        expect(result.rejectionCode).toBe('MANY_TO_MANY_JOIN');
    });

    it('unitA and unitB are populated in success result', () => {
        const result = validateKPIPair('kpi-revenue', 'kpi-orders', 'monthly', [KPI_A, KPI_B]);
        expect(result.unitA).toBe('currency');
        expect(result.unitB).toBe('currency');
    });
});
