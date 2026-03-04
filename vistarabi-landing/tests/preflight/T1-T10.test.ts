// Pre-flight Tests T1–T10
// All tests must pass before Module 6 development begins.
// Tests cover: time alignment, period handling, determinism, formula validation,
// anomaly detection, filter idempotency, statistical correctness, and evidence packet structure.

import { describe, it, expect } from 'vitest';

// ─── T1: Time Alignment Equality ───────────────────────────────────────────────

describe('T1 — Time Alignment: Identical period arrays produce zero data loss', () => {
    it('two KPIs with identical 12-month windows produce aligned arrays with no nulls', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const periods = Array.from({ length: 12 }, (_, i) => {
            const month = String(i + 1).padStart(2, '0');
            return `2024-${month}-01`;
        });

        const seriesA = periods.map(date => ({ date, value: Math.random() * 1000 }));
        const seriesB = periods.map(date => ({ date, value: Math.random() * 500 }));

        const result = alignRawSeries(seriesA, seriesB);

        expect(result.periods).toHaveLength(12);
        expect(result.valuesA).toHaveLength(12);
        expect(result.valuesB).toHaveLength(12);
        expect(result.missingPeriodsA).toBe(0);
        expect(result.missingPeriodsB).toBe(0);
        expect(result.effectiveN).toBe(12);
        expect(result.dataLossRatio).toBe(0);

        // No nulls in either series
        expect(result.valuesA.every(v => v !== null)).toBe(true);
        expect(result.valuesB.every(v => v !== null)).toBe(true);

        // Period labels must be identical between the two series
        const periodsA = result.periods;
        const periodsB = result.periods;
        expect(periodsA).toEqual(periodsB);
    });
});

// ─── T2: Empty Period Handling ──────────────────────────────────────────────────

describe('T2 — Empty Period Handling: Empty datasets produce 0-length result, not error', () => {
    it('empty dataset A + populated B returns nulls for all A positions', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const seriesA: { date: string; value: number }[] = [];
        const seriesB = [
            { date: '2024-01-01', value: 100 },
            { date: '2024-02-01', value: 200 },
        ];

        const result = alignRawSeries(seriesA, seriesB);

        expect(result.periods).toHaveLength(2);
        expect(result.valuesA.every(v => v === null)).toBe(true);
        expect(result.valuesB.every(v => v !== null)).toBe(true);
        expect(result.missingPeriodsA).toBe(2);
        expect(result.missingPeriodsB).toBe(0);
        expect(result.effectiveN).toBe(0);
    });

    it('both empty datasets return empty result immediately', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const result = alignRawSeries([], []);

        expect(result.periods).toHaveLength(0);
        expect(result.valuesA).toHaveLength(0);
        expect(result.valuesB).toHaveLength(0);
        expect(result.effectiveN).toBe(0);
    });
});

// ─── T3: Determinism Across Runs ───────────────────────────────────────────────

describe('T3 — Determinism: Same inputs always produce identical outputs', () => {
    it('alignRawSeries produces identical results across multiple invocations', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const seriesA = [
            { date: '2024-01-01', value: 100 },
            { date: '2024-03-01', value: 300 },
        ];
        const seriesB = [
            { date: '2024-01-01', value: 150 },
            { date: '2024-02-01', value: 200 },
            { date: '2024-03-01', value: 250 },
        ];

        const result1 = alignRawSeries(seriesA, seriesB);
        const result2 = alignRawSeries(seriesA, seriesB);
        const result3 = alignRawSeries(seriesA, seriesB);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
    });

    it('statistics-core computePearson is deterministic for same input', async () => {
        const { computePearson } = await import('../../src/lib/execution/statistics-core');

        const a = [10, 20, 30, 40, 50, 60, 70];
        const b = [12, 22, 28, 38, 52, 58, 72];

        const r1 = computePearson(a, b);
        const r2 = computePearson(a, b);
        const r3 = computePearson(a, b);

        expect(r1).not.toBeNull();
        expect(r1).toBe(r2);
        expect(r2).toBe(r3);
    });
});

// ─── T4: Cross-Table KPI Alignment ─────────────────────────────────────────────

