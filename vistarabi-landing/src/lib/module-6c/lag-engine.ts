// Module 6C — Lag Engine
// Computes correlation at bounded lag offsets [-2, -1, 0, +1, +2].
// Only allowed for monthly or quarterly grain.
// Applies Bonferroni correction when multiple lags are tested.
// Never reports best r without applying the correction.

import { bonferroniAlpha } from '@/lib/execution/statistics-core';
import { computeCorrelationMetrics } from './statistics-gate';
import { ALLOWED_LAGS, CORRELATION_THRESHOLDS } from './types';
import type { LagResult, AllowedLag } from './types';

// ─── Array Shift ──────────────────────────────────────────────────────────────

/**
 * Shift seriesB by `lag` positions relative to seriesA.
 * lag > 0: B is shifted forward (B leads A by lag periods)
 * lag < 0: B is shifted backward (A leads B by |lag| periods)
 * Positions shifted off the end are filled with null.
 *
 * Both output arrays are trimmed to the overlapping window.
 */
function shiftSeries(
    valuesA: (number | null)[],
    valuesB: (number | null)[],
    lag: number
): { shiftedA: (number | null)[]; shiftedB: (number | null)[] } {
    const n = valuesA.length;
    if (lag === 0) return { shiftedA: valuesA, shiftedB: valuesB };

    const absLag = Math.abs(lag);

    if (absLag >= n) {
        // No overlap after shift — return empty arrays
        return { shiftedA: [], shiftedB: [] };
    }

    if (lag > 0) {
        // B leads A: A[0..n-lag-1] aligns with B[lag..n-1]
        return {
            shiftedA: valuesA.slice(0, n - absLag),
            shiftedB: valuesB.slice(absLag),
        };
    } else {
        // A leads B: A[|lag|..n-1] aligns with B[0..n-|lag|-1]
        return {
            shiftedA: valuesA.slice(absLag),
            shiftedB: valuesB.slice(0, n - absLag),
        };
    }
}

// ─── Single Lag Computation ───────────────────────────────────────────────────

function computeAtLag(
    valuesA: (number | null)[],
    valuesB: (number | null)[],
    lag: number,
    correctedAlpha: number
): LagResult {
    const { shiftedA, shiftedB } = shiftSeries(valuesA, valuesB, lag);

    if (shiftedA.length === 0) {
        return { lag, pearsonR: null, tStat: null, pValue: null, effectiveN: 0, significant: false };
    }

    const metrics = computeCorrelationMetrics(shiftedA, shiftedB);

    // Significance is evaluated against the Bonferroni-corrected alpha
    // (not the raw isSignificant() which uses fixed 0.05)
    const significant =
        metrics.pearsonR !== null &&
        metrics.pValue !== null &&
        metrics.pValue < correctedAlpha;

    return {
        lag,
        pearsonR: metrics.pearsonR,
        tStat: metrics.tStat,
        pValue: metrics.pValue,
        effectiveN: metrics.effectiveN,
        significant,
    };
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export interface LagEngineResult {
    results: LagResult[];
    dominantLag: number;
    dominantR: number | null;
    bonferroniAlpha: number;
    lagsTestedCount: number;
}

/**
 * Compute Pearson correlation at multiple lag offsets with Bonferroni correction.
 *
 * Rules:
 *  - Lags are restricted to ALLOWED_LAGS = [-2, -1, 0, +1, +2]
 *  - Any lags not in ALLOWED_LAGS are silently ignored
 *  - Bonferroni: correctedAlpha = 0.05 / numLags
 *  - Dominant lag = highest |r| that is significant under corrected alpha
 *  - If no lag is significant: dominantLag = 0, dominantR = null
 *
 * @param requestedLags - Subset of ALLOWED_LAGS to test. Pass [0] for no-lag.
 */
export function computeWithLags(
    valuesA: (number | null)[],
    valuesB: (number | null)[],
    requestedLags: number[] = [0]
): LagEngineResult {
    // Validate and filter lags to only allowed values
    const allowedSet = new Set(ALLOWED_LAGS as readonly number[]);
    const lags = [...new Set(requestedLags)].filter(l => allowedSet.has(l)).sort((a, b) => a - b);

    if (lags.length === 0) {
        // Fallback: test lag 0 only
        lags.push(0);
    }

    const numLags = lags.length;
    const correctedAlpha = bonferroniAlpha(CORRELATION_THRESHOLDS.SIGNIFICANCE_ALPHA, numLags);

    // Compute all lags
    const results: LagResult[] = lags.map(lag =>
        computeAtLag(valuesA, valuesB, lag, correctedAlpha)
    );

    // Select dominant lag: highest |r| among significant results
    const significantResults = results.filter(r => r.significant && r.pearsonR !== null);
    const dominant = significantResults.sort(
        (a, b) => Math.abs(b.pearsonR!) - Math.abs(a.pearsonR!)
    )[0];

    return {
        results,
        dominantLag: dominant?.lag ?? 0,
        dominantR: dominant?.pearsonR ?? null,
        bonferroniAlpha: correctedAlpha,
        lagsTestedCount: numLags,
    };
}
