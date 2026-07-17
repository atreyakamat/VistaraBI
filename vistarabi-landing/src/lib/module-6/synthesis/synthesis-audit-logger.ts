// Module 6E — Synthesis Audit Logger
// Extends Module 6A audit infrastructure with synthesis-specific metadata.
// Non-fatal — never throws.

import { writeAuditRecord } from '@/lib/module-6/audit-log';
import type { AuditRecord } from '@/lib/module-6/types';
import type { SynthesisAuditMetadata } from './types';

export interface SynthesisAuditPayload {
    projectId: string;
    userQuery: string;
    sanitizedQuery: string;
    metadata: SynthesisAuditMetadata;
    narrationStatus: string;
    errorCode?: string;
}

/**
 * Write a synthesis audit record with full packet and model metadata.
 * Non-fatal — audit failure is logged but never propagates.
 */
export async function writeSynthesisAuditRecord(payload: SynthesisAuditPayload): Promise<void> {
    const record: AuditRecord = {
        sessionId: payload.projectId,
        intentId: `6e-${payload.metadata.reasoningTier}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        rawUserQuery: payload.userQuery.slice(0, 2000),
        normalizedUserQuery: payload.sanitizedQuery.slice(0, 2000),
        llmRawOutput: undefined,
        validationStagesPassed: payload.metadata.status === 'success' ? 1 : 0,
        validationFailedAt: undefined,
        structuredCommand: {
            action: 'SYNTHESIS' as any,
            intent_id: `6e-${payload.metadata.reasoningTier}-${Date.now()}`,
            ai_generated: true,
            dataset_version_id: 'N/A',
            natural_language_intent: `[6E] ${payload.metadata.reasoningTier} | model: ${payload.metadata.modelId} | tier: ${payload.metadata.modelTier} | latency: ${payload.metadata.latencyMs}ms | packets: ${payload.metadata.packetIds.length} | conflicts: ${payload.metadata.conflictCount}`,
            ...(payload.metadata as unknown as Record<string, unknown>),
        },
        executionStatus: payload.narrationStatus === 'success' ? 'success' : 'execution_failed',
        errorCode: payload.errorCode,
    };

    try {
        await writeAuditRecord(record);
    } catch (err: any) {
        console.error('[Module6E/audit] Failed to write synthesis audit record:', err.message ?? err);
    }
}
