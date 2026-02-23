// Module 5B — KPI Executor
// Core orchestrator: cache → load → filter → compute → profile → explain → respond
// Produces structured KPIExecutionResult payloads ready for frontend rendering

import type { KPILineageEntry, KPISourceContribution } from '../prisma';
import type { KPIDataPoint, Filter } from '../visualization/types';
import type {
    KPIExecutionResult,
    DataProfilingResult,
    ExecutionPerformance,
    ExecutionOptions,
    DashboardExecutionResult,
} from './types';
import type { DashboardConfigSchema, DashboardKPICard, ChartType, ChartLibrary } from '../dashboard/types';

import db from '../prisma';
import { loadProjectData } from '../visualization/data-loader';
import { computeKPI, computeTimeSeries, computeGroupedKPI } from '../visualization/kpi-computer';
import { applyFilters, findDrillDownColumns } from '../visualization/filter-engine';
import { profileDataset } from './data-profiler';
import { selectChart } from '../dashboard/chart-inferrer';
import { getKPIExplanation } from './explanation-cache';
import {
    buildCacheKey,
    getCachedResult,
    setCachedResult,
} from './cache';
import type { ProjectDataMap } from '../visualization/types';

// ─── Constants ────────────────────────────────────────────────────

const ANIMATION_DISABLE_THRESHOLD = 5000;
const QUERY_TIMEOUT_MS = 3000;
const GROUP_BY_ROW_LIMIT = 1000;

// ─── Execute Single KPI ───────────────────────────────────────────

/**
 * Execute a single KPI and return a structured result.
 * This is the core function of Module 5B.
 */
