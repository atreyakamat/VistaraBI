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
 * Orchestrates: KPI fetch → section building → AI explanations → persist
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
    const domainIcon = domainInfo?.icon || '📊';

    // 4. Build sections (groups KPIs + infers chart types)
    const sections = buildSections(kpis, domain, domainColor);

    // 5. Build sidebar
    const sidebarConfig = await buildSidebarConfig(projectId, project.name);

    // 6. Generate AI explanations (non-blocking)
    console.log('[Dashboard] Initiating asynchronous AI explanations for', kpis.length, 'KPIs...');

    // Create an empty explanations record so UI doesn't crash
    const kpiExplanations: Record<string, any> = {};

    // We purposefully DO NOT await this to prevent Ollama ECONNREFUSED from blocking the config flow. 
    generateKPIExplanations(
        kpis.map(kpi => ({
            kpiId: kpi.id,
            kpiName: kpi.name,
            formula: (kpi.lineage as any)?.formula || '',
            category: kpi.category || 'general',
            columns: (kpi.aggregations as any)?.map((a: any) => a.column) || [],
        }))
    ).then(explanations => {
        // Asynchronously update the dashboard config when Ollama eventually responds
        if (process.env.NODE_ENV !== 'test') {
            db.dashboardConfig.findUnique({ where: { projectId } }).then(existingConfig => {
                if (existingConfig && existingConfig.metadata) {
                    const metadata = existingConfig.metadata as any;
                    metadata.kpiExplanations = explanations;
                    db.dashboardConfig.update({
                        where: { projectId },
                        data: { metadata }
                    }).catch(err => console.error('[Dashboard] Failed to async-save AI explanations:', err));
                }
            });
        }
    }).catch(err => {
        console.warn(`[Dashboard] AI Explanations failed or unavailable: ${err.message}. Plotting charts without them.`);
    });

    // 7. Version management
    const existing = await db.dashboardConfig.findUnique({
        where: { projectId },
        select: { version: true },
    });
    const version = (existing?.version || 0) + 1;

    // 8. Build metadata
    const metadata: DashboardMetadata = {
        domain,
        domainName,
        domainIcon,
        domainColor,
        totalKPIs: kpis.length,
        totalSections: sections.length,
        generatedAt: new Date().toISOString(),
        version,
        kpiExplanations,
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
