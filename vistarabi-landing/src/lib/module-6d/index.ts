// Module 6D — Entry Point
// handleReasoningQuery() — 8-step tiered reasoning pipeline.
//
// Steps:
//   1. Classify task type (deterministic, no LLM)
//   2. Reject UNSUPPORTED → UNSUPPORTED_REASONING_SCOPE
//   3. Route to adapter (LOCAL / CLOUD) via model-router
//   4. Check feature flag (cloud tasks require ENABLE_CLOUD_ROUTING=true)
//   5. Build evidence-only, sanitized prompt
//   6. Call adapter (single attempt, no retry)
//   7. Validate numeric integrity (model-agnostic)
//   8. Write audit record (unconditional, non-fatal)
//   9. Return ReasoningResult
//
// Invariants preserved:
//   - No dashboard state mutation
//   - No raw SQL in prompts
//   - No free-form AI behavior
//   - Numeric claims validated against evidence packet, regardless of model

import { classifyReasoningTask, getUnsupportedReasoningMessage } from './task-classifier';
import { routeTask, isRoutingDecision } from './model-router';
import { buildReasoningPrompt } from './prompt-builder';
import { callLocalModel } from './local-adapter';
import { callCloudModel } from './cloud-adapter';
import { validateNumericClaims } from './numeric-guard';
import { writeReasoningAuditRecord } from './audit-logger';
import type {
    EvidenceInput,
    ModelAuditMetadata,
    ReasoningResult,
    ClassificationContext,
    ReasoningTaskType,
    AdapterResponse,
} from './types';
import { ModelCallError } from './types';

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Full Module 6D reasoning pipeline.
 *
 * @param projectId    Project identifier — used for audit trail
 * @param rawTaskType  Reasoning task type string (classified deterministically)
 * @param evidence     Frozen EventEvidencePacket or CorrelationEvidencePacket
 * @param userQuery    Raw user question — will be sanitized before prompt injection
 * @param context      Optional classification context (e.g. hasMultipleKPIs)
 */
export async function handleReasoningQuery(
    projectId: string,
    rawTaskType: string,
    evidence: EvidenceInput,
    userQuery: string,
    context?: ClassificationContext
): Promise<ReasoningResult> {

    // ── Step 1: Classify task ─────────────────────────────────────────────────
    const taskType: ReasoningTaskType = classifyReasoningTask(rawTaskType, context);

    // ── Step 2: Reject UNSUPPORTED ────────────────────────────────────────────
    if (taskType === 'UNSUPPORTED') {
        return {
            status: 'rejected',
            message: getUnsupportedReasoningMessage(rawTaskType),
        };
    }

    // ── Step 3 + 4: Route to adapter (includes feature flag check) ───────────
    const routing = routeTask(taskType);

    if (!isRoutingDecision(routing)) {
        // Structured rejection — e.g. MODEL_UNAVAILABLE when cloud disabled
        return {
            status: 'rejected',
            message: routing.message,
        };
    }

    // ── Step 5: Build evidence-only, sanitized prompt ─────────────────────────
    const { systemPrompt, userMessage, sanitizedQuery } = buildReasoningPrompt(
        taskType,
        evidence,
        userQuery
    );

    // ── Step 6: Call adapter (single attempt, no retry) ──────────────────────
    const startMs = Date.now();
    let adapterResponse: AdapterResponse;

    try {
        if (routing.tier === 'LOCAL') {
            adapterResponse = await callLocalModel(systemPrompt, userMessage, routing.temperature, routing.modelId);
        } else {
            adapterResponse = await callCloudModel(systemPrompt, userMessage, routing.temperature, routing.modelId);
        }
    } catch (err: unknown) {
        const isModelError = err instanceof ModelCallError;
        const code = isModelError ? err.code : 'ADAPTER_FAILED';
        const msg = isModelError ? err.message : 'Model adapter call failed with an unexpected error';
        const isTimeout = code === 'LOCAL_TIMEOUT' || code === 'CLOUD_TIMEOUT';

        // Write audit record for failed call
        const failedMetadata: ModelAuditMetadata = {
            taskType,
            modelTier: routing.tier,
            modelId: routing.modelId,
            temperature: routing.temperature,
            latencyMs: Date.now() - startMs,
            status: isTimeout ? 'timeout' : 'error',
        };
        await writeReasoningAuditRecord({
            projectId, taskType, userQuery, sanitizedQuery,
            modelMetadata: failedMetadata,
            narrationStatus: 'failed',
            errorCode: code,
        });

        return {
            status: isTimeout ? 'timeout' : 'rejected',
            message: msg,
            modelMetadata: failedMetadata,
        };
    }

    // ── Step 7: Validate numeric integrity ────────────────────────────────────
    const guardResult = validateNumericClaims(adapterResponse.text, evidence);

    const finalStatus = guardResult.status === 'valid' ? 'success' : 'suppressed';

    // ── Step 8: Write audit record (unconditional) ────────────────────────────
    const modelMetadata: ModelAuditMetadata = {
        taskType,
        modelTier: routing.tier,
        modelId: adapterResponse.modelId,
        temperature: routing.temperature,
        inputTokens: adapterResponse.inputTokens,
        outputTokens: adapterResponse.outputTokens,
        latencyMs: adapterResponse.latencyMs,
        status: finalStatus,
    };

    await writeReasoningAuditRecord({
        projectId, taskType, userQuery, sanitizedQuery,
        modelMetadata,
        narrationStatus: finalStatus,
    });

    // ── Step 9: Return result ─────────────────────────────────────────────────
    if (guardResult.status === 'suppressed') {
        return {
            status: 'suppressed',
            message: guardResult.message!,
            evidence,
            modelMetadata,
        };
    }

    return {
        status: 'success',
        explanation: guardResult.explanation,
        evidence,
        modelMetadata,
    };
}