export async function executeKPI(
    projectId: string,
    kpiId: string,
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap,
    options: ExecutionOptions = {}
): Promise<KPIExecutionResult> {
    const startTime = Date.now();
    const timings = { dataLoadMs: 0, computeMs: 0, profilingMs: 0 };

    // ── Step 1: Check cache ──
    const cacheKey = buildCacheKey(projectId, kpiId, {
        granularity: options.granularity,
        filters: options.filters,
        groupBy: options.groupBy,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
    });

    if (!options.skipCache) {
        const cached = getCachedResult<KPIExecutionResult>(cacheKey);
        if (cached) {
            return {
                ...cached,
                performance: {
                    ...cached.performance,
                    cacheHit: true,
                    totalTimeMs: Date.now() - startTime,
                },
            };
        }
    }

    // ── Step 2: Apply filters to data ──
    let filteredDataMap = dataMap;
    const computeStart = Date.now();

    if (options.filters && options.filters.length > 0) {
        filteredDataMap = applyGlobalFilters(dataMap, options.filters);
    }

    // Inject date range filter if provided
    if (options.dateFrom || options.dateTo) {
        const dateFilter = buildDateFilter(lineage, options.dateFrom, options.dateTo);
        if (dateFilter) {
            filteredDataMap = applyGlobalFilters(filteredDataMap, [dateFilter]);
        }
    }

    // ── Step 3: Execute primary computation ──
    let primaryResult;
    if (options.groupBy) {
        primaryResult = computeGroupedKPI(lineage, filteredDataMap, options.groupBy);
        // Enforce row limit
        if (primaryResult.dataPoints.length > GROUP_BY_ROW_LIMIT) {
            primaryResult.dataPoints = primaryResult.dataPoints.slice(0, GROUP_BY_ROW_LIMIT);
        }
    } else if (options.granularity) {
        primaryResult = computeTimeSeries(lineage, filteredDataMap, options.granularity);
    } else {
        primaryResult = computeTimeSeries(lineage, filteredDataMap, 'monthly');
    }

    // ── Step 4: Execute comparison (previous period) ──
    let previousValue: number | null = null;
    try {
        const previousPeriodData = computeKPI(lineage, dataMap); // Unfiltered for comparison
        previousValue = previousPeriodData.previousValue ?? null;
    } catch {
        // Non-critical — proceed without comparison
    }

    timings.computeMs = Date.now() - computeStart;

    // ── Step 5: Compute delta metrics ──
    const primaryValue = primaryResult.currentValue;
    const delta = previousValue !== null ? primaryValue - previousValue : null;
    const deltaPercent = previousValue !== null && previousValue !== 0
        ? Number(((primaryValue - previousValue) / Math.abs(previousValue) * 100).toFixed(2))
        : null;
    const deltaDirection = delta !== null
        ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')
        : null;

    // ── Step 6: Run data profiler ──
    const profilingStart = Date.now();
    const profiling = profileDataset(primaryResult.dataPoints, {
        dateColumn: findDateColumnFromLineage(lineage),
        categoryColumns: findCategoryColumnsFromLineage(lineage),
        numericColumns: findNumericColumnsFromLineage(lineage),
    });
    timings.profilingMs = Date.now() - profilingStart;

    // ── Step 7: Determine chart recommendation ──
    const chartSelection = selectChart({
        hasTimeDimension: profiling.hasTimeDimension,
        numberOfSeries: profiling.numberOfSeries,
        uniqueCategoryCount: profiling.uniqueCategoryCount,
        numericDimensionCount: profiling.numericDimensionCount,
        hierarchicalDepth: profiling.hierarchicalDepth,
        recordCount: profiling.recordCount,
        volatilityIndex: profiling.volatilityIndex,
        distributionType: profiling.distributionSkew > 1 ? 'skewed'
            : profiling.distributionSkew < -1 ? 'skewed'
                : 'normal',
        cardinalityLevel: profiling.cardinalityLevel,
        isSequentialChange: profiling.isSequentialChange,
        categoryColumns: [],
        numericColumns: [],
    });

    // ── Step 8: Fetch AI explanation (non-blocking) ──
    let aiExplanation = null;
    if (!options.skipAIExplanation) {
        try {
            const columns = lineage.sources.flatMap((s: KPISourceContribution) =>
                s.columns.map((c: string) => c)
            );
            aiExplanation = await getKPIExplanation(projectId, kpiId, {
                kpiName: lineage.kpiName,
                formula: lineage.formula,
                category: lineage.category,
                columns,
                currentValue: primaryValue,
                previousValue: previousValue ?? undefined,
                trendPercent: deltaPercent ?? undefined,
            });
        } catch {
            // Non-critical — proceed without explanation
        }
    }

    // ── Step 9: Build lineage summary ──
    const lineageSummary = {
        tables: lineage.sources.map((s: KPISourceContribution) => s.sourceName),
        joins: lineage.joinPaths.map(j => ({
            from: `${j.sourceTable}.${j.sourceColumn}`,
            to: `${j.targetTable}.${j.targetColumn}`,
            on: j.joinType,
        })),
        formula: lineage.formula,
        aggregations: lineage.aggregations.map(a => `${a.function}(${a.column})`),
    };

    // ── Step 10: Build performance metadata ──
    const performance: ExecutionPerformance = {
        totalTimeMs: Date.now() - startTime,
        dataLoadTimeMs: timings.dataLoadMs,
        computeTimeMs: timings.computeMs,
        profilingTimeMs: timings.profilingMs,
        cacheHit: false,
        cacheKey,
    };

    // ── Step 11: Assemble result ──
    const result: KPIExecutionResult = {
        kpiId,
        kpiName: lineage.kpiName,
        category: lineage.category,
        primaryValue,
        previousValue,
        delta,
        deltaPercent,
        deltaDirection,
        dataset: primaryResult.dataPoints,
        datasetSize: primaryResult.dataPoints.length,
        profiling,
        recommendedChartType: chartSelection.chartType,
        recommendedChartLibrary: chartSelection.chartLibrary,
        disableAnimation: profiling.recordCount > ANIMATION_DISABLE_THRESHOLD,
        aiExplanation,
        lineage: lineageSummary,
        performance,
    };

    // ── Step 12: Cache result ──
    setCachedResult(cacheKey, result);

    return result;
}

