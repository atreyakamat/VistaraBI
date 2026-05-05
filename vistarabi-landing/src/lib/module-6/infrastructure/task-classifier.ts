// Module 6D — Reasoning Task Classifier
// Deterministic, server-side classification of reasoning requests.
// The model NEVER classifies its own tier — this module does it based on
// the execution path and the task type string from the calling module.
//
// Rules:
//  - Input is always a known task type string (validated at API layer)
//  - ADVANCED_SYNTHESIS requires context.hasMultipleKPIs === true
//  - Everything outside the known enum -> UNSUPPORTED
//  - Classification is synchronous and infallible

import type { ReasoningTaskType, ClassificationContext } from './types';

// ─── Known Task Types ─────────────────────────────────────────────────────────

const KNOWN_TASK_TYPES = new Set<ReasoningTaskType>([
    'INTENT_TRANSLATION',
    'EVENT_NARRATION',
    'CORRELATION_EXPLANATION',
    'ADVANCED_SYNTHESIS',
    'STRATEGIC_SUMMARY',
]);

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classify a reasoning request into a deterministic ReasoningTaskType.
 *
 * Context gates:
 *  - ADVANCED_SYNTHESIS: requires context.hasMultipleKPIs === true
 *    (synthesizing across a single KPI is just EVENT_NARRATION)
 *
 * Returns 'UNSUPPORTED' for:
 *  - Unknown task type strings
 *  - ADVANCED_SYNTHESIS without multi-KPI context
 *  - Null/undefined input
 */
export function classifyReasoningTask(
    rawTaskType: string | null | undefined,
    context?: ClassificationContext
): ReasoningTaskType {
    if (!rawTaskType) return 'UNSUPPORTED';

    const normalized = rawTaskType.trim().toUpperCase() as ReasoningTaskType;

    if (!KNOWN_TASK_TYPES.has(normalized)) {
        return 'UNSUPPORTED';
    }

    // Context gate for ADVANCED_SYNTHESIS
    if (normalized === 'ADVANCED_SYNTHESIS') {
        if (!context?.hasMultipleKPIs) {
            return 'UNSUPPORTED';
        }
    }

    return normalized;
}

/**
 * Human-readable rejection message for UNSUPPORTED classification.
 * Used by the pipeline to construct the structured error response.
 */
export function getUnsupportedReasoningMessage(rawTaskType: string | null | undefined): string {
    if (!rawTaskType) {
        return 'No reasoning task type was provided.';
    }
    if (rawTaskType.toUpperCase() === 'ADVANCED_SYNTHESIS') {
        return 'ADVANCED_SYNTHESIS requires multiple KPIs to be present in the evidence context.';
    }
    return `"${rawTaskType}" is not a supported reasoning scope for this system. Supported types: INTENT_TRANSLATION, EVENT_NARRATION, CORRELATION_EXPLANATION, ADVANCED_SYNTHESIS, STRATEGIC_SUMMARY.`;
}
