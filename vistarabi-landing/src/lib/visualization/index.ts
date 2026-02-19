// Module 5B — Visualization & Interaction Engine
// Main orchestrator: computes dashboard data from lineage metadata + warehouse data

import db from '../prisma';
import type { KPILineageEntry } from '../prisma';
import type {
    DashboardDataPayload,
    ChartDataPayload,
    FilterState,
    DrillDownPath,
    CrossFilterEvent,
    KPIDataResult,
    TimeGranularity,
    ProjectDataMap,
} from './types';
import { loadProjectData, findSourceForColumn } from './data-loader';
import { computeKPI, computeTimeSeries, computeGroupedKPI } from './kpi-computer';
import { applyFilters, applyDrillDown, applyCrossFilter, findDrillDownColumns, getFilterOptions } from './filter-engine';
import type { DashboardConfigSchema, DashboardSection, DashboardKPICard } from '../dashboard/types';

// ─── Main Dashboard Data Computation ──────────────────────────────

/**
 * Compute all dashboard data for a project.
 * This is the main entry point for Module 5B.
 *
 * Pipeline:
 * 1. Load dashboard config (Module 5A)
 * 2. Load KPI lineage registry (Module 4D-B)
 * 3. Load project data into memory
 * 4. For each KPI in the dashboard, compute its value
 * 5. Apply any active filters
 * 6. Return complete DashboardDataPayload
 */
export async function computeDashboardData(
    projectId: string,
    filterState?: FilterState,
    drillDownPaths?: DrillDownPath[]
): Promise<DashboardDataPayload> {
    const startTime = Date.now();
    console.log('[Visualization] Computing dashboard data for:', projectId);

    // 1. Load dashboard config from Module 5A
    const dashboardConfig = await loadDashboardConfig(projectId);
    if (!dashboardConfig) {
        throw new Error(`No dashboard config found for project: ${projectId}. Run Module 5A first.`);
    }

    // 2. Load KPI lineage registry from Module 4D-B
    const lineageEntries = await loadLineageRegistry(projectId);

    // 3. Load project data
    const dataMap = await loadProjectData(projectId);

    // 4. Apply global filters to data if present
    let filteredDataMap = dataMap;
    if (filterState && filterState.filters.length > 0) {
        filteredDataMap = applyGlobalFilters(dataMap, filterState);
    }

    // 5. Compute each KPI
    const charts: ChartDataPayload[] = [];
    let computedCount = 0;
    let skippedCount = 0;
    const granularity = filterState?.granularity || 'monthly';

    for (const section of dashboardConfig.sections) {
        for (const card of section.cards) {
            const lineage = lineageEntries.find(e => e.kpiId === card.kpiId);

            if (!lineage) {
                console.log(`[Visualization] No lineage found for KPI: ${card.kpiName}, skipping`);
                skippedCount++;
                continue;
            }

            try {
                // Check for drill-down
                const drillDown = drillDownPaths?.find(dp => dp.kpiId === card.kpiId);

                let data: KPIDataResult;
                if (drillDown?.groupByColumn) {
                    data = computeGroupedKPI(lineage, filteredDataMap, drillDown.groupByColumn);
                } else if (card.chartSelection?.chartType === 'line' || card.chartSelection?.chartType === 'bar') {
                    data = computeTimeSeries(lineage, filteredDataMap, granularity);
                } else {
                    data = computeKPI(lineage, filteredDataMap);
                }

                // Find available drill-down columns
                const primarySource = lineage.sources[0];
                const drillDownCols = primarySource
                    ? findDrillDownColumns(filteredDataMap, primarySource.sourceId)
                    : [];

                // Find available group-by columns  
                const groupByCols = drillDownCols.filter(c =>
                    !c.toLowerCase().includes('date') && !c.toLowerCase().includes('time')
                );

                charts.push({
                    kpiId: card.kpiId,
                    kpiName: card.kpiName,
                    chartType: card.chartSelection?.chartType || 'bar',
                    cardSize: card.cardSize,
                    sectionId: section.id,
                    data,
                    availableDrillDowns: drillDownCols,
                    availableGroupBys: groupByCols,
                });

                computedCount++;
            } catch (error) {
                console.error(`[Visualization] Error computing KPI ${card.kpiName}:`, error);
                skippedCount++;
            }
        }
    }

    const executionTimeMs = Date.now() - startTime;
    console.log(`[Visualization] Computed ${computedCount} KPIs in ${executionTimeMs}ms (${skippedCount} skipped)`);

    return {
        projectId,
        charts,
        appliedFilters: filterState || { filters: [], granularity: 'monthly' },
        drillDownPaths: drillDownPaths || [],
        computedAt: new Date().toISOString(),
        metadata: {
            totalKPIs: computedCount + skippedCount,
            computedKPIs: computedCount,
            skippedKPIs: skippedCount,
            executionTimeMs,
        },
    };
}

