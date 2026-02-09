// KPI Lineage Registry - Module 4D-B
// Orchestrates KPI lineage tracing, storage, and retrieval

import { randomUUID } from 'crypto';
import db, {
    KPILineageEntry,
    KPILineageRegistry,
    KPISourceContribution,
    KPIAggregation,
    KPIJoinPath,
    ApprovedKPI,
    RelationshipEntry,
} from '@/lib/prisma';
import { getRelationshipRegistry } from './relationship-registry';
import {
    generateExplanations,
    generateQuickExplanation,
    ExplanationContext,
} from './explanation-generator';
import { normalizeColumnName } from '@/lib/intelligence/columns';

// Aggregation function patterns in formulas
const AGGREGATION_PATTERNS: { regex: RegExp; func: KPIAggregation['function'] }[] = [
    { regex: /SUM\s*\(\s*([^)]+)\s*\)/gi, func: 'SUM' },
    { regex: /AVG\s*\(\s*([^)]+)\s*\)/gi, func: 'AVG' },
    { regex: /AVERAGE\s*\(\s*([^)]+)\s*\)/gi, func: 'AVG' },
    { regex: /COUNT\s*\(\s*DISTINCT\s+([^)]+)\s*\)/gi, func: 'COUNT_DISTINCT' },
    { regex: /COUNT\s*\(\s*([^)]+)\s*\)/gi, func: 'COUNT' },
    { regex: /MIN\s*\(\s*([^)]+)\s*\)/gi, func: 'MIN' },
    { regex: /MAX\s*\(\s*([^)]+)\s*\)/gi, func: 'MAX' },
];

// Parse formula to extract aggregations
function parseAggregations(formula: string, columnToSource: Map<string, string>): KPIAggregation[] {
    const aggregations: KPIAggregation[] = [];

    for (const { regex, func } of AGGREGATION_PATTERNS) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(formula)) !== null) {
            const column = match[1].trim();
            const sourceId = columnToSource.get(column.toLowerCase()) || 'unknown';

            aggregations.push({
                function: func,
                column,
                sourceId,
            });
        }
    }

    return aggregations;
}

// Extract columns referenced in a formula
function extractColumnsFromFormula(formula: string): string[] {
    const cleaned = formula
        .replace(/SUM|AVG|AVERAGE|COUNT|MIN|MAX|DISTINCT/gi, '')
        .replace(/[()*/+-]/g, ' ')
        .replace(/\d+/g, ' ');

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    return words.filter(w => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(w));
}

// Find which source contains a column
function findSourceForColumn(
    column: string,
    sources: { id: string; name: string; columns: string[] }[]
): { sourceId: string; sourceName: string } | null {
    const lowerCol = column.toLowerCase();

    for (const source of sources) {
        if (source.columns.some(c => c.toLowerCase() === lowerCol)) {
            return { sourceId: source.id, sourceName: source.name };
        }
    }

    return null;
}

// Find join paths from 4D-A relationship registry
function findJoinPaths(
    sourceIds: string[],
    relationships: RelationshipEntry[]
): KPIJoinPath[] {
    const joinPaths: KPIJoinPath[] = [];

    // Find relationships that connect our sources
    for (let i = 0; i < sourceIds.length; i++) {
        for (let j = i + 1; j < sourceIds.length; j++) {
            const sourceA = sourceIds[i];
            const sourceB = sourceIds[j];

            // Look for direct relationship
            const rel = relationships.find(
                r => (r.sourceTableId === sourceA && r.targetTableId === sourceB) ||
                    (r.sourceTableId === sourceB && r.targetTableId === sourceA)
            );

            if (rel) {
                joinPaths.push({
                    relationshipId: rel.id,
                    sourceTable: rel.sourceTableName.replace(/\.[^.]+$/, ''),
                    sourceColumn: rel.sourceColumn,
                    targetTable: rel.targetTableName.replace(/\.[^.]+$/, ''),
                    targetColumn: rel.targetColumn,
                    joinType: 'INNER',
                    confidence: rel.confidence,
                });
            }
        }
    }

    return joinPaths;
}

