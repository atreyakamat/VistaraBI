// Module 6C — Numeric Guard
// Post-validates LLM explanation output against the correlation evidence packet.
// Any number in the LLM response not present in the evidence packet = hallucination.
// Policy: SUPPRESS entire response. No redaction.
// Pattern mirrors module-6b/numeric-guard.ts — not imported cross-module.

import type { CorrelationEvidencePacket } from './types';

const FLOAT_TOLERANCE = 0.0001;
const NUMERIC_PATTERN = /-?\d+(\.\d+)?/g;

export interface NumericGuardResult {
    status: 'valid' | 'suppressed';
    explanation?: string;
    message?: string;
    detectedHallucinations?: number[];
}

// ─── Evidence Value Extraction ─────────────────────────────────────────────────

export function extractEvidenceNumbers(packet: CorrelationEvidencePacket): number[] {
    const values: number[] = [];

    if (packet.pearson_r !== null) {
        values.push(packet.pearson_r);
        values.push(Math.abs(packet.pearson_r));
    }
    if (packet.p_value !== null) {
        values.push(packet.p_value);
    }
    if (packet.n_observations > 0) {
        values.push(packet.n_observations);
    }
    if (packet.bonferroni_alpha > 0) {
        values.push(packet.bonferroni_alpha);
    }
    if (packet.null_ratio_a > 0) {
        values.push(packet.null_ratio_a);
        values.push(Math.abs(packet.null_ratio_a));
    }
    if (packet.null_ratio_b > 0) {
        values.push(packet.null_ratio_b);
        values.push(Math.abs(packet.null_ratio_b));
    }
    // Allow lag offset values (small integers)
    if (packet.lag_applied !== 0) values.push(packet.lag_applied);

    return values;
}

// ─── Match Check ──────────────────────────────────────────────────────────────

export function matchesEvidence(num: number, evidenceValues: number[]): boolean {
    return evidenceValues.some(ev => Math.abs(num - ev) <= FLOAT_TOLERANCE);
}

// ─── Main Guard ───────────────────────────────────────────────────────────────

/**
 * Validate that every number in the LLM explanation traces to the evidence packet.
 * Suppress if any unmatched number found.
 */
export function validateNumericClaims(
    llmExplanation: string,
    packet: CorrelationEvidencePacket
): NumericGuardResult {
    const evidenceValues = extractEvidenceNumbers(packet);
    const rawMatches = [...llmExplanation.matchAll(NUMERIC_PATTERN)];
    const numbersInResponse = rawMatches.map(m => parseFloat(m[0]));

    if (numbersInResponse.length === 0) {
        return { status: 'valid', explanation: llmExplanation };
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
            message: 'This insight could not be validated against the available evidence.',
            detectedHallucinations: hallucinations,
        };
    }

    return { status: 'valid', explanation: llmExplanation };
}
