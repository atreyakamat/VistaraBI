// Module 6A — Main Entry Point
// handleAskAI() orchestrates the full NL -> Validated JSON Command -> Execution pipeline.
// This is the ONLY function that should be called from the API route.

import { hydrateDashboard } from '@/lib/dashboard-state/state-engine';
import type { DashboardCardState } from '@/lib/dashboard-state/types';
import db from '@/lib/prisma';
import { buildContext, computeDatasetVersionId, contextToPromptString } from './context-builder';
import { callLLM, LLMCallError } from './llm-client';
import { runValidationPipeline } from './validation-pipeline';
import { generateIntentId, checkDuplicate } from './idempotency';
import { executeCommand } from './execution-bridge';
import { writeAuditRecord } from './audit-log';
import { MODULE6_ERROR_CODES } from './types';
import type { Module6Response, AuditRecord, Module6ErrorPayload } from './types';
import type { AIRoutingMode } from '@/lib/ai/ai-mode';

// ─── Query Normalization ──────────────────────────────────────────────────────

/**
 * Normalize user query for deterministic hashing.
 * Lowercase, trim, collapse whitespace, strip leading punctuation.
 */
function normalizeQuery(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^[^a-z0-9]+/, '');
}

// ─── Session + KPI Context Loader ─────────────────────────────────────────────

interface SessionContext {
    stateId: string;
    stateVersion: number;
    datasetVersionId: string;
    domain: string;
    eligibleKPIs: Array<{ id: string; name: string; category: string; unit: string | null }>;
    dimensions: string[];
    availableFilters: string[];
}

