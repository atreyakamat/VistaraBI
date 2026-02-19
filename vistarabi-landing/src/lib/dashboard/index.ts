// Module 5A — Dashboard Configuration Orchestrator (Rebuilt)
// Generates dashboard configs with chart intelligence and AI explanations

import db from '../prisma';
import type { ApprovedKPI, DomainType } from '../prisma';
import type { DashboardConfigSchema, DashboardMetadata } from './types';
import { buildSections } from './section-builder';
import { buildSidebarConfig } from './sidebar-builder';
import { generateKPIExplanations } from './kpi-explainer';
import { DOMAIN_LIBRARIES } from '../domain/domain-keywords';

/**
 * Generate (or regenerate) a complete dashboard configuration.
 * Orchestrates: KPI fetch → section building → AI explanations → persist
 */
export async function generateDashboardConfig(projectId: string): Promise<DashboardConfigSchema> {
    console.log('[Dashboard] Generating config for:', projectId);

    // 1. Fetch upstream data
    const [project, blueprint, domainDetection] = await Promise.all([
        db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }),
        db.kPIBlueprint.findUnique({ where: { projectId } }),
        db.domainDetection.findUnique({ where: { projectId } }),
    ]);

    if (!project) {
        throw new Error(`Project not found: ${projectId}`);
    }

    // 2. Extract KPIs from blueprint
    const kpis: ApprovedKPI[] = blueprint
        ? ((blueprint.kpis as any) as ApprovedKPI[] || [])
        : [];

    if (kpis.length === 0) {
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

    // 6. Generate AI explanations (batch, cached)
    console.log('[Dashboard] Generating AI explanations for', kpis.length, 'KPIs...');
    const kpiExplanations = await generateKPIExplanations(
        kpis.map(kpi => ({
            kpiId: kpi.kpiId,
            kpiName: kpi.kpiName,
            formula: kpi.formula,
            category: kpi.category,
            columns: kpi.matchedColumns || [],
        }))
    );

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
