// Module 6C — Types
// All type definitions for the Correlation & Statistical Governance layer.
// Module 6C reads ONLY from EnrichedKPIResult[] and never mutates dashboard state.

import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';

// ─── Eligibility ───────────────────────────────────────────────────────────────

/** Aggregation functions that are composable (additive) and correlation-eligible */
export const COMPOSABLE_AGGREGATIONS = new Set(['SUM', 'COUNT', 'COUNT_DISTINCT']);

/** Grain types that support time-lagged correlation */
export const LAG_ELIGIBLE_GRAINS = new Set(['monthly', 'quarterly']);

/** Allowed lag offsets (bounded to prevent overfitting) */
export const ALLOWED_LAGS = [-2, -1, 0, 1, 2] as const;
export type AllowedLag = typeof ALLOWED_LAGS[number];

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const CORRELATION_THRESHOLDS = {
    MIN_OBSERVATIONS: 5,        // Minimum effective n (after null filtering)
    MAX_NULL_RATIO: 0.20,       // Reject if either series has > 20% nulls
    SIGNIFICANCE_ALPHA: 0.05,   // Two-tailed t-test alpha
    TREND_SLOPE_ALPHA: 0.10,    // Alpha for slope significance in trend detection
} as const;

// ─── KPI Pair ─────────────────────────────────────────────────────────────────

export interface KPIPair {
    kpiAId: string;
    kpiBId: string;
}

export type KPIPairRejectionCode =
    | 'KPI_NOT_FOUND'
    | 'SAME_KPI'
    | 'GRAIN_INELIGIBLE'
    | 'NOT_COMPOSABLE'
    | 'INSUFFICIENT_DATA_A'
    | 'INSUFFICIENT_DATA_B'
    | 'MANY_TO_MANY_JOIN'
    | 'NO_JOIN_PATH'
    | 'NULL_RATIO_EXCEEDED'
    | 'EFFECTIVE_N_TOO_SMALL';

export interface KPIPairValidationResult {
    valid: boolean;
    reason?: string;
    rejectionCode?: KPIPairRejectionCode;
    kpiA?: EnrichedKPIResult;
    kpiB?: EnrichedKPIResult;
    unitA?: string;
    unitB?: string;
}

// ─── Lag Result ───────────────────────────────────────────────────────────────

export interface LagResult {
    lag: number;
    pearsonR: number | null;
    tStat: number | null;
    pValue: number | null;
    effectiveN: number;
    significant: boolean;    // Under Bonferroni-corrected alpha
}

// ─── Correlation Metrics ──────────────────────────────────────────────────────

export interface CorrelationMetrics {
    pearsonR: number | null;
    tStat: number | null;
    pValue: number | null;
    effectiveN: number;
    significant: boolean;
}

// ─── Evidence Packet ─────────────────────────────────────────────────────────
// Immutable — frozen before LLM call. All numeric claims trace to this packet.

export type CorrelationConfidenceLevel = 'high' | 'moderate' | 'low' | 'insufficient';

export interface CorrelationEvidencePacket {
    insight_id: string;
    kpi_a_id: string;
    kpi_b_id: string;
    kpi_a_name: string;
    kpi_b_name: string;
    unit_a: string;
    unit_b: string;
    grain: string;
    time_window_start: string;
    time_window_end: string;
    n_observations: number;
    pearson_r: number | null;
    p_value: number | null;
    statistically_significant: boolean;
    lag_applied: number;
    lags_tested: number[];
    bonferroni_alpha: number;
    null_ratio_a: number;
    null_ratio_b: number;
    first_differencing_applied: boolean;
    trend_confounder_detected: boolean;
    confidence_level: CorrelationConfidenceLevel;
    correlation_reportable: boolean;
    traceable_fields: string[];
}

// ─── Correlation Result ───────────────────────────────────────────────────────

export type CorrelationStatus = 'success' | 'insufficient' | 'rejected' | 'suppressed';

export interface CorrelationResult {
    status: CorrelationStatus;
    explanation?: string;       // LLM-generated (only on success)
    message?: string;           // Human-readable for all other statuses
    evidence?: CorrelationEvidencePacket;
}
