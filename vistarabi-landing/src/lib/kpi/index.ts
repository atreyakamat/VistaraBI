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
    matchType: 'RULE_BASED' | 'FORMULA' | 'AI_ASSISTED';
    explanation: string;
    matchedColumns: string[];
    formulaExpression: string;
    category: string;
    priority: number;
    isComputable: boolean;
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

// Convert column to a KPI-like item for display
function columnToKPI(column: string, projectId: string, domain: DomainType, index: number): DiscoveredKPI {
    // Determine category based on column name
    const lowerCol = column.toLowerCase();
    let category = 'volume';
    let formula = `SUM(${column})`;

    if (lowerCol.includes('revenue') || lowerCol.includes('price') || lowerCol.includes('amount') || lowerCol.includes('sales')) {
        category = 'revenue';
        formula = `SUM(${column})`;
    } else if (lowerCol.includes('cost') || lowerCol.includes('expense')) {
        category = 'cost';
        formula = `SUM(${column})`;
    } else if (lowerCol.includes('count') || lowerCol.includes('qty') || lowerCol.includes('quantity')) {
        category = 'volume';
        formula = `SUM(${column})`;
    } else if (lowerCol.includes('rate') || lowerCol.includes('percent') || lowerCol.includes('ratio')) {
        category = 'performance';
        formula = `AVG(${column})`;
    } else if (lowerCol.includes('date') || lowerCol.includes('time')) {
        category = 'operations';
        formula = `COUNT(DISTINCT ${column})`;
    } else if (lowerCol.includes('customer') || lowerCol.includes('user') || lowerCol.includes('client')) {
        category = 'customer';
        formula = `COUNT(DISTINCT ${column})`;
    } else if (lowerCol.includes('id') || lowerCol.includes('order') || lowerCol.includes('transaction')) {
        category = 'volume';
        formula = `COUNT(${column})`;
    }

    return {
        id: randomUUID(),
        projectId,
        kpiId: `col-${column.replace(/[^a-zA-Z0-9]/g, '-')}`,
        kpiName: column,
        domain,
        confidence: 100,
        matchType: 'RULE_BASED',
        explanation: `Column available in your data. Suggested formula: ${formula}`,
        matchedColumns: [column],
        formulaExpression: formula,
        category,
        priority: index + 1,
        isComputable: true,
        discoveredAt: new Date(),
    };
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

    // Convert columns to KPI format for display
    const computableKPIs = columns.map((col, idx) => columnToKPI(col, projectId, domain, idx));

    const result: KPIDiscoveryResult = {
        projectId,
        domain,
        totalKPIsAnalyzed: columns.length,
        computableKPIs,
        partialKPIs: [],
        availableColumns: columns,
        sampleData,
        discoveredAt: new Date(),
    };

    const dbData = {
        ...result,
        computableKPIs: result.computableKPIs as any,
        partialKPIs: result.partialKPIs as any,
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