// ─── Execute Full Dashboard ───────────────────────────────────────

/**
 * Execute all KPIs for a dashboard.
 * Returns a DashboardExecutionResult with structured payloads.
 */
export async function executeDashboard(
    projectId: string,
    options: ExecutionOptions = {}
): Promise<DashboardExecutionResult> {
    const startTime = Date.now();
    console.log('[Executor] Executing dashboard for:', projectId);

    // Load dashboard config
    const config = await loadDashboardConfig(projectId);
    if (!config) {
        throw new Error(`No dashboard config for project: ${projectId}. Run Module 5A first.`);
    }

    // Load lineage registry
    const lineageEntries = await loadLineageRegistry(projectId);

    // Load project data (single load for all KPIs)
    const dataLoadStart = Date.now();
    const dataMap = await loadProjectData(projectId);
    const dataLoadMs = Date.now() - dataLoadStart;

    // Execute each KPI
    const kpis: KPIExecutionResult[] = [];
    let cacheHitCount = 0;
    let cacheMissCount = 0;
    let skippedCount = 0;

    for (const section of config.sections) {
        for (const card of section.cards) {
            let lineage = lineageEntries.find(e => e.kpiId === card.kpiId);

            // Auto-generate fallback lineage if missing (e.g. for raw columns)
            if (!lineage) {
                console.log(`[Executor] Auto-generating fallback lineage for raw column/KPI: ${card.kpiName} (${card.kpiId})`);

                // Determine aggregation based on typical naming/usage.
                // We default to SUM unless it's an ID, Date, or categorical string.
                const isIdOrDate = card.kpiName.toLowerCase().includes('id') || card.kpiName.toLowerCase().includes('date') || card.kpiName.toLowerCase().includes('status');
                const aggFunc = isIdOrDate ? 'COUNT' : 'SUM';

                // Find primary source that has this column
                let sourceTableStr = 'unknown_source';
                let sourceIdStr = '';
                for (const [srcId, srcData] of dataMap.sources.entries()) {
                    if (srcData.columns.includes(card.kpiId.toLowerCase())) {
                        sourceIdStr = srcId;
                        sourceTableStr = (srcData as any).fileName || (srcData as any).name || 'Dataset';
                        break;
                    }
                }

                lineage = {
                    id: `fallback-${card.kpiId}`,
                    projectId,
                    kpiId: card.kpiId,
                    kpiName: card.kpiName,
                    domain: 'General',
                    formula: `${aggFunc}(${card.kpiId})`,
                    category: card.category || 'general',
                    sources: [{
                        sourceId: sourceIdStr || 'fallback',
                        sourceName: sourceTableStr,
                        columns: [card.kpiId],
                        role: 'PRIMARY'
                    }],
                    joinPaths: [],
                    aggregations: [{
                        function: aggFunc as any,
                        column: card.kpiId,
                        sourceId: sourceIdStr
                    }],
                    technicalExplanation: 'Auto-generated fallback lineage for raw column visualization.',
                    businessExplanation: `Derived metric plotting ${card.kpiName}.`,
                    aiEnhanced: false,
                    confidence: 0.5,
                    tracedAt: new Date()
                };
            }

            try {
                const result = await executeKPI(projectId, card.kpiId, lineage, dataMap, {
                    ...options,
                    skipAIExplanation: options.skipAIExplanation,
                });

                if (result.performance.cacheHit) cacheHitCount++;
                else cacheMissCount++;

                kpis.push(result);
            } catch (error) {
                console.error(`[Executor] Error executing KPI ${card.kpiName}:`, error);
                skippedCount++;
            }
        }
    }

    const totalTimeMs = Date.now() - startTime;
    console.log(`[Executor] Dashboard complete: ${kpis.length} KPIs in ${totalTimeMs}ms ` +
        `(${cacheHitCount} cached, ${cacheMissCount} computed, ${skippedCount} skipped)`);

    return {
        projectId,
        kpis,
        appliedFilters: options.filters || [],
        granularity: options.granularity || 'monthly',
        computedAt: new Date().toISOString(),
        metadata: {
            totalKPIs: kpis.length + skippedCount,
            computedKPIs: kpis.length,
            skippedKPIs: skippedCount,
            totalTimeMs,
            cacheHitCount,
            cacheMissCount,
        },
    };
}

