// Module 6B — Event Engine
// Classifies which event type applies to an EnrichedKPIResult.
// Pure deterministic logic. No LLM, no DB, no new statistics.
// Input:  EnrichedKPIResult (from Module 5.5 snapshot)
// Output: EventType + ConfidenceLevel determination

import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import type { EventType, ConfidenceLevel } from './types';

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const THRESHOLDS = {
    SPIKE_MIN_PERCENT: 5,           // deltaPercent > 5, dir UP → SPIKE
    DROP_MIN_PERCENT: -5,           // deltaPercent < -5, dir DOWN → DROP
    TREND_CHANGE_PERCENT: 10,       // |deltaPercent| >= 10% → TREND_CHANGE
    NO_SIGNAL_MAX_PERCENT: 5,       // |deltaPercent| < 5 = no significant movement
    VOLATILITY_HIGH: 0.3,           // volatilityIndex > 0.3 → VOLATILITY_SHIFT
    MIN_DATA_POINTS: 5,             // dataset.length < 5 → INSUFFICIENT_DATA
    CONFIDENCE_HIGH_N: 12,          // n >= 12 + anomaly → HIGH
    CONFIDENCE_MODERATE_N: 8,       // n >= 8 + significant trend → MODERATE
} as const;

// ─── Event Classification ─────────────────────────────────────────────────────

/**
 * Determine the primary EventType from a verified EnrichedKPIResult.
 *
 * Priority order (from most to least definitive):
 *   1. INSUFFICIENT_DATA     — not enough data to say anything
 *   2. ANOMALY               — Z-score anomaly detected by Module 5.5
 *   3. TREND_CHANGE          — |delta| >= 10%
 *   4. DROP                  — delta < -5%, direction DOWN
 *   5. SPIKE                 — delta > 5%, direction UP
 *   6. VOLATILITY_SHIFT      — volatilityIndex > threshold
 *   7. NO_SIGNIFICANT_EVENT  — everything within normal bounds
 */
export function classifyEvent(result: EnrichedKPIResult): EventType {
    const { dataset, deltaPercent, deltaDirection, anomaly, profiling } = result;
    const n = dataset?.length ?? 0;
    const delta = deltaPercent ?? 0;
    const absDelta = Math.abs(delta);
    const dir = deltaDirection ?? 'flat';

    // 1. Insufficient data
    if (n < THRESHOLDS.MIN_DATA_POINTS) {
        return 'INSUFFICIENT_DATA';
    }

    // 2. Confirmed Z-score anomaly
    if (anomaly?.detected === true) {
        return 'ANOMALY';
    }

    // 3. Significant trend change (>= 10%)
    if (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT) {
        return 'TREND_CHANGE';
    }

    // 4. Drop (5% to 10%, direction DOWN)
    if (dir === 'down' && delta < THRESHOLDS.DROP_MIN_PERCENT) {
        return 'DROP';
    }

    // 5. Spike (5% to 10%, direction UP)
    if (dir === 'up' && delta > THRESHOLDS.SPIKE_MIN_PERCENT) {
        return 'SPIKE';
    }

    // 6. High volatility without directional trend
    if ((profiling?.volatilityIndex ?? 0) > THRESHOLDS.VOLATILITY_HIGH) {
        return 'VOLATILITY_SHIFT';
    }

    // 7. No signal: delta < 5%, no anomaly, normal volatility
    return 'NO_SIGNIFICANT_EVENT';
}

// ─── Confidence Classification ────────────────────────────────────────────────

/**
 * Classify confidence level. Never contacts DB or re-runs statistics.
 */
export function classifyConfidence(result: EnrichedKPIResult): ConfidenceLevel {
    const n = result.dataset?.length ?? 0;
    const absDelta = Math.abs(result.deltaPercent ?? 0);
    const hasAnomaly = result.anomaly?.detected === true;

    if (n < THRESHOLDS.MIN_DATA_POINTS) return 'insufficient';

    // HIGH: anomaly confirmed + large dataset
    if (hasAnomaly && n >= THRESHOLDS.CONFIDENCE_HIGH_N) return 'high';

    // MODERATE: significant trend + enough data, or anomaly + moderate data
    if (
        (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT && n >= THRESHOLDS.CONFIDENCE_MODERATE_N) ||
        (hasAnomaly && n >= THRESHOLDS.CONFIDENCE_MODERATE_N)
    ) return 'moderate';

    // LOW: data sufficient but signal weak or noisy
    return 'low';
}

// ─── Period Extraction ────────────────────────────────────────────────────────

export interface PeriodBounds {
    start: string;
    end: string;
}

/**
 * Extract period start/end from dataset labels.
 * KPIDataPoint.label is the DATE string from DATE_TRUNC::DATE.
 */
export function extractPeriodBounds(result: EnrichedKPIResult): PeriodBounds {
    const pts = result.dataset ?? [];
    if (pts.length === 0) return { start: 'unknown', end: 'unknown' };

    // .label is the canonical period string (e.g. '2024-01-01')
    const labels = pts
        .map(p => p.label ?? '')
        .filter(Boolean)
        .sort();  // ISO date strings sort correctly lexicographically

    return {
        start: labels[0] ?? 'unknown',
        end: labels[labels.length - 1] ?? 'unknown',
    };
}
