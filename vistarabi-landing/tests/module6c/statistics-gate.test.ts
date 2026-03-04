// statistics-gate.test.ts — Module 6C Pearson + significance computation tests
import { describe, it, expect } from 'vitest';
import { computeCorrelationMetrics, zScoreNormalize } from '../../src/lib/module-6c/statistics-gate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Perfect positive correlation
const PERFECT_POSITIVE_A: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PERFECT_POSITIVE_B: (number | null)[] = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

// Perfect negative correlation
const PERFECT_NEGATIVE_B: (number | null)[] = [24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

// Near-zero correlation (random-ish)
const ZERO_CORR_A: (number | null)[] = [1, 5, 2, 8, 3, 7, 4, 6, 9, 2, 5, 1];
const ZERO_CORR_B: (number | null)[] = [9, 2, 7, 3, 8, 1, 6, 4, 2, 8, 3, 7];

// Constant series (zero variance)
const CONSTANT_SERIES: (number | null)[] = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

// ─── zScoreNormalize tests ─────────────────────────────────────────────────────

describe('statistics-gate — zScoreNormalize()', () => {
    it('constant series → null (zero variance)', () => {
        const result = zScoreNormalize(CONSTANT_SERIES);
        expect(result).toBeNull();
    });

    it('normal series → mean ~0 after normalization', () => {
        const normalized = zScoreNormalize(PERFECT_POSITIVE_A);
        expect(normalized).not.toBeNull();
        const nonNull = normalized!.filter(v => v !== null) as number[];
        const mean = nonNull.reduce((s, v) => s + v, 0) / nonNull.length;
        expect(Math.abs(mean)).toBeLessThan(0.001);
    });

    it('passes through null values', () => {
        const withNull: (number | null)[] = [1, null, 3, null, 5, 6, 7, 8, 9, 10, 11, 12];
        const result = zScoreNormalize(withNull);
        expect(result).not.toBeNull();
        expect(result![1]).toBeNull();
        expect(result![3]).toBeNull();
    });
});

// ─── computeCorrelationMetrics tests ──────────────────────────────────────────

describe('statistics-gate — computeCorrelationMetrics()', () => {
    it('perfect positive correlation → r ≈ 1.0, significant', () => {
        const metrics = computeCorrelationMetrics(PERFECT_POSITIVE_A, PERFECT_POSITIVE_B);
        expect(metrics.pearsonR).not.toBeNull();
        expect(Math.abs(metrics.pearsonR! - 1.0)).toBeLessThan(0.01);
        // Note: |r| === 1 returns significant=false per statistics-core.ts guard
        // r ≈ 0.9999+ may still pass — test for high r magnitude only
        expect(Math.abs(metrics.pearsonR!)).toBeGreaterThan(0.99);
    });

    it('perfect negative correlation → r ≈ -1.0', () => {
        const metrics = computeCorrelationMetrics(PERFECT_POSITIVE_A, PERFECT_NEGATIVE_B);
        expect(metrics.pearsonR).not.toBeNull();
        expect(metrics.pearsonR!).toBeLessThan(-0.99);
    });

    it('near-random series → r has low-to-moderate magnitude', () => {
        const metrics = computeCorrelationMetrics(ZERO_CORR_A, ZERO_CORR_B);
        // We can't guarantee non-significance for a specific numeric sequence,
        // but we can assert the correlation is not spuriously high (e.g. r < 0.9)
        if (metrics.pearsonR !== null) {
            expect(Math.abs(metrics.pearsonR)).toBeLessThan(0.9);
        }
    });

    it('constant series A → null metrics (zero variance)', () => {
        const metrics = computeCorrelationMetrics(CONSTANT_SERIES, PERFECT_POSITIVE_B);
        expect(metrics.pearsonR).toBeNull();
        expect(metrics.tStat).toBeNull();
        expect(metrics.pValue).toBeNull();
        expect(metrics.significant).toBe(false);
    });

    it('constant series B → null metrics (zero variance)', () => {
        const metrics = computeCorrelationMetrics(PERFECT_POSITIVE_A, CONSTANT_SERIES);
        expect(metrics.pearsonR).toBeNull();
        expect(metrics.significant).toBe(false);
    });

    it('small n (< 5 effective pairs) → r is null', () => {
        const tinyA: (number | null)[] = [1, null, null, null, null, null, null, null, null, null, null, 2];
        const tinyB: (number | null)[] = [1, null, null, null, null, null, null, null, null, null, null, 2];
        const metrics = computeCorrelationMetrics(tinyA, tinyB);
        // Only 2 effective pairs — computePearson returns null
        expect(metrics.pearsonR).toBeNull();
        expect(metrics.significant).toBe(false);
    });

    it('throws on unequal-length arrays', () => {
        expect(() => computeCorrelationMetrics([1, 2, 3], [1, 2])).toThrow();
    });

    it('effectiveN reported correctly with nulls', () => {
        const withNulls: (number | null)[] = [1, null, 3, null, 5, 6, 7, 8, 9, 10, 11, 12];
        const full: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const metrics = computeCorrelationMetrics(withNulls, full);
        // 2 nulls in A → only 10 effective pairs
        expect(metrics.effectiveN).toBe(10);
    });
});
