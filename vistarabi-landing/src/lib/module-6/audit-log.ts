// Module 6A — Audit Log
// Append-only write of every AI command attempt.
// NEVER updates/deletes records. One record per intent_id.
// This is the source of truth for idempotency and debugging.

import db from '@/lib/prisma';
import type { AuditRecord } from './types';

/**
 * Write a single audit record to the AuditLog table.
 *
 * Rules:
 * - Always called, even on failure — the audit log is unconditional
 * - Uses create (not upsert) — each intent_id is unique, enforced by DB constraint
 * - If the write itself fails, logs to console but does NOT re-throw
 *   (audit failure must not mask the real response to the user)
 */
export async function writeAuditRecord(record: AuditRecord): Promise<void> {
    try {
        await (db as any).auditLog.create({
            data: {
                sessionId: record.sessionId,
                userId: record.userId ?? null,
                intentId: record.intentId,
                rawUserQuery: record.rawUserQuery.slice(0, 2000),
                normalizedUserQuery: record.normalizedUserQuery.slice(0, 2000),
                llmRawOutput: record.llmRawOutput
                    ? record.llmRawOutput.slice(0, 4000)
                    : null,
                validationStagesPassed: record.validationStagesPassed,
                validationFailedAt: record.validationFailedAt ?? null,
                structuredCommand: record.structuredCommand
                    ? JSON.parse(JSON.stringify(record.structuredCommand)) // deep clone, ensure plain object
                    : null,
                executionStatus: record.executionStatus,
                errorCode: record.errorCode ?? null,
                dashboardStateId: record.dashboardStateId ?? null,
                stateVersion: record.stateVersion ?? null,
            },
        });
    } catch (err: any) {
        // Log but never propagate — audit failure must not affect the user response
        console.error('[Module6A/audit] Failed to write audit record:', err.message ?? err);
    }
}

/**
 * Read an audit record by intentId.
 * Used by idempotency check and debugging.
 * Returns null if no record found.
 */
export async function readAuditRecord(intentId: string): Promise<AuditRecord | null> {
    try {
        const row = await (db as any).auditLog.findUnique({
            where: { intentId },
        });
        if (!row) return null;

        return {
            sessionId: row.sessionId,
            userId: row.userId ?? undefined,
            intentId: row.intentId,
            rawUserQuery: row.rawUserQuery,
            normalizedUserQuery: row.normalizedUserQuery,
            llmRawOutput: row.llmRawOutput ?? undefined,
            validationStagesPassed: row.validationStagesPassed,
            validationFailedAt: row.validationFailedAt ?? undefined,
            structuredCommand: row.structuredCommand ?? undefined,
            executionStatus: row.executionStatus,
            errorCode: row.errorCode ?? undefined,
        };
    } catch {
        return null;
    }
}
