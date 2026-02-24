// Module 5B — KPI Executor
// Core orchestrator: cache → load → filter → compute → profile → explain → respond
// Produces structured KPIExecutionResult payloads ready for frontend rendering

import type { KPILineageEntry, KPISourceContribution, ApprovedKPI } from '../prisma';
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
import pool from './pool';
import { compileFullQuery, compileComparisonQuery, compileScalarQuery, type CompilationContext, type ExecutionFilters } from './sql-compiler';
import { profileDataset } from './data-profiler';
import { selectChart } from '../dashboard/chart-inferrer';
import { getKPIExplanation } from './explanation-cache';
import {
    buildCacheKey,
    getCachedResult,
    setCachedResult,
} from './cache';
import { loadBlueprintWithKPIs } from '../kpi/blueprint-loader';

// ─── Constants ────────────────────────────────────────────────────

const ANIMATION_DISABLE_THRESHOLD = 5000;
const QUERY_TIMEOUT_MS = 3000;
const GROUP_BY_ROW_LIMIT = 1000;

// ─── Execute Single KPI ───────────────────────────────────────────

/**
/**
 * Execute a single KPI and return a structured result.
 * This is the deterministic SQL compiler path.
 */
export async function executeKPI(
    projectId: string,
    kpiId: string,
    options: ExecutionOptions = {}
): Promise<KPIExecutionResult> {
    const startTime = Date.now();
    const timings = { dataLoadMs: 0, computeMs: 0, profilingMs: 0, queryMs: 0 };
    let rowsReturned = 0;

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

    // ── Step 2: Load Blueprint & Validate ──
    const blueprint = await loadBlueprintWithKPIs(projectId);
    if (!blueprint) throw new Error(`[Executor] No blueprint found for project ${projectId}`);

    const targetKpiId = kpiId;
    const kpi = blueprint.kpis.find(k => k.kpiLibraryId === targetKpiId || k.id === targetKpiId);

    if (!kpi) throw new Error(`[Executor] KPI "${targetKpiId}" not found in project blueprint`);
    if (!kpi.aggregations || kpi.aggregations.length === 0) {
        throw new Error(`[Executor] KPI "${targetKpiId}" lacks aggregation rules`);
    }

    // Extract time column from lineage joins/tables as fallback if not explicitly provided
    // In a real scenario, dateColumn should come from UI/User selection. We infer heuristically here.
    let possibleDateColumn: string | undefined = undefined;
    if (options.dateFrom || options.dateTo || options.granularity) {
        // Naive heuristic: look for 'date' or 'time' in any grouping or lineage.
        // Usually, the date column is sent from the frontend filter.
        const allCols = [...kpi.groupBys.map(g => g.column), 'date', 'order_date', 'created_at'];
        possibleDateColumn = allCols.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || 'date';
    }

    // Map filters to ExecutionFilters
    const mappedFilters: ExecutionFilters = {
        dateColumn: possibleDateColumn,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        categoryFilters: options.filters?.filter(f => f.type === 'category' && (f as any).values).map(f => ({
            column: f.column,
            values: (f as any).values,
        })) || [],
        equalsFilters: options.filters?.filter(f => (f as any).type === 'value' && (f as any).value).map(f => ({
            column: f.column,
            value: (f as any).value,
        })) || [],
    };

    const compilationCtx: CompilationContext = {
        kpi,
        filters: mappedFilters,
        granularity: options.granularity,
        drillByColumn: options.groupBy,
    };

    // ── Step 3: Execute Primary Query ──
    const queryStart = Date.now();
    let primaryDataPoints: any[] = [];
    let primaryValue = 0;

    try {
        if (options.granularity || options.groupBy) {
            // Time-series or grouped dataset
            const queryData = compileFullQuery(compilationCtx);
            const res = await pool.query(queryData.text, queryData.values);
            primaryDataPoints = res.rows;
            rowsReturned += res.rows.length;

            // Compute the total primary value by looking at the scalar equivalent
            const scalarQuery = compileScalarQuery(compilationCtx);
            const scalarRes = await pool.query(scalarQuery.text, scalarQuery.values);
            primaryValue = parseFloat(scalarRes.rows[0]?.value || '0');

        } else {
            // Scalar single value
            const queryData = compileScalarQuery(compilationCtx);
            const res = await pool.query(queryData.text, queryData.values);
            primaryValue = parseFloat(res.rows[0]?.value || '0');
            primaryDataPoints = [{ label: 'Total', value: primaryValue }];
            rowsReturned += 1;
        }
    } catch (err: any) {
        console.error(`[Executor] SQL Error on KPI ${kpiId}:`, err.message);
        throw err;
    }

    // Format dataset for Chart.js expecting { label, value } or { date, value }
    // We try to map the first group col and the first agg col
    const aggAlias = `${kpi.aggregations[0].function.toLowerCase()}_${kpi.aggregations[0].column.replace(/\\W/g, '_')}`;
    const formattedDataset = primaryDataPoints.map(row => {
        // If it already has 'value', use it
        if ('value' in row) return { label: 'Total', value: Number(row.value) || 0 };

        // For time series
        if (row.period) {
            return {
                date: new Date(row.period).toISOString().split('T')[0],
                value: Number(row[aggAlias]) || 0,
                // Include other dims if present
                ...row,
            };
        }

        // For categorical grouping
        const groupCol = options.groupBy || (kpi.groupBys.length > 0 ? kpi.groupBys[0].column : null);
        return {
            label: groupCol && row[groupCol] ? String(row[groupCol]) : 'Unknown',
            value: Number(row[aggAlias]) || 0,
            ...row,
        };
    });

    timings.queryMs = Date.now() - queryStart;

    // ── Step 4: Execute Comparison Query ──
    let previousValue: number | null = null;
    const comparisonQueryDate = compileComparisonQuery(compilationCtx);

    if (comparisonQueryDate) {
        try {
            const res = await pool.query(comparisonQueryDate.text, comparisonQueryDate.values);
            previousValue = parseFloat(res.rows[0]?.value || '0');
        } catch (err) {
            console.warn(`[Executor] Comparison query failed for ${kpiId}, non-fatal.`);
        }
    }

    // ── Step 5: Compute Deltas ──
    const delta = previousValue !== null ? primaryValue - previousValue : null;
    const deltaPercent = previousValue !== null && previousValue !== 0
        ? Number(((primaryValue - previousValue) / Math.abs(previousValue) * 100).toFixed(2))
        : null;
    const deltaDirection = delta !== null
        ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')
        : null;

    // ── Step 6: Data Profiler ──
    const profilingStart = Date.now();
    const groupCol = options.groupBy || (kpi.groupBys.length > 0 ? kpi.groupBys[0].column : null);

    // Quick heuristic profiler since SQL already aggs
    const profiling = profileDataset(formattedDataset, {
        dateColumn: options.granularity ? 'date' : undefined,
        categoryColumns: groupCol ? ['label'] : [],
        numericColumns: ['value'],
    });
    timings.profilingMs = Date.now() - profilingStart;

    // ── Step 7: Chart Selection ──
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

    // ── Step 8: AI Explanation ──
    let aiExplanation = null;
    if (!options.skipAIExplanation) {
        try {
            aiExplanation = await getKPIExplanation(projectId, kpiId, {
                kpiName: kpi.name,
                formula: kpi.lineage?.formula || 'SQL Calculation',
                category: kpi.category,
                columns: kpi.aggregations.map(a => a.column),
                currentValue: primaryValue,
                previousValue: previousValue ?? undefined,
                trendPercent: deltaPercent ?? undefined,
            });
        } catch {
            // Non-critical
        }
    }

    // ── Step 9: Lineage Summary ──
    const tablesRaw = kpi.lineage?.tables || [kpi.sourceTable];
    const tables = Array.isArray(tablesRaw) ? tablesRaw as string[] : [kpi.sourceTable];
    const joinsRaw = (kpi.lineage?.joins as any[]) || [];

    const lineageSummary = {
        tables,
        joins: joinsRaw.map(j => ({
            from: `${j.leftTable}.${j.leftColumn}`,
            to: `${j.rightTable}.${j.rightColumn}`,
            on: j.joinType || 'LEFT',
        })),
        formula: kpi.lineage?.formula || '',
        aggregations: kpi.aggregations.map(a => `${a.function}(${a.column})`),
    };

    // ── Step 10: Performance Metadata ──
    const performance = {
        totalTimeMs: Date.now() - startTime,
        dataLoadTimeMs: 0,
        computeTimeMs: timings.queryMs, // Replaced by queryMs
        profilingTimeMs: timings.profilingMs,
        cacheHit: false,
        cacheKey,
        queryTimeMs: timings.queryMs,
        rowsReturned,
        executionMethod: 'sql' as const,
        executionContext: previousValue !== null ? 'comparison' as const : 'primary' as const,
    };

    // ── Step 11: Build Result ──
    const result: KPIExecutionResult = {
        kpiId,
        kpiName: kpi.name,
        category: kpi.category,
        primaryValue,
        previousValue,
        delta,
        deltaPercent,
        deltaDirection,
        dataset: formattedDataset,
        datasetSize: formattedDataset.length,
        profiling,
        recommendedChartType: chartSelection.chartType,
        recommendedChartLibrary: chartSelection.chartLibrary,
        disableAnimation: profiling.recordCount > 5000,
        aiExplanation,
        lineage: lineageSummary,
        performance,
    };

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

    // Load lineage registry (used solely for validation here)
    const lineageEntries = await loadLineageRegistry(projectId);

    // Execute each KPI
    const kpis: KPIExecutionResult[] = [];
    let cacheHitCount = 0;
    let cacheMissCount = 0;
    let skippedCount = 0;

    for (const section of config.sections) {
        for (const card of section.cards) {
            const lineage = lineageEntries.find(e => e.kpiId === card.kpiId);

            // BOUNDARY ENFORCEMENT: A Dashboard Config should never ask to execute a raw string with no lineage
            if (!lineage) {
                console.error(`[Executor] FATAL STRUCTURAL ERROR: No KPI lineage found for '${card.kpiId}'. This means Module 4 incorrectly passed an unstructured column to Module 5.`);
                throw new Error(`FATAL STRUCTURAL ERROR: KPI ${card.kpiId} lacks lineage. The Business Intelligence Data Contract was violated.`);
            }

            // BOUNDARY ENFORCEMENT: Ensure the formula exists mathematically
            if (!lineage.formula || lineage.formula.trim() === '') {
                throw new Error(`Structural Error: KPI ${card.kpiId} has empty mathematical formula`);
            }

            try {
                // Determine effective granularity based on chart defaults (if not provided in options)
                const chartType = card.chartSelection?.chartType;
                const granularity = options.granularity ||
                    (['line', 'bar'].includes(chartType || '') ? 'monthly' : undefined);

                const result = await executeKPI(projectId, card.kpiId, {
                    ...options,
                    granularity,
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

    return executeKPI(projectId, kpiId, {
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
    const blueprint = await loadBlueprintWithKPIs(projectId);
    if (!blueprint || blueprint.kpis.length === 0) return [];

    return blueprint.kpis.map(kpi => ({
        id: kpi.id,
        projectId,
        kpiId: kpi.kpiLibraryId || kpi.id,
        kpiName: kpi.name,
        domain: blueprint.domain || 'General',
        formula: kpi.lineage?.formula || '',
        category: kpi.category,
        sources: [{
            sourceId: kpi.sourceTable,
            sourceName: kpi.sourceTable,
            columns: kpi.aggregations.map(a => a.column),
            role: 'PRIMARY'
        }],
        joinPaths: (kpi.lineage?.joins as any[]) || [],
        aggregations: kpi.aggregations.map(a => ({
            function: a.function as any,
            column: a.column,
            sourceId: kpi.sourceTable,
        })),
        technicalExplanation: 'Generated from relational BI Definition Layer',
        businessExplanation: 'Domain-defined structured metric',
        aiEnhanced: false,
        confidence: 100,
        tracedAt: kpi.updatedAt,
    } as KPILineageEntry));
}
