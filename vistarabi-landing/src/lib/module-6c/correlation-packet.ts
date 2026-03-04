// Module 6C — Correlation Evidence Packet Builder
// Assembles the immutable CorrelationEvidencePacket from all computed components.
// Validates all required fields are present.
// Freezes the resulting packet before returning.

import { randomUUID } from 'crypto';
import type {
    CorrelationEvidencePacket,
    CorrelationConfidenceLevel,
    LagResult,
} from './types';
import { CORRELATION_THRESHOLDS } from './types';

export class CorrelationPacketError extends Error {
    constructor(message: string) {
        super(`[CorrelationPacket] ${message}`);
        this.name = 'CorrelationPacketError';
    }
}

// ─── Confidence Classification ────────────────────────────────────────────────

/**
 * Classify confidence level from n, significance, and r magnitude.
 */
function classifyConfidence(
    n: number,
    significant: boolean,
    pearsonR: number | null
): CorrelationConfidenceLevel {
    if (n < CORRELATION_THRESHOLDS.MIN_OBSERVATIONS) return 'insufficient';
    if (!significant || pearsonR === null) return 'insufficient';

    const absR = Math.abs(pearsonR);

    // HIGH: n >= 20 and strong correlation (|r| >= 0.7)
    if (n >= 20 && absR >= 0.7) return 'high';

    // MODERATE: n >= 10 and moderate correlation (|r| >= 0.5)
    if (n >= 10 && absR >= 0.5) return 'moderate';

    // LOW: significant but weak or small n
    return 'low';
}

// ─── Traceable Fields Builder ─────────────────────────────────────────────────

/**
 * Build list of non-null numeric field names.
 * Only these may be cited by the LLM.
 */
function buildTraceableFields(packet: Omit<CorrelationEvidencePacket, 'traceable_fields' | 'insight_id'>): string[] {
    const fields: string[] = [];
    if (packet.pearson_r !== null) fields.push('pearson_r');
    if (packet.p_value !== null) fields.push('p_value');
    if (packet.n_observations > 0) fields.push('n_observations');
    if (packet.bonferroni_alpha > 0) fields.push('bonferroni_alpha');
    if (packet.null_ratio_a > 0) fields.push('null_ratio_a');
    if (packet.null_ratio_b > 0) fields.push('null_ratio_b');
    return fields;
}

// ─── Build Arguments Contract ─────────────────────────────────────────────────

export interface CorrelationPacketArgs {
    kpiAId: string;
    kpiBId: string;
    kpiAName: string;
    kpiBName: string;
    unitA: string;
    unitB: string;
    grain: string;
    timeWindowStart: string;
    timeWindowEnd: string;
    nObservations: number;
    pearsonR: number | null;
    pValue: number | null;
    statSig: boolean;
    lagApplied: number;
    lagsTested: number[];
    bonferroniAlphaVal: number;
    nullRatioA: number;
    nullRatioB: number;
    firstDifferencingApplied: boolean;
    trendConfounderDetected: boolean;
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

/**
 * Build an immutable CorrelationEvidencePacket from all computed components.
 *
 * correlation_reportable is set to true ONLY when:
 *  - statistically_significant === true
 *  - confidence_level !== 'insufficient'
 *  - pearson_r !== null
 *
 * Returns Object.freeze(packet).
 */
export function buildCorrelationPacket(args: CorrelationPacketArgs): CorrelationEvidencePacket {
    if (!args.kpiAId) throw new CorrelationPacketError('kpiAId is required');
    if (!args.kpiBId) throw new CorrelationPacketError('kpiBId is required');
    if (!args.kpiAName) throw new CorrelationPacketError('kpiAName is required');
    if (!args.kpiBName) throw new CorrelationPacketError('kpiBName is required');

    const confidenceLevel = classifyConfidence(args.nObservations, args.statSig, args.pearsonR);

    const correlationReportable =
        args.statSig &&
        args.pearsonR !== null &&
        confidenceLevel !== 'insufficient';

    const partial: Omit<CorrelationEvidencePacket, 'traceable_fields' | 'insight_id'> = {
        kpi_a_id: args.kpiAId,
        kpi_b_id: args.kpiBId,
        kpi_a_name: args.kpiAName,
        kpi_b_name: args.kpiBName,
        unit_a: args.unitA,
        unit_b: args.unitB,
        grain: args.grain,
        time_window_start: args.timeWindowStart,
        time_window_end: args.timeWindowEnd,
        n_observations: args.nObservations,
        pearson_r: args.pearsonR,
        p_value: args.pValue,
        statistically_significant: args.statSig,
        lag_applied: args.lagApplied,
        lags_tested: [...args.lagsTested],
        bonferroni_alpha: args.bonferroniAlphaVal,
        null_ratio_a: args.nullRatioA,
        null_ratio_b: args.nullRatioB,
        first_differencing_applied: args.firstDifferencingApplied,
        trend_confounder_detected: args.trendConfounderDetected,
        confidence_level: confidenceLevel,
        correlation_reportable: correlationReportable,
    };

    const traceable_fields = buildTraceableFields(partial);

    const packet: CorrelationEvidencePacket = {
        insight_id: randomUUID(),
        ...partial,
        traceable_fields,
    };

    return Object.freeze(packet);
}
