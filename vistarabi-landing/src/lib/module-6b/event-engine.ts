// Module 6B — Event Engine
// Classifies which event type applies to an EnrichedKPIResult.
// Pure deterministic logic. No LLM, no DB, no new statistics.
// Input:  EnrichedKPIResult (from Module 5.5 snapshot)
// Output: EventType + ConfidenceLevel determination

import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import type { EventType, ConfidenceLevel } from './types';

// ─── Thresholds ───────────────────────────────────────────────────────────────
// Tuned to match the R6 pre-flight gates and kpi-summary-engine thresholds.

export const THRESHOLDS = {
    SPIKE_PERCENT: 5,           // deltaPercent > 5 and direction UP → SPIKE
    DROP_PERCENT: -5,           // deltaPercent < -5 and direction DOWN → DROP
    TREND_CHANGE_PERCENT: 10,   // |deltaPercent| > 10% → TREND_CHANGE
    VOLATILITY_HIGH: 0.3,       // volatilityIndex > 0.3 → VOLATILITY_SHIFT
    MIN_DATA_POINTS: 5,         // dataset.length < 5 → INSUFFICIENT_DATA
    CONFIDENCE_HIGH_N: 12,      // n >= 12 + anomaly → HIGH confidence
    CONFIDENCE_MODERATE_N: 8,   // n >= 8 + delta > 10% → MODERATE confidence
} as const;

// ─── Event Classification ─────────────────────────────────────────────────────

/**
 * Determine the primary EventType for a given EnrichedKPIResult.
 * Priority order: INSUFFICIENT_DATA → ANOMALY → TREND_CHANGE → DROP → SPIKE → VOLATILITY_SHIFT → TREND_CHANGE
 */
export function classifyEvent(result: EnrichedKPIResult): EventType {
    const { dataset, deltaPercent, deltaDirection, anomaly, profiling } = result;
    const n = dataset?.length ?? 0;

    // 1. Not enough data — stop here
    if (n < THRESHOLDS.MIN_DATA_POINTS) {
        return 'INSUFFICIENT_DATA';
    }

    // 2. Detected anomaly (Z-score based, from Module 5.5 anomaly detector)
    if (anomaly?.detected === true) {
        return 'ANOMALY';
    }

    const delta = deltaPercent ?? 0;
    const dir = deltaDirection ?? 'flat';
    const absDelta = Math.abs(delta);

    // 3. Drop (directional — requires consecutive context)
    if (dir === 'down' && delta < THRESHOLDS.DROP_PERCENT) {
        // Sharper drop (≥ 10%) is a TREND_CHANGE, gentler drop is DROP
        if (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT) return 'TREND_CHANGE';
        return 'DROP';
    }

    // 4. Spike (directional — up)
    if (dir === 'up' && delta > THRESHOLDS.SPIKE_PERCENT) {
        if (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT) return 'TREND_CHANGE';
        return 'SPIKE';
    }

    // 5. High volatility (even without directional trend)
    if ((profiling?.volatilityIndex ?? 0) > THRESHOLDS.VOLATILITY_HIGH) {
        return 'VOLATILITY_SHIFT';
    }

    // 6. General trend change even without spike/drop pattern
    if (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT) {
        return 'TREND_CHANGE';
    }

    // Default: treat as minor trend change (still narrate-able)
    return 'TREND_CHANGE';
}

// ─── Confidence Classification ────────────────────────────────────────────────

/**
 * Determine confidence level from dataset size, anomaly presence, and delta magnitude.
 */
export function classifyConfidence(result: EnrichedKPIResult): ConfidenceLevel {
    const n = result.dataset?.length ?? 0;
    const absDelta = Math.abs(result.deltaPercent ?? 0);
    const hasAnomaly = result.anomaly?.detected === true;

    if (n < THRESHOLDS.MIN_DATA_POINTS) return 'insufficient';

    // High: anomaly confirmed AND large dataset
    if (hasAnomaly && n >= THRESHOLDS.CONFIDENCE_HIGH_N) return 'high';

    // Moderate: significant trend AND enough data
    if (absDelta >= THRESHOLDS.TREND_CHANGE_PERCENT && n >= THRESHOLDS.CONFIDENCE_MODERATE_N) return 'moderate';

    // Low: some data but not much or small delta
    if (n >= THRESHOLDS.MIN_DATA_POINTS) return 'low';

    return 'insufficient';
}

// ─── Period Extraction ────────────────────────────────────────────────────────

export interface PeriodBounds {
    start: string;
    end: string;
}

/**
 * Extract period start/end from dataset labels (period strings from DATE_TRUNC::DATE).
 * Returns 'unknown' if dataset is empty.
 */
export function extractPeriodBounds(result: EnrichedKPIResult): PeriodBounds {
    const pts = result.dataset ?? [];
    if (pts.length === 0) return { start: 'unknown', end: 'unknown' };

    const labels = pts
        .map(p => p.label ?? p.period ?? '')
        .filter(Boolean)
        .sort();

    return {
        start: labels[0] ?? 'unknown',
        end: labels[labels.length - 1] ?? 'unknown',
    };
}
