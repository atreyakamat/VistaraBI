// Module 6C — Statistics Gate
// Computes Pearson r, t-statistic, p-value, and significance gate
// for an aligned, null-filtered time series pair.
// Uses z-score normalization before Pearson to remove scale differences.
// All computation delegates to statistics-core.ts — no duplicate logic.

import {
    computePearson,
    computeTStatistic,
    approximatePValue,
    isSignificant,
    computeMean,
    computeSampleStdDev,
} from '@/lib/execution/statistics-core';
import type { CorrelationMetrics } from './types';

// ─── Z-Score Normalization ────────────────────────────────────────────────────

/**
 * Z-score normalize a series using sample mean and sample stddev.
 * Null values are passed through as-is (Pearson handles them).
 * Returns null for the whole series if stddev is 0 (constant series).
 */
export function zScoreNormalize(values: (number | null)[]): (number | null)[] | null {
    const nonNull = values.filter(v => v !== null) as number[];
    if (nonNull.length < 2) return null;

    const mean = computeMean(nonNull);
    const std = computeSampleStdDev(nonNull);
    if (std === 0) return null; // Zero variance — cannot normalize

    return values.map(v => (v === null ? null : (v - mean) / std));
}

// ─── Main Gate ────────────────────────────────────────────────────────────────

/**
 * Compute correlation metrics for two aligned, null-aware series.
 *
 * Pipeline:
 *  1. Z-score normalize both series using sample mean/stddev
 *  2. Compute Pearson r (skipping null pairs)
 *  3. Compute t-statistic
 *  4. Approximate p-value
 *  5. Apply significance gate (alpha = 0.05)
 *
 * Returns null metrics if normalization fails (zero variance).
 */
export function computeCorrelationMetrics(
    valuesA: (number | null)[],
    valuesB: (number | null)[]
): CorrelationMetrics {
    if (valuesA.length !== valuesB.length) {
        throw new Error('[StatisticsGate] Arrays must be equal length');
    }

    // Count effective pairs before normalization
    const effectiveN = valuesA.filter((v, i) => v !== null && valuesB[i] !== null).length;

    // Normalize
    const normA = zScoreNormalize(valuesA);
    const normB = zScoreNormalize(valuesB);

    if (!normA || !normB) {
        // Zero variance in at least one series — correlation is undefined
        return { pearsonR: null, tStat: null, pValue: null, effectiveN, significant: false };
    }

    // Compute Pearson r on normalized arrays
    const pearsonR = computePearson(normA, normB);
    if (pearsonR === null) {
        return { pearsonR: null, tStat: null, pValue: null, effectiveN, significant: false };
    }

    // Compute t-statistic
    const tStat = computeTStatistic(pearsonR, effectiveN);

    // Approximate p-value
    const df = effectiveN - 2;
    const pValue = approximatePValue(tStat, df);

    // Significance gate
    const significant = isSignificant(pearsonR, effectiveN);

    return { pearsonR, tStat, pValue, effectiveN, significant };
}
