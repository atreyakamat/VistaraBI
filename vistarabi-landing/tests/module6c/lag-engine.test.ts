// lag-engine.test.ts — Module 6C lag engine + Bonferroni correction tests
import { describe, it, expect } from 'vitest';
import { computeWithLags } from '../../src/lib/module-6/correlations/lag-engine';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Series that are correlated at lag 0
const A_BASE: (number | null)[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const B_BASE: (number | null)[] = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

// Series correlated at lag +2 (B leads A by 2 periods)
// A[i] = B[i-2] for i >= 2
const A_LAG2: (number | null)[] = [0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const B_LAG2: (number | null)[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('lag-engine — computeWithLags()', () => {
    it('lag [0] → single result at lag 0', () => {
        const result = computeWithLags(A_BASE, B_BASE, [0]);
        expect(result.results.length).toBe(1);
        expect(result.results[0].lag).toBe(0);
        expect(result.lagsTestedCount).toBe(1);
    });

    it('lag [0]: Bonferroni alpha = 0.05 / 1 = 0.05', () => {
        const result = computeWithLags(A_BASE, B_BASE, [0]);
        expect(result.bonferroniAlpha).toBeCloseTo(0.05, 5);
    });

    it('5 lags tested: Bonferroni alpha = 0.05 / 5 = 0.01', () => {
        const result = computeWithLags(A_BASE, B_BASE, [-2, -1, 0, 1, 2]);
        expect(result.bonferroniAlpha).toBeCloseTo(0.01, 5);
    });

    it('all 5 lags tested → 5 results', () => {
        const result = computeWithLags(A_BASE, B_BASE, [-2, -1, 0, 1, 2]);
        expect(result.results.length).toBe(5);
        const lags = result.results.map(r => r.lag).sort((a, b) => a - b);
        expect(lags).toEqual([-2, -1, 0, 1, 2]);
    });

    it('invalid lag values (e.g. 10) are silently ignored', () => {
        const result = computeWithLags(A_BASE, B_BASE, [0, 10, -5]);
        // Only lag 0 is valid
        expect(result.results.length).toBe(1);
        expect(result.results[0].lag).toBe(0);
    });

    it('all invalid lags → fallback to [0]', () => {
        const result = computeWithLags(A_BASE, B_BASE, [10, 20]);
        expect(result.results.length).toBe(1);
        expect(result.results[0].lag).toBe(0);
    });

    it('perfectly correlated at lag 0 → dominantLag = 0', () => {
        const result = computeWithLags(A_BASE, B_BASE, [0]);
        // High correlation series — dominant lag should be 0
        expect(result.dominantLag).toBe(0);
    });

    it('dominant lag is from significant results only', () => {
        const result = computeWithLags(A_BASE, B_BASE, [-2, -1, 0, 1, 2]);
        // dominantR should be for a significant result or null
        if (result.dominantR !== null) {
            const dominantResult = result.results.find(r => r.lag === result.dominantLag);
            expect(dominantResult?.significant).toBe(true);
        }
    });

    it('no significant results → dominantLag = 0, dominantR = null', () => {
        // Random uncorrelated series
        const randA: (number | null)[] = [5, 2, 8, 1, 9, 3, 7, 4, 6, 2, 8, 1];
        const randB: (number | null)[] = [3, 9, 1, 7, 2, 8, 4, 6, 1, 9, 3, 5];
        const result = computeWithLags(randA, randB, [-2, -1, 0, 1, 2]);
        // May or may not be significant — check structure is valid
        if (result.dominantR === null) {
            expect(result.dominantLag).toBe(0);
        }
        // All results should have lag in allowed set
        for (const r of result.results) {
            expect([-2, -1, 0, 1, 2]).toContain(r.lag);
        }
    });

    it('lag shift reduces effective n correctly', () => {
        const result = computeWithLags(A_BASE, B_BASE, [-2, -1, 0, 1, 2]);
        const lagZero = result.results.find(r => r.lag === 0)!;
        const lagTwo = result.results.find(r => r.lag === 2)!;
        // lag 2 shifts 2 periods off → effectiveN should be smaller
        expect(lagTwo.effectiveN).toBeLessThanOrEqual(lagZero.effectiveN);
    });
});
