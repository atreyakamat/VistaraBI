// Module 6A — Validation Pipeline
// 5-stage sequential pipeline. Any stage failure stops the pipeline immediately.
// No stage silently corrects input. All errors are structured and named.

import { parseCommandSchema } from './command-schema';
import { verifyIntentId } from './idempotency';
import { MODULE6_ERROR_CODES } from './types';
import type {
    Module6Command,
    Module6Context,
    PipelineResult,
    ValidationStage,
} from './types';

// ─── Security Patterns ────────────────────────────────────────────────────────
// Reject any output containing these patterns regardless of structure.

const SECURITY_PATTERNS: RegExp[] = [
    /\bSELECT\b/i,
    /\bFROM\b/i,
    /\bWHERE\b/i,
    /\bJOIN\b/i,
    /;/,               // SQL statement terminator
    /\.\.\//,          // Path traversal
    /\$\{/,            // Template literal injection
    /\bDROP\b/i,
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
];

// ─── Stage 1: Parse Guard ─────────────────────────────────────────────────────

function stage1Parse(rawOutput: string): {
    ok: true;
    parsed: unknown;
} | { ok: false; code: string; message: string } {
    let cleaned = rawOutput.trim();

    // Strip ```json ... ``` fences if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
    }

    if (!cleaned.startsWith('{')) {
        return {
            ok: false,
            code: MODULE6_ERROR_CODES.INVALID_JSON,
            message: 'LLM output does not start with a JSON object',
        };
    }

    try {
        const parsed = JSON.parse(cleaned);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.NOT_AN_OBJECT,
                message: 'Parsed JSON is not a plain object',
            };
        }
        return { ok: true, parsed };
    } catch {
        return {
            ok: false,
            code: MODULE6_ERROR_CODES.INVALID_JSON,
            message: 'LLM output is not valid JSON',
        };
    }
}

// ─── Stage 2: Schema Validation ──────────────────────────────────────────────

function stage2Schema(parsed: unknown): {
    ok: true;
    command: Module6Command;
} | { ok: false; code: string; message: string } {
    const result = parseCommandSchema(parsed);

    if (!result.success) {
        const first = result.errors[0];
        return {
            ok: false,
            code: MODULE6_ERROR_CODES.SCHEMA_VIOLATION,
            message: `Schema violation at "${first.field}": ${first.message}`,
        };
    }

    // Double-check ai_generated (Zod already enforces this, but belt-and-suspenders)
    if (result.command.ai_generated !== true) {
        return {
            ok: false,
            code: MODULE6_ERROR_CODES.AI_GENERATED_FALSE,
            message: 'ai_generated must be boolean true',
        };
    }

    return { ok: true, command: result.command as Module6Command };
}

// ─── Stage 3: DCO Validation ─────────────────────────────────────────────────

function stage3DCO(
    command: Module6Command,
    context: Module6Context
): { ok: true } | { ok: false; code: string; message: string } {
    // dataset_version_id must match the signed snapshot
    if (command.dataset_version_id !== context.dataset_version_id) {
        return {
            ok: false,
            code: MODULE6_ERROR_CODES.STALE_DATASET_VERSION,
            message: `dataset_version_id mismatch: command has "${command.dataset_version_id}", expected "${context.dataset_version_id}"`,
        };
    }

    // kpi_id must exist in eligible KPIs
    if (command.kpi_id) {
        const eligibleIds = new Set(context.eligible_kpis.map(k => k.id));
        if (!eligibleIds.has(command.kpi_id)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.UNKNOWN_KPI,
                message: `kpi_id "${command.kpi_id}" is not in eligible_kpis`,
            };
        }
    }

    // group_by must be in dimensions
    if (command.group_by) {
        const dimSet = new Set(context.dimensions);
        if (!dimSet.has(command.group_by)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.UNKNOWN_DIMENSION,
                message: `group_by "${command.group_by}" is not in available dimensions`,
            };
        }
    }

    // filter keys must all be in available_filters
    if (command.filters) {
        const filterSet = new Set(context.available_filters);
        for (const key of Object.keys(command.filters)) {
            if (!filterSet.has(key)) {
                return {
                    ok: false,
                    code: MODULE6_ERROR_CODES.UNKNOWN_FILTER,
                    message: `Filter key "${key}" is not in available_filters`,
                };
            }
        }
    }

    // Validate COMPARE kpi_ids
    if (command.comparison) {
        const eligibleIds = new Set(context.eligible_kpis.map(k => k.id));
        if (!eligibleIds.has(command.comparison.kpi_id_a)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.UNKNOWN_KPI,
                message: `comparison.kpi_id_a "${command.comparison.kpi_id_a}" is not in eligible_kpis`,
            };
        }
        if (!eligibleIds.has(command.comparison.kpi_id_b)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.UNKNOWN_KPI,
                message: `comparison.kpi_id_b "${command.comparison.kpi_id_b}" is not in eligible_kpis`,
            };
        }
    }

    return { ok: true };
}

