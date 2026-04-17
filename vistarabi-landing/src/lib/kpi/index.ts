// KPI Discovery Orchestrator
// Module 4 Phase 4A - Fixed to show actual column data

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import { getGovernedDomain } from '@/lib/domain/governance';

export interface DiscoveredKPI {
    id: string;
    projectId: string;
    kpiId: string;
    kpiName: string;
    domain: DomainType;
    confidence: number;
    matchType: string;
    explanation: string;
    matchedColumns: string[];
    formulaExpression: string;
    category: string;
    priority: number;
    isComputable: boolean;
    supportStatus?: string;
    aggregations?: { function: string; column: string }[];
    discoveredAt: Date;
}

export interface KPIDiscoveryResult {
    projectId: string;
    domain: DomainType;
    totalKPIsAnalyzed: number;
    computableKPIs: DiscoveredKPI[];
    partialKPIs: DiscoveredKPI[];
    availableColumns: string[];
    sampleData: Record<string, unknown>[];
    discoveredAt: Date;
}

// Gather all columns and sample data from project sources
async function getProjectData(projectId: string): Promise<{ columns: string[]; sampleData: Record<string, unknown>[] }> {
    const sources = await db.source.findMany({ where: { projectId } });
    console.log('[KPI] Found sources for project:', projectId, 'count:', sources.length);

    const allColumns: Set<string> = new Set();
    const sampleData: Record<string, unknown>[] = [];

    for (const source of sources) {
        if (source.columns) {
            source.columns.forEach(col => allColumns.add(col));
        }
        // Get first 10 rows from each source
        if (source.data && Array.isArray(source.data)) {
            const data = source.data as unknown as Record<string, unknown>[];
            console.log('[KPI] Source:', source.fileName, 'columns:', source.columns?.length || 0, 'rows:', data.length || 0);
            sampleData.push(...data.slice(0, 10));
        }
    }

    console.log('[KPI] Total columns:', allColumns.size, 'sample rows:', sampleData.length);
    return {
        columns: Array.from(allColumns),
        sampleData: sampleData.slice(0, 10), // Max 10 rows total for AI context
    };
}

// Remove columnToKPI raw fallback function!
import { matchKPIsForDomain, type KPIMatch, type ColumnMatch } from './kpi-matcher';

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Escape a string so it can be safely used as a literal pattern inside RegExp.
 * Without this, column names like "user-id" or "net.revenue" would create
 * broken regex that mismatches or throws at runtime.
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Custom error for formula resolution failures.
 * Thrown when a {placeholder} remains after the full mapping loop,
 * preventing invalid SQL from reaching the database.
 */
export class SemanticResolutionError extends Error {
    constructor(public readonly unresolvedPlaceholders: string[], kpiName: string) {
        super(
            `[SemanticResolution] KPI "${kpiName}" has unresolved formula placeholders: ` +
            `${unresolvedPlaceholders.map(p => `{${p}}`).join(', ')}. ` +
            `Ensure all required columns are present in the dataset.`
        );
        this.name = 'SemanticResolutionError';
    }
}

