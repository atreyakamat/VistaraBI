// Module 6C — Period Aligner
// Wraps alignRawSeries() for use with EnrichedKPIResult.
// Computes per-series null ratios and enforces data quality gates.
// Never zero-fills missing periods.

import { alignRawSeries } from '@/lib/execution/time-alignment';
import type { AlignedPeriodResult } from '@/lib/execution/time-alignment';
import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import { CORRELATION_THRESHOLDS } from './types';
import type { KPIPairRejectionCode } from './types';

// ─── Output ───────────────────────────────────────────────────────────────────

export interface AlignedCorrelationSeries {
    periods: string[];
    valuesA: (number | null)[];
    valuesB: (number | null)[];
    effectiveN: number;
    nullRatioA: number;    // Fraction of total periods where A is null
    nullRatioB: number;    // Fraction of total periods where B is null
    timeWindowStart: string;
    timeWindowEnd: string;
}

export interface AlignmentRejection {
    valid: false;
    rejectionCode: KPIPairRejectionCode;
    reason: string;
}

export type AlignmentResult =
    | (AlignedCorrelationSeries & { valid: true })
    | AlignmentRejection;

// ─── Dataset Extraction ───────────────────────────────────────────────────────

/**
 * Extract { date, value } pairs from an EnrichedKPIResult dataset.
 * Uses `label` as the date field (ISO date string from DATE_TRUNC::DATE).
 */
function extractSeries(result: EnrichedKPIResult): { date: string; value: number }[] {
    return (result.dataset ?? [])
        .filter(p => p.label && typeof p.value === 'number' && !isNaN(p.value))
        .map(p => ({ date: p.label, value: p.value }));
}

// ─── Main Aligner ─────────────────────────────────────────────────────────────

/**
 * Align two EnrichedKPIResult datasets into a shared period space.
 *
 * Rules:
 *  - Uses alignRawSeries() which inserts null (never 0) for missing periods
 *  - Rejects if: effectiveN < 5 OR either series null ratio > 20%
 *  - Records per-series null ratios for inclusion in evidence packet
 */
export function alignCorrelationSeries(
    kpiA: EnrichedKPIResult,
    kpiB: EnrichedKPIResult
): AlignmentResult {
    const seriesA = extractSeries(kpiA);
    const seriesB = extractSeries(kpiB);

    const aligned: AlignedPeriodResult = alignRawSeries(seriesA, seriesB);

    const totalPeriods = aligned.periods.length;

    if (totalPeriods === 0 || aligned.effectiveN === 0) {
        return {
            valid: false,
            rejectionCode: 'EFFECTIVE_N_TOO_SMALL',
            reason: 'No overlapping periods found between the two KPI series.',
        };
    }

    // Compute per-series null ratios
    const nullRatioA = Number((aligned.missingPeriodsA / totalPeriods).toFixed(4));
    const nullRatioB = Number((aligned.missingPeriodsB / totalPeriods).toFixed(4));

    // Reject if either series has too many nulls
    if (nullRatioA > CORRELATION_THRESHOLDS.MAX_NULL_RATIO) {
        return {
            valid: false,
            rejectionCode: 'NULL_RATIO_EXCEEDED',
            reason: `KPI "${kpiA.kpiName}" has a null ratio of ${(nullRatioA * 100).toFixed(1)}% (max allowed: ${CORRELATION_THRESHOLDS.MAX_NULL_RATIO * 100}%).`,
        };
    }
    if (nullRatioB > CORRELATION_THRESHOLDS.MAX_NULL_RATIO) {
        return {
            valid: false,
            rejectionCode: 'NULL_RATIO_EXCEEDED',
            reason: `KPI "${kpiB.kpiName}" has a null ratio of ${(nullRatioB * 100).toFixed(1)}% (max allowed: ${CORRELATION_THRESHOLDS.MAX_NULL_RATIO * 100}%).`,
        };
    }

    // Reject if effective sample size is too small
    if (aligned.effectiveN < CORRELATION_THRESHOLDS.MIN_OBSERVATIONS) {
        return {
            valid: false,
            rejectionCode: 'EFFECTIVE_N_TOO_SMALL',
            reason: `Only ${aligned.effectiveN} periods have data for both KPIs. Minimum required: ${CORRELATION_THRESHOLDS.MIN_OBSERVATIONS}.`,
        };
    }

    const timeWindowStart = aligned.periods[0] ?? 'unknown';
    const timeWindowEnd = aligned.periods[aligned.periods.length - 1] ?? 'unknown';

    return {
        valid: true,
        periods: aligned.periods,
        valuesA: aligned.valuesA,
        valuesB: aligned.valuesB,
        effectiveN: aligned.effectiveN,
        nullRatioA,
        nullRatioB,
        timeWindowStart,
        timeWindowEnd,
    };
}