// ─── Stage 4: Security Scan ──────────────────────────────────────────────────

function stage4Security(
    command: Module6Command
): { ok: true } | { ok: false; code: string; message: string } {
    const serialized = JSON.stringify(command);

    for (const pattern of SECURITY_PATTERNS) {
        if (pattern.test(serialized)) {
            return {
                ok: false,
                code: MODULE6_ERROR_CODES.SECURITY_VIOLATION,
                message: `Security pattern "${pattern.source}" matched in command payload`,
            };
        }
    }

    return { ok: true };
}

// ─── Stage 5: Idempotency Gate ───────────────────────────────────────────────

function stage5Idempotency(
    command: Module6Command,
    expectedIntentId: string
): { ok: true } | { ok: false; code: string; message: string } {
    const tamperingCode = verifyIntentId(command.intent_id, expectedIntentId);
    if (tamperingCode) {
        return {
            ok: false,
            code: tamperingCode,
            message: `intent_id mismatch: LLM altered the hash. Expected "${expectedIntentId}", got "${command.intent_id}"`,
        };
    }

    return { ok: true };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

const STAGE_ORDER: ValidationStage[] = [
    'STAGE_1_PARSE',
    'STAGE_2_SCHEMA',
    'STAGE_3_DCO',
    'STAGE_4_SECURITY',
    'STAGE_5_IDEMPOTENCY',
];

/**
 * Run all 5 validation stages in sequence.
 * Returns PipelineResult — never throws.
 */
export function runValidationPipeline(
    rawLLMOutput: string,
    context: Module6Context,
    expectedIntentId: string
): PipelineResult {
    let stagesPassed = 0;
    let command: Module6Command | undefined;
    let parsed: unknown;

    // Stage 1: Parse
    const s1 = stage1Parse(rawLLMOutput);
    if (!s1.ok) {
        return { success: false, stagesPassed: 0, failedAt: 'STAGE_1_PARSE', errorCode: s1.code, errorMessage: s1.message };
    }
    parsed = s1.parsed;
    stagesPassed = 1;

    // Stage 2: Schema
    const s2 = stage2Schema(parsed);
    if (!s2.ok) {
        return { success: false, stagesPassed: 1, failedAt: 'STAGE_2_SCHEMA', errorCode: s2.code, errorMessage: s2.message };
    }
    command = s2.command;
    stagesPassed = 2;

    // Stage 3: DCO
    const s3 = stage3DCO(command, context);
    if (!s3.ok) {
        return { success: false, stagesPassed: 2, failedAt: 'STAGE_3_DCO', errorCode: s3.code, errorMessage: s3.message };
    }
    stagesPassed = 3;

    // Stage 4: Security
    const s4 = stage4Security(command);
    if (!s4.ok) {
        return { success: false, stagesPassed: 3, failedAt: 'STAGE_4_SECURITY', errorCode: s4.code, errorMessage: s4.message };
    }
    stagesPassed = 4;

    // Stage 5: Idempotency
    const s5 = stage5Idempotency(command, expectedIntentId);
    if (!s5.ok) {
        return { success: false, stagesPassed: 4, failedAt: 'STAGE_5_IDEMPOTENCY', errorCode: s5.code, errorMessage: s5.message };
    }
    stagesPassed = 5;

    return { success: true, command, stagesPassed };
}