// ─── Execute Drill-Down ───────────────────────────────────────────

/**
 * Execute a drill-down query for a specific KPI.
 * Modifies GROUP BY and recomputes the dataset.
 */
export async function executeDrill(
    projectId: string,
    kpiId: string,
    groupByColumn: string,
    options: ExecutionOptions = {}
): Promise<KPIExecutionResult> {
    const lineageEntries = await loadLineageRegistry(projectId);
    const lineage = lineageEntries.find(e => e.kpiId === kpiId);

    if (!lineage) {
        throw new Error(`No lineage found for KPI: ${kpiId}`);
    }

    const dataMap = await loadProjectData(projectId);

    return executeKPI(projectId, kpiId, lineage, dataMap, {
        ...options,
        groupBy: groupByColumn,
        skipCache: true, // Drill-down always recomputes
    });
}

// ─── Internal Helpers ─────────────────────────────────────────────

async function loadDashboardConfig(projectId: string): Promise<DashboardConfigSchema | null> {
    const record = await (db as any).dashboardConfig.findUnique({ where: { projectId } });
    if (!record) return null;

    return {
        projectId: record.projectId,
        sections: record.sections as any,
        sidebarConfig: record.sidebarConfig as any,
        metadata: record.metadata as any,
        version: record.version,
    };
}

async function loadLineageRegistry(projectId: string): Promise<KPILineageEntry[]> {
    const registry = await db.kPILineageRegistry.findUnique({ where: { projectId } });
    if (!registry?.entries) return [];
    return registry.entries as unknown as KPILineageEntry[];
}

function applyGlobalFilters(dataMap: ProjectDataMap, filters: Filter[]): ProjectDataMap {
    const filtered: ProjectDataMap = {
        projectId: dataMap.projectId,
        sources: new Map(),
    };

    for (const [sourceId, source] of dataMap.sources) {
        const applicableFilters = filters.filter(f =>
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

function buildDateFilter(
    lineage: KPILineageEntry,
    dateFrom?: string,
    dateTo?: string
): Filter | null {
    // Find date column from lineage sources
    const dateCol = findDateColumnFromLineage(lineage);
    if (!dateCol) return null;

    return {
        type: 'date_range',
        column: dateCol,
        from: dateFrom,
        to: dateTo,
    };
}

function findDateColumnFromLineage(lineage: KPILineageEntry): string | undefined {
    for (const source of lineage.sources) {
        for (const col of source.columns) {
            const lower = col.toLowerCase();
            if (lower.includes('date') || lower.includes('time') ||
                lower.includes('created') || lower.includes('order_date') ||
                lower.includes('timestamp')) {
                return col;
            }
        }
    }
    return undefined;
}

function findCategoryColumnsFromLineage(lineage: KPILineageEntry): string[] {
    const categories: string[] = [];
    for (const source of lineage.sources) {
        for (const col of source.columns) {
            const lower = col.toLowerCase();
            if (lower.includes('category') || lower.includes('type') ||
                lower.includes('region') || lower.includes('status') ||
                lower.includes('segment') || lower.includes('group')) {
                categories.push(col);
            }
        }
    }
    return categories;
}

function findNumericColumnsFromLineage(lineage: KPILineageEntry): string[] {
    return lineage.aggregations.map(a => a.column);
}
