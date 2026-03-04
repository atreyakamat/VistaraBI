// Module 6D — Numeric Guard (Model-Agnostic)
// Post-validates model output against evidence packet traceable fields.
// Identical suppression policy regardless of which model (LOCAL or CLOUD) generated output.
// Local copy — not imported cross-module from 6B or 6C.

import type { EvidenceInput } from './types';

const FLOAT_TOLERANCE = 0.0001;
const NUMERIC_PATTERN = /-?\d+(\.\d+)?/g;

export interface NumericGuardResult {
    status: 'valid' | 'suppressed';
    explanation?: string;
    message?: string;
    detectedHallucinations?: number[];
}

// ─── Evidence Number Extraction ───────────────────────────────────────────────

/**
 * Extract all numeric values from an evidence packet's traceable fields.
 * For negative values, also includes the absolute value (LLM may cite magnitude).
 */
export function extractEvidenceNumbers(evidence: EvidenceInput): number[] {
    const traceableFields = (evidence as any).traceable_fields as string[] ?? [];
    const values: number[] = [];

    for (const field of traceableFields) {
        const raw = (evidence as any)[field];
        if (typeof raw === 'number' && isFinite(raw)) {
            values.push(raw);
            if (raw < 0) values.push(Math.abs(raw));  // Also allow abs value citation
        }
        // Integer fields like n_observations
        if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
            values.push(raw);
        }
    }

    return [...new Set(values)];  // Deduplicate
}

// ─── Match Check ──────────────────────────────────────────────────────────────

export function matchesEvidence(num: number, evidenceValues: number[]): boolean {
    return evidenceValues.some(ev => Math.abs(num - ev) <= FLOAT_TOLERANCE);
}

// ─── Main Guard ───────────────────────────────────────────────────────────────

/**
 * Validate every number in the model's output against evidence packet.
 * If ANY unmatched number found → suppress entire response.
 *
 * Policy: suppress (never redact). Message is always standardized.
 * This policy is identical for LOCAL and CLOUD model outputs.
 */
export function validateNumericClaims(
    modelOutput: string,
    evidence: EvidenceInput
): NumericGuardResult {
    const evidenceValues = extractEvidenceNumbers(evidence);
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
            message: 'This insight could not be validated against the available evidence.',
            detectedHallucinations: hallucinations,
        };
    }

    return { status: 'valid', explanation: modelOutput };
}
