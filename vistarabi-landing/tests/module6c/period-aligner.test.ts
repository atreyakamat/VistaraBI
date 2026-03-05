// period-aligner.test.ts — Module 6C period alignment and null ratio tests
import { describe, it, expect } from 'vitest';
import { alignCorrelationSeries } from '../../src/lib/module-6/correlations/period-aligner';
import type { EnrichedKPIResult } from '../../src/lib/dashboard-state/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeKPIWithDataset(
    kpiId: string,
    kpiName: string,
    points: { label: string; value: number }[]
): EnrichedKPIResult {
    return {
        kpiId, kpiName, unit: 'currency', category: 'revenue',
        primaryValue: points[points.length - 1]?.value ?? 0,
        dataset: points, datasetSize: points.length,
        lineage: { tables: ['orders'], joins: [], formula: 'SUM(x)', aggregations: ['SUM'] },
    } as unknown as EnrichedKPIResult;
}

// 12 monthly periods
const FULL_SERIES_A = Array.from({ length: 12 }, (_, i) => ({
    label: `2024-${String(i + 1).padStart(2, '0')}-01`,
    value: 1000 + i * 50,
}));
const FULL_SERIES_B = Array.from({ length: 12 }, (_, i) => ({
    label: `2024-${String(i + 1).padStart(2, '0')}-01`,
    value: 500 + i * 30,
}));

const KPI_A = makeKPIWithDataset('kpi-a', 'Revenue', FULL_SERIES_A);
const KPI_B = makeKPIWithDataset('kpi-b', 'Orders', FULL_SERIES_B);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('period-aligner — alignCorrelationSeries()', () => {
    it('perfectly overlapping series → valid, effectiveN = 12', () => {
        const result = alignCorrelationSeries(KPI_A, KPI_B);
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.effectiveN).toBe(12);
            expect(result.nullRatioA).toBe(0);
            expect(result.nullRatioB).toBe(0);
            expect(result.periods.length).toBe(12);
        }
    });

    it('time window start/end extracted correctly', () => {
        const result = alignCorrelationSeries(KPI_A, KPI_B);
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.timeWindowStart).toBe('2024-01-01');
            expect(result.timeWindowEnd).toBe('2024-12-01');
        }
    });

    it('series with 2 missing periods → null ratio computed correctly', () => {
        // Series B missing 2 months out of 12
        const partialB = FULL_SERIES_B.slice(2); // starts from 2024-03-01
        const kpiPartialB = makeKPIWithDataset('kpi-b-partial', 'Orders Partial', partialB);
        const result = alignCorrelationSeries(KPI_A, kpiPartialB);
        expect(result.valid).toBe(true);
        if (result.valid) {
            // 2 missing periods out of 12 total = 2/12 ≈ 0.1667 < 0.20 → still valid
            expect(result.nullRatioB).toBeCloseTo(2 / 12, 3);
            expect(result.nullRatioA).toBe(0);
        }
    });

    it('null ratio exceeding 20% → NULL_RATIO_EXCEEDED rejection', () => {
        // Make series B with only 8 of 12 periods → 4 missing = 33% null
        const sparseB = FULL_SERIES_B.slice(4);
        const kpiSparseB = makeKPIWithDataset('kpi-b-sparse', 'Sparse Orders', sparseB);
        const result = alignCorrelationSeries(KPI_A, kpiSparseB);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.rejectionCode).toBe('NULL_RATIO_EXCEEDED');
        }
    });

    it('effectiveN < 5 → EFFECTIVE_N_TOO_SMALL rejection', () => {
        // Only 2 overlapping periods
        const tinyA = makeKPIWithDataset('kpi-tiny-a', 'Tiny A', [
            { label: '2024-01-01', value: 100 }, { label: '2024-02-01', value: 200 },
        ]);
        const tinyB = makeKPIWithDataset('kpi-tiny-b', 'Tiny B', [
            { label: '2024-01-01', value: 50 }, { label: '2024-02-01', value: 60 },
        ]);
        const result = alignCorrelationSeries(tinyA, tinyB);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.rejectionCode).toBe('EFFECTIVE_N_TOO_SMALL');
        }
    });

    it('empty dataset → EFFECTIVE_N_TOO_SMALL rejection', () => {
        const emptyA = makeKPIWithDataset('kpi-empty', 'Empty', []);
        const result = alignCorrelationSeries(emptyA, KPI_B);
        expect(result.valid).toBe(false);
    });

    it('aligned arrays are equal length', () => {
        const result = alignCorrelationSeries(KPI_A, KPI_B);
        if (result.valid) {
            expect(result.valuesA.length).toBe(result.valuesB.length);
            expect(result.valuesA.length).toBe(result.periods.length);
        }
    });
});
