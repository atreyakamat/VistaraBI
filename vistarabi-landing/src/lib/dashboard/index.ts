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

    // 2. Extract and strictly validate KPIs from blueprint
    const rawKpis: any[] = blueprint
        ? ((blueprint.kpis as any) || [])
        : [];

    // Boundary Enforcement: Filter out raw strings or invalid objects.
    // Supports both new schema (id + aggregations) and old schema (kpiId + formula) for backwards compat.
    const kpis: ApprovedKPI[] = rawKpis.filter(kpi =>
        typeof kpi === 'object' &&
        kpi !== null &&
        // New Domain-Driven schema (id + aggregations required)
        (typeof kpi.id === 'string' && Array.isArray(kpi.aggregations)) ||
        // Legacy schema fallback
        (typeof kpi.kpiId === 'string' && typeof kpi.formula === 'string')
    );

    if (kpis.length === 0) {
        if (rawKpis.length > 0) {
            console.error('[Dashboard] CRITICAL BOUNDARY FAILURE: Blueprint KPIs lack required structure. Got:', JSON.stringify(rawKpis[0], null, 2));
            throw new Error('Fatal Structural Error: Module 4 Blueprint KPIs are missing required fields (id, aggregations). Please reset your blueprint.');
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
            kpiId: kpi.id || (kpi as any).kpiId,
            kpiName: kpi.name || (kpi as any).kpiName,
            formula: kpi.lineage?.formula || (kpi as any).formula || '',
            category: kpi.category || 'general',
            columns: kpi.aggregations?.map(a => a.column) || (kpi as any).matchedColumns || [],
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
