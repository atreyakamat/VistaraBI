// Module 6E — Synthesis Task Classifier
// Deterministic classification of multi-packet reasoning tasks.
// The model NEVER classifies its own tier — the backend does.

import type { SynthesisTaskType } from './types';

// Forward-looking / speculative keywords that trigger rejection
const SPECULATION_PATTERNS = [
    /\bpredict\b/i, /\bforecast\b/i, /\bwill\s+(be|happen|occur)\b/i,
    /\bnext\s+(month|quarter|year)\b/i, /\bfuture\b/i,
    /\bproject(ed|ion)\b/i, /\bexpect(ed|ation)?\b/i,
];

// Risk/volatility keywords that route to RISK_SIGNAL_SYNTHESIS
const RISK_PATTERNS = [
    /\brisk\b/i, /\bvolatil/i, /\bexposure\b/i,
    /\bdownside\b/i, /\binstabil/i,
];

/**
 * Classify a synthesis task based on packet counts and user intent.
 *
 * Rules:
 *   - Speculation → UNSUPPORTED_SCOPE (always, regardless of packets)
 *   - Risk keywords + any packets → RISK_SIGNAL_SYNTHESIS
 *   - ≥2 events + ≥1 correlation → STRATEGIC_FINANCIAL_OVERVIEW
 *   - ≥2 correlations → CORRELATION_CLUSTER_ANALYSIS
 *   - ≥2 events → MULTI_PACKET_SYNTHESIS
 *   - 1 packet → SINGLE_PACKET_SUMMARY
 *   - 0 packets → UNSUPPORTED_SCOPE
 */
export function classifySynthesisTask(
    eventCount: number,
    correlationCount: number,
    userIntent?: string
): SynthesisTaskType {
    // Check speculation first — always reject
    if (userIntent) {
        for (const pattern of SPECULATION_PATTERNS) {
            if (pattern.test(userIntent)) {
                return 'UNSUPPORTED_SCOPE';
            }
        }
    }

    const total = eventCount + correlationCount;
    if (total === 0) return 'UNSUPPORTED_SCOPE';

    // Risk keywords → RISK_SIGNAL_SYNTHESIS
    if (userIntent) {
        for (const pattern of RISK_PATTERNS) {
            if (pattern.test(userIntent)) {
                return 'RISK_SIGNAL_SYNTHESIS';
            }
        }
    }

    // Multi-type synthesis
    if (eventCount >= 2 && correlationCount >= 1) {
        return 'STRATEGIC_FINANCIAL_OVERVIEW';
    }

    // Correlation cluster
    if (correlationCount >= 2) {
        return 'CORRELATION_CLUSTER_ANALYSIS';
    }

    // Multi-event
    if (eventCount >= 2) {
        return 'MULTI_PACKET_SYNTHESIS';
    }

    // Single packet
    return 'SINGLE_PACKET_SUMMARY';
}

/**
 * Human-readable rejection message for UNSUPPORTED_SCOPE.
 */
export function getUnsupportedScopeMessage(userIntent?: string): string {
    if (userIntent) {
        for (const p of SPECULATION_PATTERNS) {
            if (p.test(userIntent)) {
                return 'VistaraBI does not generate forward-looking predictions or forecasts. Only validated historical evidence is supported.';
            }
        }
    }
    return 'No evidence packets are available for synthesis. At least one validated packet is required.';
}
