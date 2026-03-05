// Module 6E — Cross-Packet Numeric Guard
// Validates model output against the UNION of traceable_fields from ALL packets.
// Model-agnostic — identical suppression policy for local and cloud.
// No partial redaction. Full suppression on any unmatched number.

import type { EventEvidencePacket, CorrelationEvidencePacket } from './types';

const FLOAT_TOLERANCE = 0.0001;
const NUMERIC_PATTERN = /-?\d+(\.\d+)?/g;

export interface CrossPacketGuardResult {
    status: 'valid' | 'suppressed';
    explanation?: string;
    message?: string;
    detectedHallucinations?: number[];
}

/**
 * Extract all numeric values from traceable_fields across multiple packets.
 */
export function extractAllEvidenceNumbers(
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[]
): number[] {
    const values = new Set<number>();

    const extract = (packet: Record<string, any>, fields: string[]) => {
        for (const field of fields) {
            const raw = packet[field];
            if (typeof raw === 'number' && isFinite(raw)) {
                values.add(raw);
                if (raw < 0) values.add(Math.abs(raw));
            }
        }
    };

    for (const ev of events) {
        extract(ev as any, ev.traceable_fields);
    }
    for (const corr of correlations) {
        extract(corr as any, corr.traceable_fields);
    }

    return [...values];
}

function matchesEvidence(num: number, evidenceValues: number[]): boolean {
    return evidenceValues.some(ev => Math.abs(num - ev) <= FLOAT_TOLERANCE);
}

/**
 * Validate every number in model output against union(traceable_fields).
 * If ANY unmatched → suppress entire response.
 */
export function validateCrossPacketNumerics(
    modelOutput: string,
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[]
): CrossPacketGuardResult {
    const evidenceValues = extractAllEvidenceNumbers(events, correlations);
    const rawMatches = [...modelOutput.matchAll(NUMERIC_PATTERN)];
    const numbersInResponse = rawMatches.map(m => parseFloat(m[0]));

    if (numbersInResponse.length === 0) {
        return { status: 'valid', explanation: modelOutput };
    }

    const hallucinations: number[] = [];
    for (const num of numbersInResponse) {
        if (!matchesEvidence(num, evidenceValues)) {
            hallucinations.push(num);
        }
    }

    if (hallucinations.length > 0) {
        return {
            status: 'suppressed',
            message: 'This synthesized insight could not be validated against the available statistical evidence and was suppressed.',
            detectedHallucinations: hallucinations,
        };
    }

    return { status: 'valid', explanation: modelOutput };
}
