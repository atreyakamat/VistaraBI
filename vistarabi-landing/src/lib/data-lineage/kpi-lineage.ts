// KPI Lineage Tracer - Module 4D
// Traces KPI data flow from raw sources to calculated metrics

import db, {
    KPILineage,
    KPISourceContribution,
    KPIJoin,
    KPIAggregation,
    EntityRelationshipGraph,
    ApprovedKPI,
} from '@/lib/prisma';
import { buildEntityGraph, findEntityPath } from './relationship-graph';

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
        // Reset regex state
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
    // Remove aggregation functions and operators
    const cleaned = formula
        .replace(/SUM|AVG|AVERAGE|COUNT|MIN|MAX|DISTINCT/gi, '')
        .replace(/[()*/+-]/g, ' ')
        .replace(/\d+/g, ' ');

    // Extract potential column names
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    // Filter to likely column names (alphanumeric with underscores)
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

// Generate human-readable explanation for a KPI
function generateExplanation(
    kpiName: string,
    formula: string,
    sources: KPISourceContribution[],
    joins: KPIJoin[],
    aggregations: KPIAggregation[]
): string {
    const parts: string[] = [];

    // Describe what is being calculated
    if (aggregations.length > 0) {
        const aggDescriptions = aggregations.map(agg => {
            const source = sources.find(s => s.sourceId === agg.sourceId);
            const sourceName = source?.sourceName?.replace(/\.[^.]+$/, '') || 'data';

            switch (agg.function) {
                case 'SUM':
                    return `summing '${agg.column}' from ${sourceName}`;
                case 'AVG':
                    return `averaging '${agg.column}' from ${sourceName}`;
                case 'COUNT':
                    return `counting '${agg.column}' from ${sourceName}`;
                case 'COUNT_DISTINCT':
                    return `counting unique '${agg.column}' values from ${sourceName}`;
                case 'MIN':
                    return `finding minimum '${agg.column}' from ${sourceName}`;
                case 'MAX':
                    return `finding maximum '${agg.column}' from ${sourceName}`;
                default:
                    return `processing '${agg.column}'`;
            }
        });

        parts.push(`Calculated by ${aggDescriptions.join(' and ')}`);
    } else {
        // Non-aggregated formula
        const sourceNames = sources.map(s => s.sourceName.replace(/\.[^.]+$/, '')).join(', ');
        parts.push(`Computed from columns in ${sourceNames}`);
    }

    // Describe joins if multiple sources
    if (joins.length > 0) {
        const joinDescriptions = joins.map(j => {
            const leftName = sources.find(s => s.sourceId === j.leftSource)?.sourceName?.replace(/\.[^.]+$/, '') || 'source';
            const rightName = sources.find(s => s.sourceId === j.rightSource)?.sourceName?.replace(/\.[^.]+$/, '') || 'source';
            return `${leftName} joined with ${rightName} on ${j.leftColumn} = ${j.rightColumn}`;
        });
        parts.push(joinDescriptions.join('; '));
    }

    // Add formula reference
    parts.push(`Formula: ${formula}`);

    return parts.join('. ') + '.';
}

// Trace lineage for a single KPI
export async function traceKPILineage(
    projectId: string,
    kpi: ApprovedKPI,
    entityGraph: EntityRelationshipGraph,
    sources: { id: string; name: string; columns: string[] }[]
): Promise<KPILineage> {
    console.log('[KPILineage] Tracing:', kpi.kpiName);

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

    // Determine roles (first source is PRIMARY, others are JOINED)
    const sourcesList = Array.from(sourceContributions.values());
    if (sourcesList.length > 1) {
        for (let i = 1; i < sourcesList.length; i++) {
            sourcesList[i].role = 'JOINED';
        }
    }

    // Find joins between sources
    const joins: KPIJoin[] = [];
    for (let i = 0; i < sourcesList.length - 1; i++) {
        for (let j = i + 1; j < sourcesList.length; j++) {
            // Look for path in entity graph
            const path = findEntityPath(entityGraph, sourcesList[i].sourceId, sourcesList[j].sourceId);
            if (path && path.length > 0) {
                const edge = path[0]; // Use direct connection
                joins.push({
                    leftSource: edge.fromNode,
                    rightSource: edge.toNode,
                    leftColumn: edge.joinCondition.fromColumn,
                    rightColumn: edge.joinCondition.toColumn,
                    joinType: 'INNER',
                });
            }
        }
    }

    // Parse aggregations
    const aggregations = parseAggregations(kpi.formula, columnToSource);

    // Mark sources with aggregations
    for (const agg of aggregations) {
        const source = sourcesList.find(s => s.sourceId === agg.sourceId);
        if (source) {
            source.role = 'AGGREGATED';
        }
    }

    // Generate explanation
    const explanation = generateExplanation(
        kpi.kpiName,
        kpi.formula,
        sourcesList,
        joins,
        aggregations
    );

    return {
        kpiId: kpi.kpiId,
        kpiName: kpi.kpiName,
        formula: kpi.formula,
        category: kpi.category,
        sources: sourcesList,
        joins,
        aggregations,
        explanation,
        confidence: kpi.confidence,
        tracedAt: new Date(),
    };
}

// Trace lineage for all KPIs in a project
export async function traceAllKPILineages(projectId: string): Promise<KPILineage[]> {
    console.log('[KPILineage] Tracing all KPIs for project:', projectId);

    // Get blueprint
    const blueprint = await db.kpiBlueprint.findUnique({ where: { projectId } });
    if (!blueprint || !blueprint.kpis || blueprint.kpis.length === 0) {
        console.log('[KPILineage] No KPIs in blueprint');
        return [];
    }

    // Get sources
    const sources = await db.source.findMany({ where: { projectId } });
    const readySources = sources
        .filter(s => s.status === 'READY')
        .map(s => ({ id: s.id, name: s.fileName, columns: s.columns }));

    // Build entity graph
    const entityGraph = await buildEntityGraph(projectId);

    // Trace each KPI
    const lineages: KPILineage[] = [];
    for (const kpi of blueprint.kpis as ApprovedKPI[]) {
        const lineage = await traceKPILineage(projectId, kpi, entityGraph, readySources);
        lineages.push(lineage);
    }

    console.log('[KPILineage] Traced', lineages.length, 'KPI lineages');
    return lineages;
}

// Get lineage for a specific KPI
export async function getKPILineage(projectId: string, kpiId: string): Promise<KPILineage | null> {
    const lineages = await traceAllKPILineages(projectId);
    return lineages.find(l => l.kpiId === kpiId) || null;
}