// Main discovery function - returns actual columns as KPIs
export async function discoverKPIs(projectId: string): Promise<KPIDiscoveryResult | null> {
    console.log('[KPI-Discovery] Starting for project:', projectId);

    // Get governed domain
    const governance = await getGovernedDomain(projectId);
    if (!governance?.activeDomain) {
        console.log('[KPI-Discovery] No governed domain found');
        return null;
    }

    const domain = governance.activeDomain;
    console.log('[KPI-Discovery] Domain:', domain);

    // Get project columns and sample data
    const { columns, sampleData } = await getProjectData(projectId);

    if (columns.length === 0) {
        console.log('[KPI-Discovery] No columns to analyze');
        return null;
    }

    // Instead of raw columns array, use the Headless Domain Matcher
    const matches = matchKPIsForDomain(domain, columns);

    const rawComputableMatches = matches.filter(m => m.isComputable);
    const partialMatches = matches.filter(m => !m.isComputable);

    // FIX C2: Skip KPIs requiring cross-source joins until the join compiler is complete.
    // Cross-table columns use dot-notation (e.g., "orders.revenue") in aggregation rules.
    // Without join execution these would silently return wrong single-table scalars.
    const hasCrossSourceJoins = (match: KPIMatch) =>
        match.kpi.aggregationRules.some((a: { function: string; column: string }) =>
            a.column.includes('.')
        );

    // FIX H1: Reject any KPI where the same physical column fills two different requiredField slots.
    // Example: dataset has only "amount" which matches both "revenue" AND "cost" roles.
    // This would produce SUM(amount)/SUM(amount) = 1.0 — a silent wrong answer.
    const hasDoubleFilledColumn = (match: KPIMatch) => {
        const physicalCols = match.matchedColumns.map(mc => mc.columnName);
        return physicalCols.length !== new Set(physicalCols).size;
    };

    const computableMatches = rawComputableMatches
        .filter(m => !hasCrossSourceJoins(m))
        .filter(m => !hasDoubleFilledColumn(m));

    if (rawComputableMatches.length !== computableMatches.length) {
        console.log(
            `[KPI-Discovery] Filtered ${rawComputableMatches.length - computableMatches.length} KPIs ` +
            `(cross-join or double-fill): ${rawComputableMatches.length} → ${computableMatches.length} computable`
        );
    }

    const mapToDiscovered = (match: KPIMatch): DiscoveredKPI => {
        // Map semantic roles in aggregations to actual physical columns found during matching.
        // De-duplicate by requiredColumn — prevents sending duplicate aggregation rules
        // to the SQL compiler when multiple physical columns match the same semantic role.
        const seenRoles = new Set<string>();
        const resolvedAggregations = match.kpi.aggregationRules
            .filter((agg: { function: string; column: string }) => {
                if (seenRoles.has(agg.column)) return false;
                seenRoles.add(agg.column);
                return true;
            })
            .map((agg: { function: string; column: string }) => {
                const columnMatch = match.matchedColumns.find(
                    (mc: ColumnMatch) => mc.requiredColumn === agg.column
                );
                return {
                    function: agg.function,
                    column: columnMatch ? columnMatch.columnName : agg.column,
                };
            });

        // Resolve the formula template placeholders to actual column names.
        // Use escapeRegExp so column names with special chars (hyphens, dots) parse correctly.
        let formulaExpression = match.kpi.formulaTemplate;
        match.matchedColumns.forEach((mc: ColumnMatch) => {
            // Braced format: {revenue} → physical_column
            const braced = new RegExp(`\\{${escapeRegExp(mc.requiredColumn)}\\}`, 'g');
            formulaExpression = formulaExpression.replace(braced, mc.columnName);
            // Word-boundary format: SUM(revenue) → SUM(physical_column)
            const wordBoundary = new RegExp(`\\b${escapeRegExp(mc.requiredColumn)}\\b`, 'g');
            formulaExpression = formulaExpression.replace(wordBoundary, mc.columnName);
        });

        // ACTION 2: Strict Resolution Check — throw SemanticResolutionError if any
        // {placeholder} remains. This prevents broken SQL like
        // "SUM({revenue}) / COUNT(order_id)" from reaching PostgreSQL.
        const remainingPlaceholders = [...formulaExpression.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
        if (remainingPlaceholders.length > 0) {
            // For partial matches we warn instead of throw so UI can still show the KPI as PARTIAL.
            // Only throw for COMPUTABLE KPIs where we commit to running SQL.
            if (match.isComputable) {
                throw new SemanticResolutionError(remainingPlaceholders, match.kpi.name);
            } else {
                console.warn(
                    `[SemanticResolution] KPI "${match.kpi.name}" has unresolved placeholders ` +
                    `(non-computable, skipping throw): ${remainingPlaceholders.join(', ')}`
                );
            }
        }

        return {
            id: randomUUID(),
            projectId,
            kpiId: match.kpi.id,
            kpiName: match.kpi.name,
            domain,
            confidence: match.confidence,
            matchType: match.matchType,
            explanation: match.kpi.description,
            matchedColumns: match.matchedColumns.map((c: ColumnMatch) => c.columnName),
            formulaExpression,
            category: match.kpi.category,
            priority: match.kpi.priority,
            isComputable: match.isComputable,
            supportStatus: match.supportStatus,
            aggregations: resolvedAggregations,
            discoveredAt: new Date(),
        };
    };

    const computableKPIs: DiscoveredKPI[] = computableMatches.map(mapToDiscovered);
    const partialKPIs: DiscoveredKPI[] = partialMatches.map(mapToDiscovered);

    const result: KPIDiscoveryResult = {
        projectId,
        domain,
        totalKPIsAnalyzed: columns.length,
        computableKPIs,
        partialKPIs,
        availableColumns: columns,
        sampleData,
        discoveredAt: new Date(),
    };

    const dbData = {
        ...result,
        computableKPIs: result.computableKPIs as any,
        partialKPIs: result.partialKPIs as any,
        sampleData: result.sampleData as any,
    };

    // Store results
    await db.kPIDiscovery.upsert({
        where: { projectId },
        create: dbData,
        update: dbData,
    });

    console.log('[KPI-Discovery] Complete. Columns as KPIs:', computableKPIs.length);

    return result;
}

// Get existing discovery results
export async function getKPIDiscovery(projectId: string): Promise<KPIDiscoveryResult | null> {
    return await db.kPIDiscovery.findUnique({ where: { projectId } }) as KPIDiscoveryResult | null;
}

// Get sample data for AI context
export async function getSampleDataForAI(projectId: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    const { columns, sampleData } = await getProjectData(projectId);
    return { columns, rows: sampleData };
}

// Re-export from submodules
export * from './derived-kpi-library';
export * from './ai-kpi-discovery';
