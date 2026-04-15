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
import { matchKPIsForDomain } from './kpi-matcher';

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

    const computableMatches = matches.filter(m => m.isComputable);
    const partialMatches = matches.filter(m => !m.isComputable);

    const mapToDiscovered = (match: any): DiscoveredKPI => {
        // Map semantic roles in aggregations to actual physical columns found during matching
        const resolvedAggregations = match.kpi.aggregationRules.map((agg: any) => {
            const columnMatch = match.matchedColumns.find((mc: any) => mc.requiredColumn === agg.column);
            return {
                function: agg.function,
                column: columnMatch ? columnMatch.columnName : agg.column
            };
        });

        // Resolve the formula template placeholders to actual column names
        let formulaExpression = match.kpi.formulaTemplate;
        match.matchedColumns.forEach((mc: any) => {
            // First try braced format if it exists (e.g. {revenue})
            const braced = new RegExp(`\\{${mc.requiredColumn}\\}`, 'g');
            formulaExpression = formulaExpression.replace(braced, mc.columnName);
            // Then try word boundary format (e.g. SUM(revenue))
            const wordBoundary = new RegExp(`\\b${mc.requiredColumn}\\b`, 'g');
            formulaExpression = formulaExpression.replace(wordBoundary, mc.columnName);
        });

        return {
            id: randomUUID(),
            projectId,
            kpiId: match.kpi.id,
            kpiName: match.kpi.name,
            domain,
            confidence: match.confidence,
            matchType: match.matchType,
            explanation: match.kpi.description,
            matchedColumns: match.matchedColumns.map((c: any) => c.columnName),
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
