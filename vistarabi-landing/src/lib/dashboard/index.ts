// Module 5A — Dashboard Configuration Orchestrator
// Generates and persists dashboard layout configurations

import db from '../prisma';
import type { ApprovedKPI, DomainType } from '../prisma';
import type { DashboardConfigSchema, DashboardMetadata } from './types';
import { buildSections } from './section-builder';
import { buildSidebarConfig } from './sidebar-builder';
import { DOMAIN_LIBRARIES } from '../domain/domain-keywords';

/**
 * Generate (or regenerate) a complete dashboard configuration for a project.
 * 
 * This is the main entry point for Module 5A. It:
 * 1. Fetches KPI Blueprint, Domain Detection, and Project metadata
 * 2. Groups KPIs into business-centric sections
 * 3. Infers chart types for each KPI
 * 4. Builds the sidebar navigation structure
 * 5. Assembles and persists the full DashboardConfigSchema
 */
export async function generateDashboardConfig(projectId: string): Promise<DashboardConfigSchema> {
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

    // 3. Resolve domain info
    const domain = domainDetection?.detectedDomain as DomainType | null;
    const domainInfo = domain ? DOMAIN_LIBRARIES[domain] : null;
    const domainColor = domainInfo?.color || '#6366f1'; // Default indigo
    const domainName = domainInfo?.name || 'General';
    const domainIcon = domainInfo?.icon || '📊';

    // 4. Build sections (groups KPIs + infers chart types)
    const sections = buildSections(kpis, domain, domainColor);

    // 5. Build sidebar
    const sidebarConfig = await buildSidebarConfig(projectId, project.name);

    // 6. Determine version
    const existing = await db.dashboardConfig.findUnique({
        where: { projectId },
        select: { version: true },
    });
    const version = (existing?.version || 0) + 1;

    // 7. Build metadata
    const metadata: DashboardMetadata = {
        domain,
        domainName,
        domainIcon,
        domainColor,
        totalKPIs: kpis.length,
        totalSections: sections.length,
        generatedAt: new Date().toISOString(),
        version,
    };

    // 8. Assemble full config
    const config: DashboardConfigSchema = {
        projectId,
        sections,
        sidebarConfig,
        metadata,
        version,
    };

    // 9. Persist to database
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

    return config;
}

/**
 * Retrieve an existing dashboard configuration for a project.
 * Returns null if none has been generated yet.
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