// Trace lineage for a single KPI
async function traceKPILineage(
    projectId: string,
    kpi: ApprovedKPI,
    sources: { id: string; name: string; columns: string[] }[],
    relationships: RelationshipEntry[],
    useAI: boolean
): Promise<KPILineageEntry> {
    console.log('[KPILineageRegistry] Tracing:', kpi.kpiName);

    // Build column to source mapping
    const columnToSource = new Map<string, string>();
    for (const source of sources) {
        for (const col of source.columns) {
            columnToSource.set(col.toLowerCase(), source.id);
        }
    }

    // Extract columns from formula
    const formulaColumns = extractColumnsFromFormula(kpi.formula);
    const allColumns = [...new Set([...kpi.matchedColumns, ...formulaColumns])];

    // Find sources for each column
    const sourceContributions = new Map<string, KPISourceContribution>();

    for (const col of allColumns) {
        const sourceInfo = findSourceForColumn(col, sources);
        if (sourceInfo) {
            if (!sourceContributions.has(sourceInfo.sourceId)) {
                sourceContributions.set(sourceInfo.sourceId, {
                    sourceId: sourceInfo.sourceId,
                    sourceName: sourceInfo.sourceName,
                    columns: [],
                    role: 'PRIMARY',
                });
            }
            sourceContributions.get(sourceInfo.sourceId)!.columns.push(col);
        }
    }

    // Determine roles
    const sourcesList = Array.from(sourceContributions.values());
    if (sourcesList.length > 1) {
        for (let i = 1; i < sourcesList.length; i++) {
            sourcesList[i].role = 'JOINED';
        }
    }

    // Find join paths from 4D-A registry
    const sourceIds = sourcesList.map(s => s.sourceId);
    const joinPaths = findJoinPaths(sourceIds, relationships);

    // Parse aggregations
    const aggregations = parseAggregations(kpi.formula, columnToSource);

    // Mark sources with aggregations
    for (const agg of aggregations) {
        const source = sourcesList.find(s => s.sourceId === agg.sourceId);
        if (source) {
            source.role = 'AGGREGATED';
        }
    }

    // Generate explanations
    const context: ExplanationContext = {
        kpiName: kpi.kpiName,
        formula: kpi.formula,
        domain: (kpi as any).domainContext?.detectedDomain || 'Unknown',
        category: kpi.category,
        sources: sourcesList,
        joins: joinPaths,
        aggregations,
    };

    const explanations = useAI
        ? await generateExplanations(context, true)
        : generateQuickExplanation(context);

    return {
        id: `kpil-${randomUUID()}`,
        projectId,
        kpiId: kpi.kpiId,
        kpiName: kpi.kpiName,
        domain: (kpi as any).domainContext?.detectedDomain || 'Unknown',
        formula: kpi.formula,
        category: kpi.category,
        sources: sourcesList,
        joinPaths,
        aggregations,
        technicalExplanation: explanations.technical,
        businessExplanation: explanations.business,
        aiEnhanced: explanations.aiEnhanced,
        confidence: kpi.confidence,
        tracedAt: new Date(),
    };
}

