// trend-confounder.test.ts — Module 6C trend detection and first-differencing tests
import { describe, it, expect } from 'vitest';
import { detectSharedTrend, applyFirstDifferencing } from '../../src/lib/module-6c/trend-confounder';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strongly increasing series (obvious trend)
const INCREASING_A = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320].map(v => v as number | null);
const INCREASING_B = [50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215].map(v => v as number | null);

// Decreasing series
const DECREASING_A = [320, 300, 280, 260, 240, 220, 200, 180, 160, 140, 120, 100].map(v => v as number | null);
const DECREASING_B = [215, 200, 185, 170, 155, 140, 125, 110, 95, 80, 65, 50].map(v => v as number | null);

// Flat series (no trend)
const FLAT_A = [100, 102, 99, 101, 100, 103, 98, 100, 101, 99, 100, 102].map(v => v as number | null);
const FLAT_B = [50, 51, 49, 50, 51, 50, 49, 50, 51, 49, 50, 51].map(v => v as number | null);

// Opposing trends
const OPPOSITE_A = INCREASING_A;
const OPPOSITE_B = DECREASING_B;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('trend-confounder — detectSharedTrend()', () => {
    it('both strongly increasing → sharedTrendDetected = true', () => {
        const result = detectSharedTrend(INCREASING_A, INCREASING_B);
        expect(result.sharedTrendDetected).toBe(true);
        expect(result.trendA.direction).toBe('up');
        expect(result.trendB.direction).toBe('up');
    });

    it('both strongly decreasing → sharedTrendDetected = true', () => {
        const result = detectSharedTrend(DECREASING_A, DECREASING_B);
        expect(result.sharedTrendDetected).toBe(true);
        expect(result.trendA.direction).toBe('down');
        expect(result.trendB.direction).toBe('down');
    });

    it('flat series → sharedTrendDetected = false', () => {
        const result = detectSharedTrend(FLAT_A, FLAT_B);
        expect(result.sharedTrendDetected).toBe(false);
    });

    it('opposing trends → sharedTrendDetected = false', () => {
        const result = detectSharedTrend(OPPOSITE_A, OPPOSITE_B);
        expect(result.sharedTrendDetected).toBe(false);
    });

    it('one trending, one flat → sharedTrendDetected = false', () => {
        const result = detectSharedTrend(INCREASING_A, FLAT_B);
        expect(result.sharedTrendDetected).toBe(false);
    });

    it('returns trend objects for both series', () => {
        const result = detectSharedTrend(INCREASING_A, INCREASING_B);
        expect(result.trendA).toBeDefined();
        expect(result.trendB).toBeDefined();
        expect(typeof result.trendA.slope).toBe('number');
        expect(typeof result.trendA.tStat).toBe('number');
    });
});

describe('trend-confounder — applyFirstDifferencing()', () => {
    it('output arrays are shorter by 1 (leading null stripped)', () => {
        const result = applyFirstDifferencing(INCREASING_A, INCREASING_B);
        expect(result.valuesA.length).toBe(INCREASING_A.length - 1);
        expect(result.valuesB.length).toBe(INCREASING_B.length - 1);
    });

    it('output arrays are equal length', () => {
        const result = applyFirstDifferencing(INCREASING_A, INCREASING_B);
        expect(result.valuesA.length).toBe(result.valuesB.length);
    });

    it('first element should not be null (leading null successfully stripped)', () => {
        const result = applyFirstDifferencing(INCREASING_A, INCREASING_B);
        // After stripping leading null, first element should be the first diff
        expect(result.valuesA[0]).not.toBeNull();
        expect(result.valuesB[0]).not.toBeNull();
    });

    it('differenced values are correct (delta between consecutive elements)', () => {
        const simple: (number | null)[] = [10, 20, 30, 40, 50, 60];
        const same: (number | null)[] = [100, 110, 120, 130, 140, 150];
        const result = applyFirstDifferencing(simple, same);
        // All diffs should be 10
        expect(result.valuesA).toEqual([10, 10, 10, 10, 10]);
        expect(result.valuesB).toEqual([10, 10, 10, 10, 10]);
    });

    it('effectiveN computed correctly (non-null pairs)', () => {
        const result = applyFirstDifferencing(INCREASING_A, INCREASING_B);
        // 12 - 1 = 11 periods, all non-null → effectiveN = 11
        expect(result.effectiveN).toBe(11);
    });
});
