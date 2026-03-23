/**
 * blueprint-loader.ts
 * Central helper for loading the KPI Blueprint with all relational data.
 * All consumers in Module 4 and Module 5 MUST use this — never raw db.kPIBlueprint.findUnique()
 * without the full include, as it will miss aggregations and lineage.
 */

import db from '@/lib/prisma';
import type { ApprovedKPIWithRelations, BlueprintWithKPIs } from '@/lib/prisma';

export type { ApprovedKPIWithRelations, BlueprintWithKPIs };

// ─── Loader ──────────────────────────────────────────────────────────────────

const KPI_INCLUDE = {
    aggregations: true,
    groupBys: true,
    lineage: true,
} as const;

/**
 * Load the KPI Blueprint with all relational data (aggregations, lineage, groupBys).
 * Returns null if no blueprint exists for the project.
 */
export async function loadBlueprintWithKPIs(projectId: string): Promise<BlueprintWithKPIs | null> {
    return db.kPIBlueprint.findUnique({
        where: { projectId },
        include: { kpis: { include: KPI_INCLUDE } },
    }) as Promise<BlueprintWithKPIs | null>;
}

// ─── Serializer ──────────────────────────────────────────────────────────────

/**
 * Serialize an ApprovedKPIWithRelations into a flat JSON-safe shape
 * compatible with the frontend and legacy execution engine consumers.
 */
export function flattenKPI(kpi: ApprovedKPIWithRelations) {
    return {
        id: kpi.kpiLibraryId || kpi.id,      // Prefer library reference ID (e.g. 'ec-001')
        dbId: kpi.id,                          // Internal DB UUID
        name: kpi.name,
        category: kpi.category,
        sourceTable: kpi.sourceTable,
        aggregations: kpi.aggregations.map(a => ({
            function: a.function as string,
            column: a.column,
        })),
        groupBy: kpi.groupBys.length > 0 ? kpi.groupBys[0].column : null,
        lineage: kpi.lineage
            ? {
                formula: kpi.lineage.formula,
                tables: kpi.lineage.tables as string[],
                joins: kpi.lineage.joins as unknown[],
            }
            : null,
        addedAt: kpi.createdAt,
    };
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate that an incoming KPI payload (from API POST) has required fields.
 * Throws if invalid — call this in API routes before touching the DB.
 */
export function validateKPIPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
        throw new Error('KPI payload must be an object');
    }

    const p = payload as Record<string, unknown>;

    if (!p.id || typeof p.id !== 'string') {
        throw new Error('KPI payload must include a string id (library reference)');
    }
    if (!p.name || typeof p.name !== 'string') {
        throw new Error('KPI payload must include a string name');
    }
    if (!Array.isArray(p.aggregations) || p.aggregations.length === 0) {
        throw new Error('KPI payload must include at least one aggregation rule');
    }
    for (const agg of p.aggregations as unknown[]) {
        if (!agg || typeof agg !== 'object') {
            throw new Error('Each aggregation rule must be an object');
        }
        const a = agg as Record<string, unknown>;
        if (!a.function || !a.column) {
            throw new Error('Each aggregation rule must specify function and column');
        }
    }
    if (!p.sourceTable) {
        throw new Error('KPI payload must specify a sourceTable');
    }
}

// ─── Aggregation Function Mapping ────────────────────────────────────────────

/**
 * Map a string aggregation function name to the Prisma-accepted enum string.
 * Accepts common aliases like DISTINCT_COUNT → COUNT_DISTINCT.
 */
export function toAggregationFunction(fn: string): string {
    const map: Record<string, string> = {
        SUM: 'SUM',
        COUNT: 'COUNT',
        COUNT_DISTINCT: 'COUNT_DISTINCT',
        DISTINCT_COUNT: 'COUNT_DISTINCT',
        AVG: 'AVG',
        AVERAGE: 'AVG',
        MIN: 'MIN',
        MAX: 'MAX',
    };
    const mapped = map[fn?.toUpperCase()];
    if (!mapped) {
        console.warn(`[Blueprint] Unknown aggregation function "${fn}", defaulting to SUM`);
        return 'SUM';
    }
    return mapped;
}
