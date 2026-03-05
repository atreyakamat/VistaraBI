// Module 6B — Evidence Packet Builder
// Constructs the immutable EventEvidencePacket from an EnrichedKPIResult.
// Validates all required fields are present.
// Freezes the resulting packet before returning.

import { randomUUID } from 'crypto';
import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import type { EventEvidencePacket, EventType, ConfidenceLevel } from './types';
import { classifyEvent, classifyConfidence, extractPeriodBounds } from './event-engine';

// ─── Required Fields Validation ───────────────────────────────────────────────

export class EvidencePacketError extends Error {
    constructor(message: string) {
        super(`[EvidencePacket] ${message}`);
        this.name = 'EvidencePacketError';
    }
}

// ─── Traceable Fields Builder ─────────────────────────────────────────────────

/**
 * Build the list of field names that have non-null numeric values.
 * Only these fields may be cited by the LLM. Any number not in this list = hallucination.
 */
function buildTraceableFields(packet: Omit<EventEvidencePacket, 'traceable_fields' | 'event_id'>): string[] {
    const fields: string[] = [];

    if (packet.delta_percent !== null) fields.push('delta_percent');
    if (packet.volatility_index !== null) fields.push('volatility_index');
    if (packet.anomaly_zscore !== null && packet.anomaly_zscore !== undefined) fields.push('anomaly_zscore');
    if (packet.dataset_length > 0) fields.push('dataset_length');

    return fields;
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

/**
 * Build an immutable EventEvidencePacket from a Module 5.5 EnrichedKPIResult.
 *
 * Throws EvidencePacketError if required fields are missing.
 * Returns Object.freeze(packet) — mutation after construction is type-safe.
 */
export function buildEvidencePacket(
    result: EnrichedKPIResult,
    granularity: string = 'monthly'
): EventEvidencePacket {
    if (!result) {
        throw new EvidencePacketError('EnrichedKPIResult is required');
    }
    if (!result.kpiId) {
        throw new EvidencePacketError('kpiId is required');
    }
    if (!result.kpiName) {
        throw new EvidencePacketError('kpiName is required');
    }

    const eventType: EventType = classifyEvent(result);
    const confidenceLevel: ConfidenceLevel = classifyConfidence(result);
    const { start: period_start, end: period_end } = extractPeriodBounds(result);

    const isAnomaly = result.anomaly?.detected === true;
    const worstAnomaly = isAnomaly ? (result.anomaly?.worstPoint ?? null) : null;

    // Build partial packet (without traceable_fields) first
    const partial: Omit<EventEvidencePacket, 'traceable_fields' | 'event_id'> = {
        kpi_id: result.kpiId,
        kpi_name: result.kpiName,
        unit: result.unit ?? 'unknown',
        granularity,
        period_start,
        period_end,
        delta_percent: result.deltaPercent ?? null,
        delta_direction: result.deltaDirection ?? null,
        volatility_index: result.profiling?.volatilityIndex ?? null,
        anomaly_detected: result.anomaly?.detected === true,
        anomaly_period: worstAnomaly?.label ?? undefined,
        anomaly_zscore: worstAnomaly?.zScore ?? undefined,
        dataset_length: result.dataset?.length ?? 0,
        confidence_level: confidenceLevel,
        event_type: eventType,
    };

    const traceable_fields = buildTraceableFields(partial);

    const packet: EventEvidencePacket = {
        event_id: randomUUID(),
        ...partial,
        traceable_fields,
    };

    // Freeze to guarantee immutability before passing to LLM
    return Object.freeze(packet);
}
