// Module 6D — Types
// All type definitions for the Tiered Model Routing & Orchestration layer.
// Module 6D is purely interpretive — it never mutates dashboard state.

import type { CorrelationEvidencePacket } from '@/lib/module-6c/types';
import type { EventEvidencePacket } from '@/lib/module-6b/types';

// ─── Reasoning Task Classification ────────────────────────────────────────────

/**
 * Server-side deterministic task classification.
 * The model NEVER decides its own tier — the backend classifies based on execution path.
 */
export type ReasoningTaskType =
    | 'INTENT_TRANSLATION'       // Tier 1 — JSON command translation (Module 6A)
    | 'EVENT_NARRATION'          // Tier 2 — Deterministic event explanation (Module 6B)
    | 'CORRELATION_EXPLANATION'  // Tier 2 — Bounded correlation interpretation (Module 6C)
    | 'ADVANCED_SYNTHESIS'       // Tier 3 — Cross-KPI synthesis (Module 6D, cloud)
    | 'STRATEGIC_SUMMARY'        // Tier 3 — Domain-aware strategic summary (Module 6D, cloud)
    | 'UNSUPPORTED';             // Rejected — out-of-scope request

/** Which infrastructure tier the model runs on */
export type ModelTier = 'LOCAL' | 'CLOUD';

// ─── Model Tier Routing Map ───────────────────────────────────────────────────

/** Static, locked tier assignment. Only modified by configuration review. */
export const TASK_TIER_MAP: Record<Exclude<ReasoningTaskType, 'UNSUPPORTED'>, ModelTier> = {
    INTENT_TRANSLATION: 'LOCAL',
    EVENT_NARRATION: 'LOCAL',
    CORRELATION_EXPLANATION: 'LOCAL',
    ADVANCED_SYNTHESIS: 'CLOUD',
    STRATEGIC_SUMMARY: 'CLOUD',
};

// ─── Model Configuration ──────────────────────────────────────────────────────

export const LOCAL_MODEL_ID = 'qwen3:8b';
export const CLOUD_MODEL_ID = 'qwen-max';

export const TASK_TEMPERATURE_MAP: Record<Exclude<ReasoningTaskType, 'UNSUPPORTED'>, number> = {
    INTENT_TRANSLATION: 0.0,   // Zero-temp for JSON schema compliance
    EVENT_NARRATION: 0.1,
    CORRELATION_EXPLANATION: 0.1,
    ADVANCED_SYNTHESIS: 0.1,
    STRATEGIC_SUMMARY: 0.1,
};

export const LOCAL_TIMEOUT_MS = 500;
export const CLOUD_TIMEOUT_MS = 2000;
export const MAX_TOKENS = 800;
export const MAX_QUERY_LENGTH = 500;  // chars, after sanitization

// ─── Adapter Response ─────────────────────────────────────────────────────────

/** Unified response shape from both LocalModelAdapter and CloudModelAdapter */
export interface AdapterResponse {
    text: string;
    modelId: string;          // e.g. 'qwen3:8b' or 'qwen-max'
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
}

// ─── Model Audit Metadata ─────────────────────────────────────────────────────

/** Appended to every reasoning audit record. Reconstructs which model produced which insight. */
export interface ModelAuditMetadata {
    taskType: ReasoningTaskType;
    modelTier: ModelTier;
    modelId: string;
    temperature: number;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
    status: 'success' | 'suppressed' | 'timeout' | 'error';
}

// ─── Evidence Input ───────────────────────────────────────────────────────────

/** Either evidence packet type accepted as input */
export type EvidenceInput = CorrelationEvidencePacket | EventEvidencePacket;

// ─── Classification Context ───────────────────────────────────────────────────

/** Additional context for task classification decisions */
export interface ClassificationContext {
    hasMultipleKPIs?: boolean;     // Required for ADVANCED_SYNTHESIS
    hasValidatedCorrelations?: boolean;
    domainContext?: string;
}

// ─── Reasoning Result ─────────────────────────────────────────────────────────

export type ReasoningStatus = 'success' | 'suppressed' | 'rejected' | 'timeout';

export interface ReasoningResult {
    status: ReasoningStatus;
    explanation?: string;          // LLM output (only on success)
    message?: string;              // Human-readable for all non-success statuses
    evidence?: EvidenceInput;
    /** Internal analytics only — UI must NEVER display modelId to user */
    modelMetadata?: ModelAuditMetadata;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class ModelCallError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly recoverable: boolean = false
    ) {
        super(message);
        this.name = 'ModelCallError';
    }
}
