// Module 6E — Entry Point
// handleSynthesisQuery() — 11-step multi-evidence synthesis pipeline.
//
// Invariants:
//   - Never recomputes statistics
//   - Never calls statistics-core
//   - Never accesses database
//   - Never mutates dashboard state
//   - Never bypasses numeric guard
//   - Never allows non-significant correlations into synthesis
//   - Never fabricates forward projections

import { governPackets } from './packet-governance';
import { detectConflicts } from './conflict-detector';
import { classifySynthesisTask, getUnsupportedScopeMessage } from './synthesis-classifier';
import { buildSynthesisPrompt } from './synthesis-prompt-builder';
import { checkCausation } from './causation-guard';
import { validateNumericClaims } from '../shared/numeric-guard';
import { writeSynthesisAuditRecord } from './synthesis-audit-logger';
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';
import { callCloudModel } from '@/lib/module-6/infrastructure/cloud-adapter';
import { isCloudRoutingEnabled } from '@/lib/module-6/infrastructure/model-router';
import {
    SYNTHESIS_TIER_MAP,
    SYNTHESIS_TEMPERATURE,
} from './types';
import type {
    EventEvidencePacket,
    CorrelationEvidencePacket,
    SynthesisResult,
    SynthesisTaskType,
    SynthesisAuditMetadata,
    ConflictDescriptor,
} from './types';
import { LOCAL_MODEL_ID, CLOUD_MODEL_ID, type AdapterResponse } from '@/lib/module-6/infrastructure/types';

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function handleSynthesisQuery(
    projectId: string,
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[],
    userQuery: string
): Promise<SynthesisResult> {
    const now = new Date().toISOString();

    // ── Step 1: Govern packets ────────────────────────────────────────────────
    const governed = governPackets(events, correlations);

    if (governed.reason) {
        return {
            status: 'rejected',
            message: governed.reason,
            supportingPacketIds: [],
            conflictSummary: [],
            generatedAt: now,
        };
    }

    // ── Step 2: Detect conflicts ──────────────────────────────────────────────
    const conflicts = detectConflicts(governed.events, governed.correlations);

    // ── Step 3: Classify synthesis tier ────────────────────────────────────────
    const taskType = classifySynthesisTask(
        governed.events.length,
        governed.correlations.length,
        userQuery
    );

    // ── Step 4: Reject UNSUPPORTED_SCOPE ──────────────────────────────────────
    if (taskType === 'UNSUPPORTED_SCOPE') {
        return {
            status: 'rejected',
            message: getUnsupportedScopeMessage(userQuery),
            supportingPacketIds: [],
            conflictSummary: [],
            generatedAt: now,
        };
    }

    // ── Step 5: Route to model ────────────────────────────────────────────────
    const tier = SYNTHESIS_TIER_MAP[taskType];
    const modelId = tier === 'LOCAL' ? LOCAL_MODEL_ID : CLOUD_MODEL_ID;

    if (tier === 'CLOUD' && !isCloudRoutingEnabled()) {
        return {
            status: 'rejected',
            message: 'Cloud reasoning is not enabled. Strategic and risk analysis require ENABLE_CLOUD_ROUTING=true.',
            supportingPacketIds: [],
            conflictSummary: conflicts,
            generatedAt: now,
        };
    }

    // ── Step 6: Build synthesis prompt ─────────────────────────────────────────
    const { systemPrompt, userMessage, sanitizedQuery } = buildSynthesisPrompt(
        taskType,
        governed.events,
        governed.correlations,
        conflicts,
        userQuery
    );

    // Collect packet IDs
    const packetIds = [
        ...governed.events.map(e => e.event_id),
        ...governed.correlations.map(c => c.insight_id),
    ];

    // ── Step 7: Call adapter ──────────────────────────────────────────────────
    const startMs = Date.now();
    let adapterResponse: AdapterResponse;

    try {
        if (tier === 'LOCAL') {
            adapterResponse = await callLocalModel(systemPrompt, userMessage, SYNTHESIS_TEMPERATURE, modelId);
        } else {
            adapterResponse = await callCloudModel(systemPrompt, userMessage, SYNTHESIS_TEMPERATURE, modelId);
        }
    } catch (err: any) {
        const code = err?.code ?? 'ADAPTER_FAILED';
        const isTimeout = code === 'LOCAL_TIMEOUT' || code === 'CLOUD_TIMEOUT';

        const auditMeta: SynthesisAuditMetadata = {
            reasoningTier: taskType, packetIds, modelTier: tier, modelId,
            latencyMs: Date.now() - startMs, suppressionFlag: false,
            conflictCount: conflicts.length, cloudRoutingEnabled: isCloudRoutingEnabled(),
            status: isTimeout ? 'timeout' : 'error',
        };
        await writeSynthesisAuditRecord({
            projectId, userQuery, sanitizedQuery,
            metadata: auditMeta, narrationStatus: 'failed', errorCode: code,
        });

        return {
            status: isTimeout ? 'timeout' : 'rejected',
            message: err?.message ?? 'Model adapter call failed.',
            supportingPacketIds: packetIds,
            conflictSummary: conflicts,
            generatedAt: now,
        };
    }

    // ── Step 8: Causation guard ───────────────────────────────────────────────
    const causationResult = checkCausation(adapterResponse.text);
    if (!causationResult.passed) {
        const auditMeta: SynthesisAuditMetadata = {
            reasoningTier: taskType, packetIds, modelTier: tier, modelId: adapterResponse.modelId,
            latencyMs: adapterResponse.latencyMs, suppressionFlag: true,
            conflictCount: conflicts.length, cloudRoutingEnabled: isCloudRoutingEnabled(),
            status: 'causation_violation',
        };
        await writeSynthesisAuditRecord({
            projectId, userQuery, sanitizedQuery,
            metadata: auditMeta, narrationStatus: 'causation_violation',
            errorCode: 'CAUSATION_VIOLATION',
        });

        return {
            status: 'causation_violation',
            message: `Response suppressed: model used causal language ("${causationResult.violatingPhrase}"). VistaraBI only states correlation, not causation.`,
            supportingPacketIds: packetIds,
            conflictSummary: conflicts,
            generatedAt: now,
        };
    }

    // ── Step 9: Cross-packet numeric guard ────────────────────────────────────
    const guardResult = validateNumericClaims(
        adapterResponse.text,
        [...governed.events, ...governed.correlations],
        'This synthesized insight could not be validated against the available statistical evidence and was suppressed.'
    );

    const isSuppressed = guardResult.status === 'suppressed';
    const finalStatus = isSuppressed ? 'suppressed' : 'success';

    // ── Step 10: Write audit record (unconditional) ───────────────────────────
    const auditMeta: SynthesisAuditMetadata = {
        reasoningTier: taskType, packetIds, modelTier: tier,
        modelId: adapterResponse.modelId,
        latencyMs: adapterResponse.latencyMs,
        suppressionFlag: isSuppressed,
        conflictCount: conflicts.length,
        cloudRoutingEnabled: isCloudRoutingEnabled(),
        status: finalStatus,
    };
    await writeSynthesisAuditRecord({
        projectId, userQuery, sanitizedQuery,
        metadata: auditMeta, narrationStatus: finalStatus,
    });

    // ── Step 11: Return result ────────────────────────────────────────────────
    return {
        status: finalStatus,
        reasoningTier: taskType,
        narrative: isSuppressed ? undefined : guardResult.explanation,
        message: isSuppressed ? guardResult.message : undefined,
        supportingPacketIds: packetIds,
        conflictSummary: conflicts,
        modelMetadata: {
            tier,
            routing: tier === 'LOCAL' ? 'local' : 'cloud',
            latencyMs: adapterResponse.latencyMs,
            suppression: isSuppressed,
        },
        generatedAt: now,
    };
}