async function loadSessionContext(projectId: string): Promise<SessionContext | null> {
    const state = await hydrateDashboard(projectId);
    if (!state) return null;

    // Load ApprovedKPIs for this project's blueprint
    const blueprint = await (db as any).kPIBlueprint.findUnique({
        where: { projectId },
        include: {
            kpis: {
                select: { id: true, name: true, category: true, unit: true },
            },
        },
    });

    const eligibleKPIs = (blueprint?.kpis ?? []) as Array<{ id: string; name: string; category: string; unit: string | null }>;

    // Load dimensions from domain context or column schema
    // Dimensions = all group-by candidate columns (from schema or domain detection)
    const domainContext = await (db as any).domainContext?.findUnique?.({ where: { projectId } })
        ?? null;

    const dimensions: string[] = (domainContext?.dimensions as string[] ?? []) ?? state.cards.map((c: DashboardCardState) => c.groupBy).filter((g): g is string => !!g) ?? [];
    const availableFilters: string[] = (domainContext?.availableFilters as string[] ?? []) ?? [];

    const kpiIds = eligibleKPIs.map(k => k.id);
    const datasetVersionId = computeDatasetVersionId(projectId, state.version, kpiIds);

    return {
        stateId: state.id,
        stateVersion: state.version,
        datasetVersionId,
        domain: state.domain,
        eligibleKPIs,
        dimensions,
        availableFilters,
    };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Full Module 6A pipeline:
 *
 * 1. Load session + validate it exists
 * 2. Normalize query
 * 3. Generate pre-LLM intent_id
 * 4. Idempotency check — return early if already successful
 * 5. Build immutable context snapshot
 * 6. Call LLM (1 attempt, no retries)
 * 7. Run 5-stage validation pipeline
 * 8. Execute via bridge
 * 9. Write audit log (always)
 * 10. Return Module6Response
 */
export async function handleAskAI(
    projectId: string,
    sessionId: string,
    rawUserQuery: string,
    userId?: string,
    preferLocal?: boolean,
    routingMode?: AIRoutingMode
): Promise<Module6Response> {
    const normalizedQuery = normalizeQuery(rawUserQuery);

    // Step 1: Load session
    let sessionCtx: SessionContext | null;
    try {
        sessionCtx = await loadSessionContext(projectId);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            status: 'rejected',
            message: 'Failed to load dashboard session.',
            intent_id: 'unknown',
            error: {
                code: MODULE6_ERROR_CODES.SESSION_NOT_FOUND,
                message: msg,
                recoverable: false,
            },
        };
    }

    if (!sessionCtx) {
        return {
            status: 'rejected',
            message: 'No dashboard state found for this project. Run Module 5A first.',
            intent_id: 'unknown',
            error: {
                code: MODULE6_ERROR_CODES.SESSION_NOT_FOUND,
                message: `No dashboard state for project "${projectId}"`,
                recoverable: false,
            },
        };
    }

    // Step 2-3: Generate intent ID (pre-LLM)
    const intentId = generateIntentId(
        normalizedQuery,
        sessionCtx.datasetVersionId,
        sessionId
    );

    // Step 4: Idempotency check
    const dupCheck = await checkDuplicate(intentId);
    if (dupCheck.isDuplicate) {
        return {
            status: 'already_processed',
            message: 'This request was already processed successfully.',
            intent_id: intentId,
        };
    }

    // Step 5: Build context
    const context = buildContext({
        projectId,
        state: await hydrateDashboard(projectId) as Awaited<ReturnType<typeof hydrateDashboard>> & {},
        intentId,
        eligibleKPIs: sessionCtx.eligibleKPIs,
        dimensions: sessionCtx.dimensions,
        availableFilters: sessionCtx.availableFilters,
    });

    // Step 6: Call LLM
    let llmRawOutput: string | undefined;
    try {
        llmRawOutput = await callLLM(rawUserQuery, contextToPromptString(context), preferLocal, routingMode);
    } catch (err: unknown) {
        const code = err instanceof LLMCallError ? err.code : MODULE6_ERROR_CODES.LLM_CALL_FAILED;
        const message = err instanceof Error ? err.message : 'LLM call failed';

        const auditRecord: AuditRecord = {
            sessionId, userId, intentId,
            rawUserQuery, normalizedUserQuery: normalizedQuery,
            llmRawOutput: undefined,
            validationStagesPassed: 0,
            validationFailedAt: undefined,
            structuredCommand: undefined,
            executionStatus: 'rejected',
            errorCode: code,
            dashboardStateId: sessionCtx?.stateId,
            stateVersion: sessionCtx?.stateVersion,
        };
        await writeAuditRecord(auditRecord);

        return {
            status: 'rejected',
            message: 'The AI service is temporarily unavailable.',
            intent_id: intentId,
            error: { code, message, recoverable: true },
        };
    }

    // Step 7: 5-stage validation pipeline
    const pipeline = runValidationPipeline(llmRawOutput, context, intentId);

    if (!pipeline.success) {
        const auditRecord: AuditRecord = {
            sessionId, userId, intentId,
            rawUserQuery, normalizedUserQuery: normalizedQuery,
            llmRawOutput,
            validationStagesPassed: pipeline.stagesPassed,
            validationFailedAt: pipeline.failedAt,
            structuredCommand: undefined,
            executionStatus: 'rejected',
            errorCode: pipeline.errorCode,
            dashboardStateId: sessionCtx.stateId,
            stateVersion: sessionCtx.stateVersion,
        };
        await writeAuditRecord(auditRecord);

        return {
            status: 'rejected',
            message: `Command rejected at ${pipeline.failedAt}: ${pipeline.errorMessage}`,
            intent_id: intentId,
            error: {
                code: pipeline.errorCode ?? MODULE6_ERROR_CODES.SCHEMA_VIOLATION,
                message: pipeline.errorMessage ?? 'Validation failed',
                recoverable: false,
                stage: pipeline.failedAt,
            },
        };
    }

    // Step 8: Execute via bridge
    const execution = await executeCommand(projectId, pipeline.command!);

    const executionStatus = execution.success ? 'success' : 'execution_failed';

    // Step 9: Write audit log (unconditional)
    const auditRecord: AuditRecord = {
        sessionId, userId, intentId,
        rawUserQuery, normalizedUserQuery: normalizedQuery,
        llmRawOutput,
        validationStagesPassed: pipeline.stagesPassed,
        validationFailedAt: undefined,
        structuredCommand: pipeline.command,
        executionStatus,
        errorCode: execution.error?.code,
        dashboardStateId: sessionCtx.stateId,
        stateVersion: (execution.data as any)?.stateVersion ?? sessionCtx.stateVersion,
    };
    await writeAuditRecord(auditRecord);

    // Step 10: Return response
    if (!execution.success) {
        return {
            status: 'execution_failed',
            message: execution.error?.message ?? 'Execution failed',
            intent_id: intentId,
            error: execution.error,
        };
    }

    return {
        status: 'success',
        message: `Done — ${pipeline.command!.action} completed successfully.`,
        intent_id: intentId,
        data: execution.data,
    };
}
