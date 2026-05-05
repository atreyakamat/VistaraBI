// Module 6 Shared — Numeric Guard
// Post-validates model output against evidence packet numeric values.
// Consolidates infrastructure, events, correlations, and synthesis guards.

export interface EvidenceInput {
    traceable_fields?: string[];
}

const FLOAT_TOLERANCE = 0.0001;
const NUMERIC_PATTERN = /-?\d+(\.\d+)?/g;

export interface NumericGuardResult {
    status: 'valid' | 'suppressed';
    explanation?: string;
    message?: string;
    detectedHallucinations?: number[];
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Extract all numeric values from an evidence packet or an array of packets.
 * For negative values, also includes the absolute value (LLM may cite magnitude).
 */
export function extractEvidenceNumbers(evidence: EvidenceInput | EvidenceInput[]): number[] {
    const values: number[] = [];

    if (Array.isArray(evidence)) {
        for (const ev of evidence) {
            values.push(...extractEvidenceNumbers(ev));
        }
        return [...new Set(values)];
    }

    const traceableFields = evidence.traceable_fields ?? [];

    const evidenceRecord = evidence as Record<string, unknown>;

    for (const field of traceableFields) {
        const raw = evidenceRecord[field];
        if (isFiniteNumber(raw)) {
            values.push(raw);
            if (raw < 0) values.push(Math.abs(raw));
        }
    }

    // Additional fields that were manually cited in events/correlations
    // but might not be in traceable_fields explicitly everywhere
    const fallbackFields = [
        'dataset_length', 
        'lag_applied', 
        'n_observations', 
        'delta_percent', 
        'volatility_index', 
        'anomaly_zscore', 
        'pearson_r', 
        'p_value', 
        'bonferroni_alpha', 
        'null_ratio_a', 
        'null_ratio_b'
    ];
    
    for (const field of fallbackFields) {
        const raw = evidenceRecord[field];
        if (isFiniteNumber(raw)) {
            values.push(raw);
            if (raw < 0) values.push(Math.abs(raw));
        }
    }

    return [...new Set(values)];
}

export function matchesEvidence(num: number, evidenceValues: number[]): boolean {
    return evidenceValues.some(ev => Math.abs(num - ev) <= FLOAT_TOLERANCE);
}

/**
 * Validate every number in the model's output against the evidence packet(s).
 * If ANY unmatched number is found -> suppress entire response.
 *
 * Policy: suppress (never redact). Message is standardized.
 */
export function validateNumericClaims(
    modelOutput: string,
    evidence: EvidenceInput | EvidenceInput[],
    customSuppressionMessage?: string
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
            message: customSuppressionMessage ?? 'This insight could not be validated against the available evidence.',
            detectedHallucinations: hallucinations,
        };
    }

    return { status: 'valid', explanation: modelOutput };
}
