// Module 6C — Trend Confounder Detector
// Detects when two series both exhibit a statistically significant trend
// in the same direction, which would produce spurious Pearson correlation.
// If detected, applies first-differencing to both series before correlation.
//
// Method: OLS linear regression slope + t-test for slope significance.
// Pure computation — no DB, no LLM, no external calls.

import { firstDifference, computeMean } from '@/lib/execution/statistics-core';
import { CORRELATION_THRESHOLDS } from './types';

// ─── OLS Slope Computation ────────────────────────────────────────────────────

interface SlopeResult {
    slope: number;
    tStat: number;
    significant: boolean;
    direction: 'up' | 'down' | 'flat';
}

/**
 * Compute OLS linear regression slope for a numeric series.
 * Uses only non-null values. Returns the t-statistic for the slope.
 *
 * t = slope / SE_slope
 * SE_slope = sqrt(MSE / SS_xx)
 * MSE = sum of squared residuals / (n - 2)
 */
function computeOLSSlope(values: (number | null)[]): SlopeResult {
    const nonNull = values
        .map((v, i) => (v !== null ? { x: i, y: v } : null))
        .filter(Boolean) as { x: number; y: number }[];

    const n = nonNull.length;

    if (n < 3) {
        return { slope: 0, tStat: 0, significant: false, direction: 'flat' };
    }

    const meanX = nonNull.reduce((s, p) => s + p.x, 0) / n;
    const meanY = nonNull.reduce((s, p) => s + p.y, 0) / n;

    let ssXX = 0;
    let ssXY = 0;

    for (const { x, y } of nonNull) {
        ssXX += (x - meanX) ** 2;
        ssXY += (x - meanX) * (y - meanY);
    }

    if (ssXX === 0) {
        return { slope: 0, tStat: 0, significant: false, direction: 'flat' };
    }

    const slope = ssXY / ssXX;

    // Compute residuals → MSE → SE_slope
    let sse = 0;
    for (const { x, y } of nonNull) {
        const predicted = meanY + slope * (x - meanX);
        sse += (y - predicted) ** 2;
    }

    const df = n - 2;
    if (df < 1) {
        return { slope, tStat: 0, significant: false, direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat' };
    }

    const mse = sse / df;
    const seSlopeSquared = mse / ssXX;
    if (seSlopeSquared <= 0) {
        return { slope, tStat: 0, significant: false, direction: slope > 0 ? 'up' : 'down' };
    }

    const tStat = slope / Math.sqrt(seSlopeSquared);

    // Critical t-value at TREND_SLOPE_ALPHA (two-tailed, approx for df >= 3)
    // Conservative: use df=10 critical value for small samples (t ≈ 1.812 at df=10, alpha=0.10)
    const tCritical = df >= 20 ? 1.645 : df >= 10 ? 1.812 : 2.353; // alpha=0.10

    const significant = Math.abs(tStat) > tCritical;
    const direction = slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat';

    return { slope, tStat, significant, direction };
}

// ─── Shared Trend Detection ───────────────────────────────────────────────────

export interface TrendConfounderResult {
    sharedTrendDetected: boolean;
    trendA: SlopeResult;
    trendB: SlopeResult;
}

/**
 * Detect whether both series exhibit a statistically significant trend
 * in the same direction (both UP or both DOWN).
 *
 * This is the classic spurious correlation confounder: two unrelated metrics
 * both trending upward over time will show high r purely due to shared time trend.
 */
export function detectSharedTrend(
    valuesA: (number | null)[],
    valuesB: (number | null)[]
): TrendConfounderResult {
    const trendA = computeOLSSlope(valuesA);
    const trendB = computeOLSSlope(valuesB);

    const sharedTrendDetected =
        trendA.significant &&
        trendB.significant &&
        trendA.direction === trendB.direction &&
        trendA.direction !== 'flat';

    return { sharedTrendDetected, trendA, trendB };
}

// ─── First Differencing Application ──────────────────────────────────────────

export interface DifferencedSeries {
    valuesA: (number | null)[];
    valuesB: (number | null)[];
    /** Effective n after stripping leading null from both series */
    effectiveN: number;
}

/**
 * Apply first-differencing to both series and strip the leading null.
 * firstDifference() always returns null at index 0 — so we remove index 0
 * from both series to maintain alignment (arrays remain equal-length).
 *
 * The leading null is stripped to prevent it from inflating the null ratio.
 */
export function applyFirstDifferencing(
    valuesA: (number | null)[],
    valuesB: (number | null)[]
): DifferencedSeries {
    const diffA = firstDifference(valuesA);
    const diffB = firstDifference(valuesB);

    // Remove leading null (index 0) from both
    const trimmedA = diffA.slice(1);
    const trimmedB = diffB.slice(1);

    const effectiveN = trimmedA.filter((v, i) => v !== null && trimmedB[i] !== null).length;

    return {
        valuesA: trimmedA,
        valuesB: trimmedB,
        effectiveN,
    };
}