// ─── Single KPI Computation ───────────────────────────────────────

/**
 * Compute data for a single KPI (used by the per-KPI API endpoint).
 */
export async function computeSingleKPI(
    projectId: string,
    kpiId: string,
    options?: {
        granularity?: TimeGranularity;
        groupBy?: string;
        filters?: FilterState;
    }
): Promise<KPIDataResult | null> {
    const lineageEntries = await loadLineageRegistry(projectId);
    const lineage = lineageEntries.find(e => e.kpiId === kpiId);

    if (!lineage) return null;

    const dataMap = await loadProjectData(projectId);
    let filteredDataMap = dataMap;

    if (options?.filters && options.filters.filters.length > 0) {
        filteredDataMap = applyGlobalFilters(dataMap, options.filters);
    }

    if (options?.groupBy) {
        return computeGroupedKPI(lineage, filteredDataMap, options.groupBy);
    }

    if (options?.granularity) {
        return computeTimeSeries(lineage, filteredDataMap, options.granularity);
    }

    return computeKPI(lineage, filteredDataMap);
}

// ─── Cross-Filter Computation ─────────────────────────────────────

/**
 * Apply cross-filter and recompute affected KPIs.
 */
export async function applyCrossFilterAndRecompute(
    projectId: string,
    event: CrossFilterEvent,
    granularity: TimeGranularity = 'monthly'
): Promise<ChartDataPayload[]> {
    const lineageEntries = await loadLineageRegistry(projectId);
    const dataMap = await loadProjectData(projectId);

    // Apply cross-filter to data
    const filteredRows = applyCrossFilter(dataMap, event);

    // Create filtered data map
    const filteredDataMap: ProjectDataMap = {
        projectId,
        sources: new Map(),
    };
    for (const [sourceId, rows] of filteredRows) {
        const original = dataMap.sources.get(sourceId);
        if (original) {
            filteredDataMap.sources.set(sourceId, {
                ...original,
                rows,
            });
        }
    }

    // Recompute affected KPIs
    const results: ChartDataPayload[] = [];
    for (const kpiId of event.affectedKpiIds) {
        const lineage = lineageEntries.find(e => e.kpiId === kpiId);
        if (!lineage) continue;

        const data = computeTimeSeries(lineage, filteredDataMap, granularity);
        const primarySource = lineage.sources[0];
        const drillDownCols = primarySource
            ? findDrillDownColumns(filteredDataMap, primarySource.sourceId)
            : [];

        results.push({
            kpiId,
            kpiName: lineage.kpiName,
            chartType: 'bar', // Will be overridden by frontend
            cardSize: 'md',
            sectionId: '',
            data,
            availableDrillDowns: drillDownCols,
            availableGroupBys: drillDownCols.filter(c =>
                !c.toLowerCase().includes('date')
            ),
        });
    }

    return results;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Load dashboard config from Module 5A.
 */
async function loadDashboardConfig(projectId: string): Promise<DashboardConfigSchema | null> {
    const record = await db.dashboardConfig.findUnique({
        where: { projectId },
    });

    if (!record) return null;

    return {
        projectId: record.projectId,
        sections: record.sections as unknown as DashboardSection[],
        sidebarConfig: record.sidebarConfig as any,
        metadata: record.metadata as any,
        version: record.version,
    };
}

/**
 * Load KPI lineage entries from Module 4D-B registry.
 */
async function loadLineageRegistry(projectId: string): Promise<KPILineageEntry[]> {
    const registry = await db.kPILineageRegistry.findUnique({
        where: { projectId },
    });

    if (!registry || !registry.entries) return [];

    return registry.entries as unknown as KPILineageEntry[];
}

/**
 * Apply filters to all sources in a data map.
 */
function applyGlobalFilters(
    dataMap: ProjectDataMap,
    filterState: FilterState
): ProjectDataMap {
    const filtered: ProjectDataMap = {
        projectId: dataMap.projectId,
        sources: new Map(),
    };

    for (const [sourceId, source] of dataMap.sources) {
        // Only apply filters whose columns exist in this source
        const applicableFilters = filterState.filters.filter(f =>
            source.columns.includes(f.column.toLowerCase())
        );

        filtered.sources.set(sourceId, {
            ...source,
            rows: applicableFilters.length > 0
                ? applyFilters(source.rows, applicableFilters)
                : source.rows,
        });
    }

    return filtered;
}

// Re-export for API convenience
export { getFilterOptions } from './filter-engine';
export { getDateRange, findDrillDownColumns } from './filter-engine';
export type { DashboardDataPayload, ChartDataPayload, FilterState, DrillDownPath, CrossFilterEvent } from './types';