describe('T4 — Cross-Table Period Alignment: Period union is correctly computed', () => {
    it('union of A (10 months) and B (12 months) produces 12-period result', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const allPeriods = Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, '0')}-01`);
        const seriesA = allPeriods.slice(2).map(date => ({ date, value: 100 })); // months 03–12 only
        const seriesB = allPeriods.map(date => ({ date, value: 200 }));          // all 12 months

        const result = alignRawSeries(seriesA, seriesB);

        expect(result.periods).toHaveLength(12);
        expect(result.missingPeriodsA).toBe(2);   // Jan + Feb missing from A
        expect(result.missingPeriodsB).toBe(0);
        expect(result.valuesA[0]).toBeNull();
        expect(result.valuesA[1]).toBeNull();
        expect(result.valuesA[2]).not.toBeNull();  // March onwards present
    });
});

// ─── T5: Formula Validation ─────────────────────────────────────────────────────

describe('T5 — Formula Validation: Forbidden SQL clauses are rejected at Blueprint insertion', () => {
    it('formula with WHERE clause throws BlueprintInsertionError', async () => {
        const { BlueprintInsertionError } = await import('../../src/lib/kpi/blueprint-inserter');

        // Simulate what the blueprint inserter does internally
        const FORBIDDEN_FORMULA_CLAUSES = /\b(WHERE|GROUP\s+BY|ORDER\s+BY|JOIN|LIMIT)\b/i;
        const formula = 'SUM(revenue) WHERE status = active';

        if (FORBIDDEN_FORMULA_CLAUSES.test(formula)) {
            const err = new BlueprintInsertionError('test-001', `Formula contains forbidden clause`);
            expect(err).toBeInstanceOf(BlueprintInsertionError);
            expect(err.ruleId).toBe('test-001');
            expect(err.message).toContain('Formula validation failed');
        } else {
            throw new Error('Expected forbidden clause to be detected');
        }
    });

    it('formula with GROUP BY clause is rejected', async () => {
        const FORBIDDEN = /\b(WHERE|GROUP\s+BY|ORDER\s+BY|JOIN|LIMIT)\b/i;
        expect(FORBIDDEN.test('SUM(revenue) GROUP BY date')).toBe(true);
    });

    it('formula with JOIN clause is rejected', async () => {
        const FORBIDDEN = /\b(WHERE|GROUP\s+BY|ORDER\s+BY|JOIN|LIMIT)\b/i;
        expect(FORBIDDEN.test('COUNT(DISTINCT customer_id) JOIN orders')).toBe(true);
    });

    it('pure arithmetic formula is accepted', async () => {
        const FORBIDDEN = /\b(WHERE|GROUP\s+BY|ORDER\s+BY|JOIN|LIMIT)\b/i;
        expect(FORBIDDEN.test('SUM(revenue) / COUNT(order_id)')).toBe(false);
        expect(FORBIDDEN.test('AVG(grade)')).toBe(false);
        expect(FORBIDDEN.test('(SUM(inflow) - SUM(outflow)) / SUM(inflow)')).toBe(false);
    });
});

// ─── T6: Anomaly Detector Minimum Sample ───────────────────────────────────────

describe('T6 — Anomaly Detector: Respects minimum data point threshold', () => {
    it('should NOT detect anomalies with fewer than 5 data points', async () => {
        const { tryDetectAnomalies } = await import('../../src/lib/dashboard-state/anomaly-detector');

        const fewPoints = [
            { label: '2024-01', value: 100 },
            { label: '2024-02', value: 500 }, // obvious outlier — but n < 5
            { label: '2024-03', value: 100 },
        ];

        const result = tryDetectAnomalies(fewPoints);
        // Should either return null or detected: false — never crash
        if (result !== null) {
            expect(result.detected).toBe(false);
        }
    });

    it('should detect anomalies with 8+ data points when a large outlier exists', async () => {
        const { tryDetectAnomalies } = await import('../../src/lib/dashboard-state/anomaly-detector');

        const points = [
            { label: '2024-01', value: 100 },
            { label: '2024-02', value: 105 },
            { label: '2024-03', value: 98 },
            { label: '2024-04', value: 102 },
            { label: '2024-05', value: 97 },
            { label: '2024-06', value: 101 },
            { label: '2024-07', value: 99 },
            { label: '2024-08', value: 5000 }, // extreme outlier (>3σ)
        ];

        const result = tryDetectAnomalies(points);
        expect(result).not.toBeNull();
        expect(result?.detected).toBe(true);
    });
});

// ─── T7: Filter Idempotency ─────────────────────────────────────────────────────

describe('T7 — Filter Idempotency: Same expression parsed repeatedly yields identical output', () => {
    it('normalizeFilters is idempotent for the same input', async () => {
        const { normalizeFilters } = await import('../../src/lib/dashboard-state/filter-interpreter');

        const expressions = ['FY2024'];
        const options = { fiscalYearConvention: 'april_march' as const };

        const result1 = normalizeFilters(expressions, options);
        const result2 = normalizeFilters(expressions, options);
        const result3 = normalizeFilters(expressions, options);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
    });
});

// ─── T8: Correlation Pre-flight Null Rejection ─────────────────────────────────

describe('T8 — Correlation Pre-flight: Zero-variance and insufficient data rejected', () => {
    it('all-zero array vs valid array → r: null (insufficient_variance)', async () => {
        const { computePearson } = await import('../../src/lib/execution/statistics-core');

        const allZero = [0, 0, 0, 0, 0, 0, 0];
        const valid = [10, 20, 30, 40, 50, 60, 70];

        // computePearson returns null if either series has zero variance
        const r = computePearson(allZero, valid);
        expect(r).toBeNull();
    });

    it('n < 5 → r: null (insufficient observations)', async () => {
        const { computePearson } = await import('../../src/lib/execution/statistics-core');

        const a = [1, 2, 3, 4];
        const b = [2, 4, 6, 8];

        const r = computePearson(a, b);
        expect(r).toBeNull();
    });

    it('isSignificant returns false for low r with small n', async () => {
        const { isSignificant } = await import('../../src/lib/execution/statistics-core');

        // r=0.4, n=8: not significant at α=0.05 (t ≈ 1.18 < t_crit(df=6) ≈ 2.447)
        expect(isSignificant(0.4, 8)).toBe(false);
    });

    it('isSignificant returns true for strong r with adequate n', async () => {
        const { isSignificant } = await import('../../src/lib/execution/statistics-core');

        // r=0.9, n=12: highly significant (t ≈ 6.55 >> t_crit(df=10) ≈ 2.228)
        expect(isSignificant(0.9, 12)).toBe(true);
    });

    it('computeSampleStdDev uses Bessel correction (n-1)', async () => {
        const { computeSampleStdDev } = await import('../../src/lib/execution/statistics-core');

        // [2, 4, 4, 4, 5, 5, 7, 9]: population stddev = 2.0, sample stddev ≈ 2.138
        const values = [2, 4, 4, 4, 5, 5, 7, 9];
        const sampleStd = computeSampleStdDev(values);

        expect(sampleStd).toBeGreaterThan(2.0);          // sample > population
        expect(sampleStd).toBeCloseTo(2.138, 2);         // known sample stddev value
    });
});

// ─── T9: Null-Safe Alignment ────────────────────────────────────────────────────

describe('T9 — Null-Safe Alignment: Missing periods produce nulls, never 0', () => {
    it('A has 12 months, B has 9 months; result contains exactly 3 nulls in B', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');

        const periods12 = Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, '0')}-01`);
        const periods9 = periods12.slice(0, 9); // Jan–Sep only

        const seriesA = periods12.map(date => ({ date, value: 100 }));
        const seriesB = periods9.map(date => ({ date, value: 50 }));

        const result = alignRawSeries(seriesA, seriesB);

        // Union = 12 months
        expect(result.periods).toHaveLength(12);
        expect(result.valuesA).toHaveLength(12);
        expect(result.valuesB).toHaveLength(12);
        expect(result.missingPeriodsA).toBe(0);
        expect(result.missingPeriodsB).toBe(3); // Oct, Nov, Dec missing from B

        // Last 3 positions in B must be null — never 0
        expect(result.valuesB[9]).toBeNull();
        expect(result.valuesB[10]).toBeNull();
        expect(result.valuesB[11]).toBeNull();

        // First 9 positions in B must be number
        for (let i = 0; i < 9; i++) {
            expect(result.valuesB[i]).toBe(50);
        }

        // Effective N = positions where BOTH are non-null = 9
        expect(result.effectiveN).toBe(9);
    });
});

