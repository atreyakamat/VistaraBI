// Module 5A — Sidebar Builder
// Generates the persistent left-sidebar navigation structure

import type { SidebarConfig, SidebarItem } from './types';
import db from '../prisma';

/**
 * Build the sidebar navigation configuration for a project.
 * Items are defined statically but with dynamic enabled/disabled
 * states based on the project's current readiness.
 */
export async function buildSidebarConfig(
    projectId: string,
    projectName: string
): Promise<SidebarConfig> {
    // Check which modules have produced data for this project
    const [
        sourceCount,
        hasDomain,
        hasBlueprint,
        hasLineage,
        hasRelationships,
    ] = await Promise.all([
        db.source.count({ where: { projectId } }),
        db.domainDetection.findUnique({ where: { projectId }, select: { id: true } }).then(r => !!r),
        db.kPIBlueprint.findUnique({ where: { projectId }, select: { id: true } }).then(r => !!r),
        db.dataLineage.findUnique({ where: { projectId }, select: { id: true } }).then(r => !!r),
        db.relationshipRegistry.findUnique({ where: { projectId }, select: { id: true } }).then(r => !!r),
    ]);

    const items: SidebarItem[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'bar-chart',
            route: `/app/projects/${projectId}/dashboard`,
            enabled: true,
        },
        {
            id: 'data-sources',
            label: 'Data Sources',
            icon: 'folder',
            route: `/app/projects/${projectId}`,
            enabled: true,
            badge: sourceCount > 0 ? `${sourceCount}` : undefined,
        },
        {
            id: 'intelligence',
            label: 'Intelligence',
            icon: 'search',
            route: `/app/projects/${projectId}/intelligence`,
            enabled: sourceCount > 0,
            children: [
                {
                    id: 'quality',
                    label: 'Data Quality',
                    icon: 'check-circle',
                    route: `/app/projects/${projectId}/quality`,
                    enabled: sourceCount > 0,
                },
                {
                    id: 'relationships',
                    label: 'Relationships',
                    icon: 'link',
                    route: `/app/projects/${projectId}/relationships`,
                    enabled: hasRelationships,
                },
            ],
        },
        {
            id: 'domain',
            label: 'Domain',
            icon: 'brain',
            route: `/app/projects/${projectId}/domain`,
            enabled: hasDomain,
        },
        {
            id: 'kpi-blueprint',
            label: 'KPI Blueprint',
            icon: 'trending-up',
            route: `/app/projects/${projectId}/kpis`,
            enabled: hasBlueprint,
        },
        {
            id: 'data-lineage',
            label: 'Data Lineage',
            icon: 'link',
            route: `/app/projects/${projectId}/lineage`,
            enabled: hasLineage,
        },
        // Future modules — always present but disabled
        {
            id: 'ai-chat',
            label: 'AI Chat',
            icon: 'message-circle',
            route: `/app/projects/${projectId}/chat`,
            enabled: false,
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: 'clipboard',
            route: `/app/projects/${projectId}/reports`,
            enabled: false,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: 'settings',
            route: `/app/projects/${projectId}/settings`,
            enabled: true,
        },
    ];

    return {
        projectId,
        projectName,
        items,
    };
}
