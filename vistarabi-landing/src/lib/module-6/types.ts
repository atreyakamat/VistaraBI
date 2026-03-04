// Module 6A — Types
// All type definitions for the AI Command Layer.
// This file is the single source of truth for Module 6A contracts.

// ─── Action Enum ──────────────────────────────────────────────────────────────

export type Module6Action =
    | 'CREATE_CARD'
    | 'UPDATE_CARD'
    | 'DELETE_CARD'
    | 'APPLY_FILTER'
    | 'COMPARE'
    | 'DRILL_DOWN';

// ─── Command: validated output of the LLM + pipeline ─────────────────────────

export interface Module6Command {
    action: Module6Action;
    intent_id: string;              // SHA-256 hex of (query + datasetVersion + sessionId)
    ai_generated: true;             // Must always be literal true — never false
    dataset_version_id: string;     // Snapshot hash — validated against backend state
    target?: string;                // Card ID for UPDATE/DELETE
    kpi_id?: string;                // ApprovedKPI.id — must be in eligible_kpis
    group_by?: string;              // Dimension column — must be in dimensions
    filters?: Record<string, string | string[]>;  // Keys must be in available_filters
    chart_type?: 'bar' | 'line' | 'area' | 'table' | 'pie' | 'scatter';
    comparison?: {
        kpi_id_a: string;
        kpi_id_b: string;
        period?: 'monthly' | 'quarterly' | 'annual';
    };
    drill_config?: {
        dimension: string;
        value?: string;
    };
    natural_language_intent?: string;  // Max 500 chars — for human-readable audit trail
}

// ─── Context Snapshot: immutable, sanitized, sent to LLM ─────────────────────

export interface Module6Context {
    dataset_version_id: string;
    intent_id: string;
    eligible_kpis: Array<{
        id: string;
        name: string;
        category: string;
        unit: string;
    }>;
    dimensions: string[];               // Available group-by columns
    available_filters: string[];        // Filter keys allowed in command.filters
    current_dashboard_cards: Array<{
        card_id: string;
        kpi_id: string;
        kpi_name: string;
        chart_type: string;
    }>;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ValidationStage =
    | 'STAGE_1_PARSE'
    | 'STAGE_2_SCHEMA'
    | 'STAGE_3_DCO'
    | 'STAGE_4_SECURITY'
    | 'STAGE_5_IDEMPOTENCY';

export interface ValidationResult {
    passed: boolean;
    stage: ValidationStage;
    errorCode?: string;
    errorMessage?: string;
}

export interface PipelineResult {
    success: boolean;
    command?: Module6Command;
    stagesPassed: number;
    failedAt?: ValidationStage;
    errorCode?: string;
    errorMessage?: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface Module6ErrorPayload {
    code: string;          // e.g. "UNKNOWN_KPI", "SECURITY_VIOLATION", "INTENT_ID_TAMPERING"
    message: string;       // Human-readable — never a raw exception message
    recoverable: boolean;  // true = user can retry; false = hard rejection
    stage?: ValidationStage;
}

// ─── Execution Result ─────────────────────────────────────────────────────────

export interface ExecutionResult {
    success: boolean;
    action: Module6Action;
    data?: Record<string, unknown>;   // Action-specific result data
    error?: Module6ErrorPayload;
}

// ─── Frontend Contract ────────────────────────────────────────────────────────

export type Module6Status = 'success' | 'rejected' | 'already_processed' | 'execution_failed';

export interface Module6Response {
    status: Module6Status;
    message: string;        // Human-readable summary for chat UI
    intent_id: string;
    data?: Record<string, unknown>;
    error?: Module6ErrorPayload;
}

// ─── Audit Record ─────────────────────────────────────────────────────────────

export interface AuditRecord {
    sessionId: string;
    userId?: string;
    intentId: string;
    rawUserQuery: string;
    normalizedUserQuery: string;
    llmRawOutput?: string;
    validationStagesPassed: number;
    validationFailedAt?: ValidationStage;
    structuredCommand?: Module6Command;
    executionStatus: Module6Status;
    errorCode?: string;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export const MODULE6_ERROR_CODES = {
    // LLM
    LLM_CALL_FAILED: 'LLM_CALL_FAILED',
    LLM_TIMEOUT: 'LLM_TIMEOUT',

    // Stage 1 — Parse
    INVALID_JSON: 'INVALID_JSON',
    NOT_AN_OBJECT: 'NOT_AN_OBJECT',

    // Stage 2 — Schema
    SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
    AI_GENERATED_FALSE: 'AI_GENERATED_FALSE',

    // Stage 3 — DCO
    UNKNOWN_KPI: 'UNKNOWN_KPI',
    UNKNOWN_DIMENSION: 'UNKNOWN_DIMENSION',
    UNKNOWN_FILTER: 'UNKNOWN_FILTER',
    STALE_DATASET_VERSION: 'STALE_DATASET_VERSION',

    // Stage 4 — Security
    SECURITY_VIOLATION: 'SECURITY_VIOLATION',

    // Stage 5 — Idempotency
    INTENT_ID_TAMPERING: 'INTENT_ID_TAMPERING',
    DUPLICATE_INTENT: 'DUPLICATE_INTENT',

    // Execution
    EXECUTION_FAILED: 'EXECUTION_FAILED',
    UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION',

    // System
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    MISSING_API_KEY: 'MISSING_API_KEY',
} as const;

export type Module6ErrorCode = typeof MODULE6_ERROR_CODES[keyof typeof MODULE6_ERROR_CODES];
