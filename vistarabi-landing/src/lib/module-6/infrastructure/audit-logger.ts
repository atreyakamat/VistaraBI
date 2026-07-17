// Module 6D — Audit Logger
// Extends the Module 6A audit infrastructure with model metadata.
// Uses writeAuditRecord() from module-6/audit-log.ts as the underlying writer.
// Model metadata is stored in the structuredCommand JSON field (no schema migration needed).
// Never throws — audit failure is non-fatal.

import { writeAuditRecord } from '@/lib/module-6/audit-log';
import type { AuditRecord } from '@/lib/module-6/types';
import type { ModelAuditMetadata, ReasoningTaskType, EvidenceInput } from './types';

// ─── Audit Payload ────────────────────────────────────────────────────────────

interface ReasoningAuditPayload {
    projectId: string;
    taskType: ReasoningTaskType;
    userQuery: string;
    sanitizedQuery: string;
    modelMetadata: ModelAuditMetadata;
    narrationStatus: string;
    errorCode?: string;
}

// ─── Writer ───────────────────────────────────────────────────────────────────

/**
 * Write a reasoning audit record with full model metadata.
 *
 * Stores ModelAuditMetadata as JSON in the `structuredCommand` field,
 * which accepts any plain object — no schema migration required.
 *
 * Never throws. Audit failure is logged but does not affect the user response.
 */
export async function writeReasoningAuditRecord(payload: ReasoningAuditPayload): Promise<void> {
    const record: AuditRecord = {
        sessionId: payload.projectId,
        intentId: `6d-${payload.taskType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        rawUserQuery: payload.userQuery.slice(0, 2000),
        normalizedUserQuery: payload.sanitizedQuery.slice(0, 2000),
        llmRawOutput: undefined,
        validationStagesPassed: payload.modelMetadata.status === 'success' ? 1 : 0,
        validationFailedAt: undefined,
        structuredCommand: {
            // Overload structuredCommand to carry model metadata
            action: 'REASONING' as any,
            intent_id: `6d-${payload.taskType}-${Date.now()}`,
            ai_generated: true,
            dataset_version_id: 'N/A',
            natural_language_intent: `[6D] ${payload.taskType} | model: ${payload.modelMetadata.modelId} | tier: ${payload.modelMetadata.modelTier} | latency: ${payload.modelMetadata.latencyMs}ms`,
            // Attach full metadata for reconstruction
            ...(payload.modelMetadata as unknown as Record<string, unknown>),
        },
        executionStatus: payload.narrationStatus === 'success' ? 'success' : 'execution_failed',
        errorCode: payload.errorCode,
    };

    try {
        await writeAuditRecord(record);
    } catch (err: any) {
        // Audit failure is non-fatal — log but never propagate to caller
        console.error('[Module6D/audit] Failed to write reasoning audit record:', err.message ?? err);
    }
}
