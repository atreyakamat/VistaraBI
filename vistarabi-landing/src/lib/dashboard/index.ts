// Module 5A — Dashboard Configuration Orchestrator (Rebuilt)
// Generates dashboard configs with chart intelligence and AI explanations

import db from '../prisma';
import type { DomainType } from '../prisma';
import type { DashboardConfigSchema, DashboardMetadata } from './types';
import { buildSections } from './section-builder';
import { buildSidebarConfig } from './sidebar-builder';
import { generateKPIExplanations } from './kpi-explainer';
import { DOMAIN_LIBRARIES } from '../domain/domain-keywords';
import { loadBlueprintWithKPIs, flattenKPI } from '../kpi/blueprint-loader';

/**
 * Generate (or regenerate) a complete dashboard configuration.
 * Orchestrates: KPI fetch -> section building -> AI explanations -> persist
 */
export async function generateDashboardConfig(projectId: string): Promise<DashboardConfigSchema> {
    console.log('[Dashboard] Generating config for:', projectId);

    // 1. Fetch upstream data
    const [project, domainDetection] = await Promise.all([
        db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }),
        db.domainDetection.findUnique({ where: { projectId } }),
    ]);

    if (!project) {
        throw new Error(`Project not found: ${projectId}`);
    }

    // 2. Load blueprint via relational loader — returns null if none exists
    const blueprint = await loadBlueprintWithKPIs(projectId);
    const rawKpis = blueprint?.kpis || [];

    // Boundary Enforcement: every KPI must have at least one AggregationRule
    const kpis = rawKpis.filter(kpi => kpi.aggregations && kpi.aggregations.length > 0);

    if (kpis.length === 0) {
        if (rawKpis.length > 0) {
            console.error('[Dashboard] BOUNDARY FAILURE: KPIs exist but none have AggregationRules:', rawKpis.map(k => k.id));
            throw new Error('Blueprint KPIs are missing aggregation rules. Please reset your blueprint.');
        }
        throw new Error('No approved KPIs found. Please finalize your KPI Blueprint first.');
    }

    // 3. Resolve domain info
    const domain = domainDetection?.detectedDomain as DomainType | null;
    const domainInfo = domain ? DOMAIN_LIBRARIES[domain] : null;
    const domainColor = domainInfo?.color || '#6366f1';
    const domainName = domainInfo?.name || 'General';
    const domainIcon = domainInfo?.icon || 'bar-chart';

    // 4. Build sections (groups KPIs + infers chart types)
    const sections = buildSections(kpis, domain, domainColor);

    // 5. Build sidebar
    const sidebarConfig = await buildSidebarConfig(projectId, project.name);

    // 6. Generate AI explanations (WAIT WITH TIMEOUT + FALLBACK)
    console.log('[Dashboard] Generating AI explanations for', kpis.length, 'KPIs...');

    let kpiExplanations: Record<string, any> = {};
    const kpiInputs = kpis.map(kpi => ({
        kpiId: kpi.id,
        kpiName: kpi.name,
        formula: kpi.lineage?.formula || '',
        category: kpi.category || 'general',
        columns: kpi.aggregations?.map((a: any) => a.column) || [],
    }));

    try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI explanation generation timeout (45s)')), 45000)
        );

        // Race: explanations vs timeout
        const results = await Promise.race([
            generateKPIExplanations(kpiInputs, domain),
            timeoutPromise
        ]);
        
        // Ensure generatedAt is set
        for (const [kpiId, exp] of Object.entries(results)) {
            kpiExplanations[kpiId] = {
                ...exp as any,
                generatedAt: exp && (exp as any).generatedAt instanceof Date 
                    ? (exp as any).generatedAt.toISOString() 
                    : new Date().toISOString(),
            };
        }

        console.log('[Dashboard] ✅ AI explanations generated successfully');
    } catch (err: any) {
        console.warn(`[Dashboard] ⚠️ AI explanations unavailable (${err.message}). Using deterministic explanations.`);
        // Fall back to deterministic explanations
        for (const kpi of kpiInputs) {
            kpiExplanations[kpi.kpiId] = {
                kpiId: kpi.kpiId,
                explanation: `Tracks ${kpi.kpiName} metric over time`,
                formulaSummary: kpi.formula || 'Calculated metric',
                dataSourceRef: kpi.columns.join(', ') || 'Data sources',
                businessDefinition: `Measures performance of ${kpi.kpiName}`,
                recommendation: 'Monitor trends and compare period-over-period',
                generatedAt: new Date().toISOString(),
            };
        }
    }

    // 7. Version management
    const existing = await db.dashboardConfig.findUnique({
        where: { projectId },
        select: { version: true },
    });
    const version = (existing?.version || 0) + 1;

    // 8. Build metadata with explicit sanitization
    const sanitizeDate = (val: any) => (val instanceof Date ? val.toISOString() : (val || new Date().toISOString()));

    const sanitizedExplanations = Object.entries(kpiExplanations).reduce((acc, [kpiId, exp]) => {
        acc[kpiId] = {
            ...(exp as any),
            generatedAt: sanitizeDate((exp as any).generatedAt),
        };
        return acc;
    }, {} as Record<string, any>);

    const metadata: DashboardMetadata = {
        domain: domain || 'GENERAL',
        domainName,
        domainIcon,
        domainColor,
        totalKPIs: kpis.length,
        totalSections: sections.length,
        generatedAt: new Date().toISOString(),
        version,
        kpiExplanations: sanitizedExplanations,
    };

    // 9. Assemble full config
    const config: DashboardConfigSchema = {
        projectId,
        sections,
        sidebarConfig,
        metadata,
        version,
    };

    // 10. Persist to database
    const dbData = {
        projectId,
        sections: sections as any,
        sidebarConfig: sidebarConfig as any,
        metadata: metadata as any,
        version,
    };

    await db.dashboardConfig.upsert({
        where: { projectId },
        create: dbData,
        update: dbData,
    });

    console.log(`[Dashboard] Config generated: ${sections.length} sections, ${kpis.length} KPIs, v${version}`);
    return config;
}

/**
 * Retrieve an existing dashboard configuration.
 */
export async function getDashboardConfig(projectId: string): Promise<DashboardConfigSchema | null> {
    const record = await db.dashboardConfig.findUnique({
        where: { projectId },
    });

    if (!record) return null;

    return {
        projectId: record.projectId,
        sections: record.sections as any,
        sidebarConfig: record.sidebarConfig as any,
        metadata: record.metadata as any,
        version: record.version,
    };
}
