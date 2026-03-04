// Module 6C — KPI Pair Validator
// Enforces all preconditions before any correlation is attempted.
// Returns a structured rejection code — never silently skips validation steps.
// No statistical work is done here. This is a pure eligibility gate.

import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import {
    COMPOSABLE_AGGREGATIONS,
    LAG_ELIGIBLE_GRAINS,
    CORRELATION_THRESHOLDS,
} from './types';
import type { KPIPairValidationResult, KPIPairRejectionCode } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reject(
    code: KPIPairRejectionCode,
    reason: string
): KPIPairValidationResult {
    return { valid: false, reason, rejectionCode: code };
}

/**
 * Derive whether a KPI is correlation-eligible from its lineage aggregation list.
 * SUM, COUNT, COUNT_DISTINCT are composable (additive).
 * AVG, MIN, MAX are non-composable — cannot be safely combined across time.
 *
 * A KPI is eligible if at least one of its aggregation functions is composable.
 */
function isComposable(result: EnrichedKPIResult): boolean {
    const aggs = result.lineage?.aggregations ?? [];
    if (aggs.length === 0) return true; // No aggregation info → assume eligible
    return aggs.some(a => COMPOSABLE_AGGREGATIONS.has(a.toUpperCase?.() ?? a));
}

/**
 * Validate join path between two KPIs using their KPILineage source tables.
 * Rejects if:
 *  - They share no common source table (unrelated data)
 *  - Any join in either lineage is marked MANY_TO_MANY
 */
function validateJoinPath(
    kpiA: EnrichedKPIResult,
    kpiB: EnrichedKPIResult
): { valid: boolean; code?: KPIPairRejectionCode; reason?: string } {
    const tablesA = new Set(kpiA.lineage?.tables ?? []);
    const tablesB = new Set(kpiB.lineage?.tables ?? []);

    // Check for a shared source table — at minimum, they need to draw from related data
    const hasSharedTable = [...tablesA].some(t => tablesB.has(t));

    if (!hasSharedTable && tablesA.size > 0 && tablesB.size > 0) {
        return {
            valid: false,
            code: 'NO_JOIN_PATH',
            reason: `KPIs "${kpiA.kpiName}" and "${kpiB.kpiName}" draw from unrelated source tables with no common join path.`,
        };
    }

    // Check for MANY_TO_MANY joins — makes correlation unstable
    const joinsA = kpiA.lineage?.joins ?? [];
    const joinsB = kpiB.lineage?.joins ?? [];
    const allJoins = [...joinsA, ...joinsB];

    for (const join of allJoins) {
        if (typeof join === 'object' && join !== null && 'type' in join) {
            if ((join as any).type === 'MANY_TO_MANY' || (join as any).joinType === 'MANY_TO_MANY') {
                return {
                    valid: false,
                    code: 'MANY_TO_MANY_JOIN',
                    reason: 'Correlation is not supported for KPI pairs with MANY:MANY join relationships.',
                };
            }
        }
    }

    return { valid: true };
}

// ─── Main Gate ────────────────────────────────────────────────────────────────

/**
 * Validate a KPI pair for correlation eligibility.
 *
 * Priority of checks:
 *  1. Same KPI rejection
 *  2. Both KPIs exist in enriched results
 *  3. Grain eligibility
 *  4. Composable aggregation check
 *  5. Data sufficiency (dataset.length >= MIN_OBSERVATIONS)
 *  6. Join path validation
 */
export function validateKPIPair(
    kpiAId: string,
    kpiBId: string,
    grain: string,
    enrichedResults: EnrichedKPIResult[]
): KPIPairValidationResult {
    // 1. Reject same-KPI comparison
    if (kpiAId === kpiBId) {
        return reject('SAME_KPI', 'Cannot correlate a KPI with itself.');
    }

    // 2. Both KPIs must exist in the snapshot
    const kpiA = enrichedResults.find(r => r.kpiId === kpiAId);
    if (!kpiA) {
        return reject('KPI_NOT_FOUND', `KPI "${kpiAId}" was not found in the current dashboard snapshot.`);
    }
    const kpiB = enrichedResults.find(r => r.kpiId === kpiBId);
    if (!kpiB) {
        return reject('KPI_NOT_FOUND', `KPI "${kpiBId}" was not found in the current dashboard snapshot.`);
    }

    // 3. Grain eligibility — lags require monthly or quarterly
    if (!LAG_ELIGIBLE_GRAINS.has(grain)) {
        return reject(
            'GRAIN_INELIGIBLE',
            `Correlation requires monthly or quarterly granularity. Current grain: "${grain}".`
        );
    }

    // 4. Composable aggregation check
    if (!isComposable(kpiA)) {
        return reject(
            'NOT_COMPOSABLE',
            `KPI "${kpiA.kpiName}" uses a non-composable aggregation (AVG/MIN/MAX) and cannot be correlated across time periods.`
        );
    }
    if (!isComposable(kpiB)) {
        return reject(
            'NOT_COMPOSABLE',
            `KPI "${kpiB.kpiName}" uses a non-composable aggregation (AVG/MIN/MAX) and cannot be correlated across time periods.`
        );
    }

    // 5. Data sufficiency
    const nA = kpiA.dataset?.length ?? 0;
    const nB = kpiB.dataset?.length ?? 0;

    if (nA < CORRELATION_THRESHOLDS.MIN_OBSERVATIONS) {
        return reject(
            'INSUFFICIENT_DATA_A',
            `KPI "${kpiA.kpiName}" has only ${nA} observations. Minimum required: ${CORRELATION_THRESHOLDS.MIN_OBSERVATIONS}.`
        );
    }
    if (nB < CORRELATION_THRESHOLDS.MIN_OBSERVATIONS) {
        return reject(
            'INSUFFICIENT_DATA_B',
            `KPI "${kpiB.kpiName}" has only ${nB} observations. Minimum required: ${CORRELATION_THRESHOLDS.MIN_OBSERVATIONS}.`
        );
    }

    // 6. Join path validation
    const joinCheck = validateJoinPath(kpiA, kpiB);
    if (!joinCheck.valid) {
        return reject(joinCheck.code!, joinCheck.reason!);
    }

    return {
        valid: true,
        kpiA,
        kpiB,
        unitA: kpiA.unit ?? 'unknown',
        unitB: kpiB.unit ?? 'unknown',
    };
}
