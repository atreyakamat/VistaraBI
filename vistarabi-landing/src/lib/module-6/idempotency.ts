// Module 6A — Idempotency
// Intent ID generation and duplicate-execution detection.
// Pre-LLM hash: SHA-256(normalizedQuery + datasetVersion + sessionId)
// Post-validation: re-hash including command body to detect tampering.

import { createHash } from 'crypto';
import db from '@/lib/prisma';
import { MODULE6_ERROR_CODES } from './types';
import type { Module6Command } from './types';

// ─── Intent ID Generation ─────────────────────────────────────────────────────

/**
 * Generate a deterministic intent ID before calling the LLM.
 * This becomes the idempotency key for the entire pipeline run.
 *
 * Inputs:
 *  - normalizedQuery: lowercased, trimmed user query
 *  - datasetVersionId: current snapshot hash (from context-builder)
 *  - sessionId: authenticated session identifier
 */
export function generateIntentId(
    normalizedQuery: string,
    datasetVersionId: string,
    sessionId: string
): string {
    return createHash('sha256')
        .update(`${normalizedQuery}|${datasetVersionId}|${sessionId}`)
        .digest('hex');
}

// ─── Post-Validation Hash ─────────────────────────────────────────────────────

/**
 * Re-hash the validated command body together with the pre-LLM hash.
 * If the LLM modified intent_id or dataset_version_id, this will mismatch.
 *
 * Returns the expected post-hash. Compare against command.intent_id.
 */
export function computePostHash(
    preIntentId: string,
    command: Module6Command
): string {
    // Stable serialization: sorted keys
    const commandStr = JSON.stringify(command, Object.keys(command).sort());
    return createHash('sha256')
        .update(`${preIntentId}|${commandStr}`)
        .digest('hex');
}

/**
 * Verify that the command's intent_id matches the pre-LLM hash.
 * (Note: we do NOT re-verify the post-hash at this stage because the LLM
 * is supposed to echo the intent_id verbatim — Stage 5 checks the pre-hash only.)
 *
 * Returns error code if mismatch, null if valid.
 */
export function verifyIntentId(
    commandIntentId: string,
    expectedIntentId: string
): string | null {
    if (commandIntentId !== expectedIntentId) {
        return MODULE6_ERROR_CODES.INTENT_ID_TAMPERING;
    }
    return null;
}

// ─── Duplicate Check ──────────────────────────────────────────────────────────

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    previousStatus?: string;
}

/**
 * Check if this intent_id has already been successfully processed.
 * If yes, caller must return `already_processed` without re-executing.
 */
export async function checkDuplicate(intentId: string): Promise<DuplicateCheckResult> {
    try {
        const existing = await (db as any).auditLog.findUnique({
            where: { intentId },
            select: { executionStatus: true },
        });

        if (!existing) {
            return { isDuplicate: false };
        }

        // Only treat previous success as a duplicate worth short-circuiting
        // A previous rejection allows the user to retry (they likely fixed their query)
        if (existing.executionStatus === 'success') {
            return { isDuplicate: true, previousStatus: existing.executionStatus };
        }

        return { isDuplicate: false };
    } catch {
        // If audit log is unreachable, fail open (allow execution, just can't check)
        console.warn('[Module6A/idempotency] Audit log check failed — proceeding without dedup');
        return { isDuplicate: false };
    }
}
