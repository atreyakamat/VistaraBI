// Module 6B — Numeric Guard
// Post-processes LLM explanation output to detect numeric hallucinations.
// Any number in the LLM response that does NOT appear in the evidence packet
// is classified as a hallucination and the response is suppressed.
// Policy: SUPPRESS (entire response), not REDACT.

import type { EventEvidencePacket, NumericGuardResult } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Tolerance for floating-point comparison (e.g. 24.0 vs 24.00 matches). */
const FLOAT_TOLERANCE = 0.0001;

/** Pattern to extract all numeric values from text (integers and decimals, negative allowed). */
const NUMERIC_PATTERN = /-?\d+(\.\d+)?/g;

// ─── Evidence Value Extraction ────────────────────────────────────────────────

/**
 * Extract all numeric values present in the evidence packet.
 * Only fields listed in traceable_fields are authoritative sources.
 */
function extractEvidenceNumbers(packet: EventEvidencePacket): number[] {
    const values: number[] = [];

    // Always try all four canonical evidence fields regardless of traceable_fields
    // (traceable_fields tells the LLM what to cite; this tells us what is valid)
    if (packet.delta_percent !== null) values.push(Math.abs(packet.delta_percent));  // LLM often drops sign
    if (packet.delta_percent !== null) values.push(packet.delta_percent);
    if (packet.volatility_index !== null) values.push(packet.volatility_index);
    if (packet.anomaly_zscore !== null && packet.anomaly_zscore !== undefined) {
        values.push(packet.anomaly_zscore);
        values.push(Math.abs(packet.anomaly_zscore));
    }
    if (packet.dataset_length > 0) values.push(packet.dataset_length);

    // Allow dataset_length as an integer (no tolerance needed)
    return values;
}

// ─── Numeric Match ────────────────────────────────────────────────────────────

/**
 * Check whether a number extracted from LLM text matches any evidence value.
 * Uses floating-point tolerance for decimals.
 * Integers must match exactly.
 */
function matchesEvidence(num: number, evidenceValues: number[]): boolean {
    return evidenceValues.some(ev => Math.abs(num - ev) <= FLOAT_TOLERANCE);
}

// ─── Main Guard ───────────────────────────────────────────────────────────────

/**
 * Validate that every number in the LLM explanation traces to the evidence packet.
 *
 * Returns:
 *  - { status: 'valid', explanation } if all numbers are traceable
 *  - { status: 'suppressed', message, detectedHallucinations } if any number is hallucinated
 *
 * Policy: SUPPRESS entire response — no partial redaction in production.
 */
export function validateNumericClaims(
    llmExplanation: string,
    packet: EventEvidencePacket
): NumericGuardResult {
    const evidenceValues = extractEvidenceNumbers(packet);

    // Extract all numeric patterns from LLM response
    const rawMatches = [...llmExplanation.matchAll(NUMERIC_PATTERN)];
    const numbersInResponse = rawMatches.map(m => parseFloat(m[0]));

    if (numbersInResponse.length === 0) {
        // No numbers in response → trivially valid (qualitative statements only)
        return { status: 'valid', explanation: llmExplanation };
    }

    // Check each number for evidence traceability
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

// ─── Exported for testing ─────────────────────────────────────────────────────

export { extractEvidenceNumbers, matchesEvidence };
