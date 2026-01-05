// KPI Discovery Orchestrator
// Module 4 Phase 4A

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import { getGovernedDomain } from '@/lib/domain/governance';
import { matchKPIsForDomain, getComputableKPIs, KPIMatch } from './kpi-matcher';

export type { KPIDefinition } from './kpi-library';
export { getKPIsForDomain, getAllKPIs, KPI_LIBRARY } from './kpi-library';
export { matchKPIsForDomain, getComputableKPIs } from './kpi-matcher';

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
    discoveredAt: Date;
}

// Gather all columns from project sources
async function getProjectColumns(projectId: string): Promise<string[]> {
    const sources = await db.source.findMany({ where: { projectId } });
    const allColumns: Set<string> = new Set();

    for (const source of sources) {
        if (source.columns) {
            source.columns.forEach(col => allColumns.add(col));
        }
    }

    return Array.from(allColumns);
}

// Convert KPIMatch to DiscoveredKPI
function matchToDiscoveredKPI(match: KPIMatch, projectId: string): DiscoveredKPI {
    const matchedColNames = match.matchedColumns.map(m =>
        `${m.columnName} → ${m.requiredColumn}`
    );

    const explanation = match.isComputable
        ? `All required columns found: ${matchedColNames.join(', ')}`
        : `Partial match. Missing: ${match.missingColumns.join(', ')}`;

    return {
        id: randomUUID(),
        projectId,
        kpiId: match.kpi.id,
        kpiName: match.kpi.name,
        domain: match.kpi.domain,
        confidence: match.confidence,
        matchType: 'RULE_BASED',
        explanation,
        matchedColumns: match.matchedColumns.map(m => m.columnName),
        formulaExpression: match.kpi.formula,
        category: match.kpi.category,
        priority: match.kpi.priority,
        isComputable: match.isComputable,
        discoveredAt: new Date(),
    };
}

// Main discovery function
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

    // Get project columns
    const projectColumns = await getProjectColumns(projectId);
    console.log('[KPI-Discovery] Columns found:', projectColumns.length);

    if (projectColumns.length === 0) {
        console.log('[KPI-Discovery] No columns to analyze');
        return null;
    }

    // Run matching
    const matches = matchKPIsForDomain(domain, projectColumns);
    console.log('[KPI-Discovery] KPIs matched:', matches.length);

    // Convert to discovered KPIs
    const computableKPIs = matches
        .filter(m => m.isComputable)
        .map(m => matchToDiscoveredKPI(m, projectId));

    const partialKPIs = matches
        .filter(m => !m.isComputable && m.confidence >= 30)
        .map(m => matchToDiscoveredKPI(m, projectId));

    const result: KPIDiscoveryResult = {
        projectId,
        domain,
        totalKPIsAnalyzed: matches.length,
        computableKPIs,
        partialKPIs,
        discoveredAt: new Date(),
    };

    // Store results
    await db.kpiDiscovery.upsert({
        where: { projectId },
        data: result,
    });

    console.log('[KPI-Discovery] Complete. Computable:', computableKPIs.length, 'Partial:', partialKPIs.length);

    return result;
}

// Get existing discovery results
export async function getKPIDiscovery(projectId: string): Promise<KPIDiscoveryResult | null> {
    return await db.kpiDiscovery.findUnique({ where: { projectId } });
}