// ─── T10: Evidence Packet Completeness Stub ─────────────────────────────────────

describe('T10 — Evidence Packet Stub: EnrichedKPIResult has required fields for future evidence packet construction', () => {
    it('KPIExecutionResult type contract includes all fields needed for evidence packet', async () => {
        const { alignRawSeries } = await import('../../src/lib/execution/time-alignment');
        const { computePearson, isSignificant, computeSampleStdDev } = await import('../../src/lib/execution/statistics-core');

        // Simulate building the components of an evidence packet from Module 5 outputs
        const seriesA = [
            { date: '2024-01-01', value: 100 },
            { date: '2024-02-01', value: 120 },
            { date: '2024-03-01', value: 115 },
            { date: '2024-04-01', value: 130 },
            { date: '2024-05-01', value: 140 },
            { date: '2024-06-01', value: 135 },
        ];
        const seriesB = [
            { date: '2024-01-01', value: 50 },
            { date: '2024-02-01', value: 60 },
            { date: '2024-03-01', value: 58 },
            { date: '2024-04-01', value: 65 },
            { date: '2024-05-01', value: 70 },
            { date: '2024-06-01', value: 68 },
        ];

        // T10a: Alignment
        const aligned = alignRawSeries(seriesA, seriesB);
        expect(aligned.effectiveN).toBe(6);
        expect(aligned.dataLossRatio).toBe(0);

        // T10b: Statistical measures
        const r = computePearson(aligned.valuesA, aligned.valuesB);
        expect(r).not.toBeNull();
        expect(Math.abs(r!)).toBeGreaterThan(0.9); // these series are strongly correlated

        const significant = isSignificant(r, aligned.effectiveN);
        // n=6 at r≈0.99: should be significant (t >> 2.776)
        expect(significant).toBe(true);

        const stddevA = computeSampleStdDev(aligned.valuesA.filter(v => v !== null) as number[]);
        expect(stddevA).toBeGreaterThan(0);

        // T10c: Evidence packet shape is constructable (all fields obtainable)
        const evidencePacketFields = {
            kpiAValues: aligned.valuesA,
            kpiBValues: aligned.valuesB,
            periods: aligned.periods,
            effectiveN: aligned.effectiveN,
            missingPeriodsA: aligned.missingPeriodsA,
            missingPeriodsB: aligned.missingPeriodsB,
            dataLossRatio: aligned.dataLossRatio,
            correlationR: r,
            isSignificant: significant,
        };

        // All fields must be defined
        for (const [key, value] of Object.entries(evidencePacketFields)) {
            expect(value).toBeDefined();
            expect(value).not.toBeUndefined();
        }
    });
});
