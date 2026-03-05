// Module 6E — Types
// All type definitions for the Unified Intelligence Synthesis layer.
// Module 6E is purely interpretive — it never mutates dashboard state,
// never recomputes statistics, and never calls statistics-core.

import type { EventEvidencePacket, ConfidenceLevel } from '@/lib/module-6/events/types';
import type { CorrelationEvidencePacket, CorrelationConfidenceLevel } from '@/lib/module-6/correlations/types';
import type { ModelTier, ModelAuditMetadata } from '@/lib/module-6/infrastructure/types';

// Re-export packet types for convenience
export type { EventEvidencePacket, CorrelationEvidencePacket };

// ─── Synthesis Task Classification ────────────────────────────────────────────

export type SynthesisTaskType =
    | 'SINGLE_PACKET_SUMMARY'
    | 'MULTI_PACKET_SYNTHESIS'
    | 'CORRELATION_CLUSTER_ANALYSIS'
    | 'STRATEGIC_FINANCIAL_OVERVIEW'
    | 'RISK_SIGNAL_SYNTHESIS'
    | 'UNSUPPORTED_SCOPE';

/** Static synthesis tier routing */
export const SYNTHESIS_TIER_MAP: Record<Exclude<SynthesisTaskType, 'UNSUPPORTED_SCOPE'>, ModelTier> = {
    SINGLE_PACKET_SUMMARY: 'LOCAL',
    MULTI_PACKET_SYNTHESIS: 'LOCAL',
    CORRELATION_CLUSTER_ANALYSIS: 'LOCAL',
    STRATEGIC_FINANCIAL_OVERVIEW: 'CLOUD',
    RISK_SIGNAL_SYNTHESIS: 'CLOUD',
};

export const SYNTHESIS_TEMPERATURE = 0.1;  // Uniform for all synthesis tiers

// ─── Conflict Detection ───────────────────────────────────────────────────────

export type ConflictType =
    | 'DIRECTIONAL_INCONSISTENCY'
    | 'CONFIDENCE_MISMATCH'
    | 'LAG_MISALIGNMENT'
    | 'VOLATILITY_MISMATCH';

export type ConflictSeverity = 'high' | 'moderate' | 'low';

export interface ConflictDescriptor {
    type: ConflictType;
    kpiIds: string[];
    description: string;
    severity: ConflictSeverity;
}

// ─── Synthesis Input ──────────────────────────────────────────────────────────

export interface SynthesisInput {
    events: EventEvidencePacket[];
    correlations: CorrelationEvidencePacket[];
    userQuery: string;
}

// ─── Governance Result ────────────────────────────────────────────────────────

export interface GovernanceResult {
    events: EventEvidencePacket[];
    correlations: CorrelationEvidencePacket[];
    removedCount: number;
    reason?: string;  // Populated if all packets removed
}

// ─── Synthesis Result ─────────────────────────────────────────────────────────

export type SynthesisStatus = 'success' | 'suppressed' | 'rejected' | 'timeout' | 'causation_violation';

export interface SynthesisResult {
    status: SynthesisStatus;
    reasoningTier?: SynthesisTaskType;
    narrative?: string;                 // LLM output (only on success)
    message?: string;                   // Human-readable for all non-success statuses
    supportingPacketIds: string[];
    conflictSummary: ConflictDescriptor[];
    modelMetadata?: {
        tier: ModelTier;
        routing: 'local' | 'cloud';
        latencyMs: number;
        suppression: boolean;
    };
    generatedAt: string;  // ISO timestamp
}

// ─── Synthesis Audit Metadata ─────────────────────────────────────────────────

export interface SynthesisAuditMetadata {
    reasoningTier: SynthesisTaskType;
    packetIds: string[];
    modelTier: ModelTier;
    modelId: string;
    latencyMs: number;
    suppressionFlag: boolean;
    conflictCount: number;
    cloudRoutingEnabled: boolean;
    status: string;
}

// ─── Causation Guard Result ───────────────────────────────────────────────────

export interface CausationGuardResult {
    passed: boolean;
    violatingPhrase?: string;
}