// Build full KPI lineage registry for a project
export async function buildKPILineageRegistry(
    projectId: string,
    useAI: boolean = true
): Promise<KPILineageRegistry> {
    console.log('[KPILineageRegistry] ========================================');
    console.log('[KPILineageRegistry] Building registry for project:', projectId);
    console.log('[KPILineageRegistry] AI enhancement:', useAI ? 'enabled' : 'disabled');
    console.log('[KPILineageRegistry] ========================================');

    // Get KPI blueprint
    const blueprint = await db.kpiBlueprint.findUnique({ where: { projectId } });
    if (!blueprint || !blueprint.kpis || blueprint.kpis.length === 0) {
        console.log('[KPILineageRegistry] No KPIs in blueprint');
        return createEmptyRegistry(projectId);
    }

    // Get sources
    const sources = await db.source.findMany({ where: { projectId } });
    const readySources = sources
        .filter(s => s.status === 'READY')
        .map(s => ({ id: s.id, name: s.fileName, columns: s.columns }));

    // Get relationship registry from 4D-A
    const relRegistry = await getRelationshipRegistry(projectId);
    const relationships = relRegistry?.entries || [];

    console.log('[KPILineageRegistry] Found', (blueprint.kpis as ApprovedKPI[]).length, 'KPIs');
    console.log('[KPILineageRegistry] Found', relationships.length, 'relationships from 4D-A');

    // Trace each KPI
    const entries: KPILineageEntry[] = [];
    let singleTableCount = 0;
    let multiTableCount = 0;
    let aiEnhancedCount = 0;

    for (const kpi of blueprint.kpis as ApprovedKPI[]) {
        const entry = await traceKPILineage(projectId, kpi, readySources, relationships, useAI);
        entries.push(entry);

        if (entry.joinPaths.length === 0) {
            singleTableCount++;
        } else {
            multiTableCount++;
        }
        if (entry.aiEnhanced) {
            aiEnhancedCount++;
        }
    }

    // Create registry
    const registry: KPILineageRegistry = {
        id: `kpilr-${randomUUID()}`,
        projectId,
        entries,
        generatedAt: new Date(),
        version: 1,
        stats: {
            totalKPIs: entries.length,
            singleTableKPIs: singleTableCount,
            multiTableKPIs: multiTableCount,
            aiEnhancedCount,
        },
    };

    // Store in database
    await storeKPILineageRegistry(registry);

    console.log('[KPILineageRegistry] ========================================');
    console.log('[KPILineageRegistry] Registry complete:', entries.length, 'KPIs traced');
    console.log('[KPILineageRegistry]   Single-table:', singleTableCount);
    console.log('[KPILineageRegistry]   Multi-table:', multiTableCount);
    console.log('[KPILineageRegistry]   AI-enhanced:', aiEnhancedCount);
    console.log('[KPILineageRegistry] ========================================');

    return registry;
}

// Create empty registry
function createEmptyRegistry(projectId: string): KPILineageRegistry {
    return {
        id: `kpilr-${randomUUID()}`,
        projectId,
        entries: [],
        generatedAt: new Date(),
        version: 1,
        stats: {
            totalKPIs: 0,
            singleTableKPIs: 0,
            multiTableKPIs: 0,
            aiEnhancedCount: 0,
        },
    };
}

// Store registry in database
async function storeKPILineageRegistry(registry: KPILineageRegistry): Promise<void> {
    await db.kpiLineageRegistry.upsert({
        where: { projectId: registry.projectId },
        data: registry,
    });
    console.log('[KPILineageRegistry] Stored registry for project:', registry.projectId);
}

// Get existing registry
export async function getKPILineageRegistry(projectId: string): Promise<KPILineageRegistry | null> {
    return await db.kpiLineageRegistry.findUnique({ where: { projectId } });
}

// Get or build registry
export async function getOrBuildKPILineageRegistry(
    projectId: string,
    forceRebuild: boolean = false,
    useAI: boolean = true
): Promise<KPILineageRegistry> {
    if (!forceRebuild) {
        const existing = await getKPILineageRegistry(projectId);
        if (existing) {
            console.log('[KPILineageRegistry] Returning cached registry');
            return existing;
        }
    }

    return await buildKPILineageRegistry(projectId, useAI);
}

// Get lineage for a specific KPI
export async function getKPILineage(projectId: string, kpiId: string): Promise<KPILineageEntry | null> {
    const registry = await getKPILineageRegistry(projectId);
    if (!registry) return null;

    return registry.entries.find(e => e.kpiId === kpiId) || null;
}

// Explain a specific KPI (main API for "How is this KPI calculated?")
export async function explainKPI(projectId: string, kpiId: string): Promise<{
    kpiId: string;
    kpiName: string;
    domain: string;
    formula: string;
    technicalExplanation: string;
    businessExplanation: string;
    sources: string[];
    joins: { from: string; to: string; via: string }[];
    aggregations: { function: string; column: string }[];
} | null> {
    const lineage = await getKPILineage(projectId, kpiId);
    if (!lineage) return null;

    return {
        kpiId: lineage.kpiId,
        kpiName: lineage.kpiName,
        domain: lineage.domain,
        formula: lineage.formula,
        technicalExplanation: lineage.technicalExplanation,
        businessExplanation: lineage.businessExplanation,
        sources: lineage.sources.map(s => s.sourceName.replace(/\.[^.]+$/, '')),
        joins: lineage.joinPaths.map(j => ({
            from: j.sourceTable,
            to: j.targetTable,
            via: `${j.sourceColumn} = ${j.targetColumn}`,
        })),
        aggregations: lineage.aggregations.map(a => ({
            function: a.function,
            column: a.column,
        })),
    };
}
