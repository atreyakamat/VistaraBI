// Module 5B — KPI Executor
// Core orchestrator: cache -> load -> filter -> compute -> profile -> explain -> respond
// Produces structured KPIExecutionResult payloads ready for frontend rendering

import type { KPILineageEntry, KPISourceContribution, ApprovedKPI, KPIJoinPath, KPIAggregation } from '../prisma';
import type { KPIDataPoint, Filter, CategoryFilter, ValueFilter } from '../visualization/types';
import type {
    KPIExecutionResult,
    DataProfilingResult,
    ExecutionPerformance,
    ExecutionOptions,
    DashboardExecutionResult,
} from './types';
import type { DashboardConfigSchema as DashboardConfigType, DashboardKPICard, ChartType, ChartLibrary } from '../dashboard/types';
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
import { loadBlueprintWithKPIs, type ApprovedKPIWithRelations } from '../kpi/blueprint-loader';
import { getAllKPIs } from '../kpi/kpi-library';
import { DashboardConfigSchema } from '../dashboard/schemas';
import { ensureDataMaterialized, getMaterializedTableName } from './data-materializer';
import { KPIComputationError } from '@/lib/errors';

// ─── Constants ────────────────────────────────────────────────────

const ANIMATION_DISABLE_THRESHOLD = 5000;
const QUERY_TIMEOUT_MS = 3000;
const GROUP_BY_ROW_LIMIT = 1000;

/** Type for raw PostgreSQL query results */
interface PostgresRow {
    [key: string]: string | number | boolean | Date | null;
}

// ─── Execute Single KPI ───────────────────────────────────────────

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

    // ── Step 0: Ensure table exists ──
    await ensureDataMaterialized(projectId);
    
    if (!pool) {
        return {
            kpiId,
            kpiName: '',
            category: '',
            primaryValue: 0,
            previousValue: null,
            delta: null,
            deltaPercent: null,
            deltaDirection: null,
            dataset: [],
            datasetSize: 0,
            profiling: {
                recordCount: 0,
                uniqueCategoryCount: 0,
                numberOfSeries: 0,
                hasTimeDimension: false,
                numericDimensionCount: 0,
                hierarchicalDepth: 0,
                volatilityIndex: 0,
                distributionSkew: 0,
                cardinalityLevel: 'low',
                isSequentialChange: false,
            },
            recommendedChartType: 'line',
            recommendedChartLibrary: 'chartjs',
            disableAnimation: false,
            aiExplanation: null,
            lineage: {
                tables: [],
                joins: [],
                formula: '',
                aggregations: [],
            },
            performance: {
                totalTimeMs: 0,
                dataLoadTimeMs: 0,
                computeTimeMs: 0,
                profilingTimeMs: 0,
                cacheHit: false,
                cacheKey: null,
            },
        };
    }

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
    if (!blueprint) throw new KPIComputationError(`[Executor] No blueprint found for project ${projectId}`);

    const targetKpiId = kpiId;
    const kpi = blueprint.kpis.find(k => k.kpiLibraryId === targetKpiId || k.id === targetKpiId);

    if (!kpi) throw new KPIComputationError(`[Executor] KPI "${targetKpiId}" not found in project blueprint`);
    if (!kpi.aggregations || kpi.aggregations.length === 0) {
        throw new KPIComputationError(`[Executor] KPI "${targetKpiId}" lacks aggregation rules`);
    }

    const projectMaterializedTable = getMaterializedTableName(projectId);

    // Override generic "merged_data" with project-specific physical table.
    if (kpi.sourceTable === 'merged_data') {
        kpi.sourceTable = projectMaterializedTable;
    }

    // Fetch schema dynamically to bridge Semantic Library names -> physical table columns.
    // If the requested source table is unavailable, fall back to project materialized table.
    let colRes = await pool.query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
        [kpi.sourceTable]
    );

    if (colRes.rows.length === 0 && kpi.sourceTable !== projectMaterializedTable) {
        const fallbackSchema = await pool.query<{ column_name: string; data_type: string }>(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
            [projectMaterializedTable]
        );
        if (fallbackSchema.rows.length > 0) {
            console.warn(
                `[Executor] Source table "${kpi.sourceTable}" not found for project ${projectId}. ` +
                `Falling back to "${projectMaterializedTable}".`
            );
            kpi.sourceTable = projectMaterializedTable;
            colRes = fallbackSchema;
        }
    }

    if (colRes.rows.length === 0) {
        throw new KPIComputationError(
            `[Executor] Source table "${kpi.sourceTable}" has no readable schema for project ${projectId}.`
        );
    }

    const actualCols = colRes.rows.map(r => r.column_name.toLowerCase());
    const colTypes = Object.fromEntries(colRes.rows.map(r => [r.column_name.toLowerCase(), r.data_type.toLowerCase()]));

    const allLibraryKPIs = getAllKPIs();
    const globalAliases: Record<string, string[]> = {};
    for (const lk of allLibraryKPIs) {
        for (const [col, al] of Object.entries(lk.columnAliases || {})) {
            globalAliases[col] = Array.from(new Set([...(globalAliases[col] || []), ...al]));
        }
    }

    const libraryDefinition = allLibraryKPIs.find(k => k.id === kpi.kpiLibraryId);
    const aliases = { ...globalAliases, ...(libraryDefinition?.columnAliases || {}) };

    const resolveColumn = (col: string): string => {
        const lower = col.toLowerCase();
        
        // 1. If it's already a perfect match in the physical table, STOP.
        if (actualCols.includes(lower)) return lower;

        // 2. If it's a known semantic role (like 'revenue'), try to find its mapped physical column.
        // We look up the aliases for this semantic role.
        if (aliases[lower]) {
            const physicalMatch = aliases[lower].find(a => actualCols.includes(a.toLowerCase()));
            if (physicalMatch) return physicalMatch.toLowerCase();
        }

        // 3. Reverse lookup: If 'col' IS a physical alias for a semantic role.
        for (const [semanticName, aliasList] of Object.entries(aliases)) {
            if (aliasList.some(a => a.toLowerCase() === lower)) {
                // Check if the semantic name itself exists in the table
                if (actualCols.includes(semanticName.toLowerCase())) return semanticName.toLowerCase();
                // Otherwise check peer aliases
                const peerMatch = aliasList.find(a => actualCols.includes(a.toLowerCase()));
                if (peerMatch) return peerMatch.toLowerCase();
            }
        }

        // 4. Fuzzy match against actual physical columns
        // (e.g. if requested 'order_id' but table has 'orders_id')
        const fuzzy = actualCols.find(c => c.includes(lower) || lower.includes(c));
        if (fuzzy) return fuzzy;

        // 5. Hardcoded fallbacks for IDs and Dates if nothing else works
        if (lower.includes('id') || lower.includes('user') || lower.includes('customer')) {
            const commonId = actualCols.find(c => c.includes('id'));
            if (commonId) return commonId;
        }
        if (lower.includes('date') || lower.includes('time')) {
            const commonDate = actualCols.find(c => c.includes('date') || c.includes('time') || c.includes('timestamp'));
            if (commonDate) return commonDate;
        }

        return lower;
    };

    // Shared numeric-type set used across aggregation guards and formula rewrites.
    const NUMERIC_TYPES = ['numeric', 'integer', 'bigint', 'double precision', 'real', 'decimal', 'float', 'int2', 'int4', 'int8', 'float4', 'float8'];
    const CATEGORICAL_TYPES = ['varchar', 'char', 'bool', 'boolean', 'uuid', 'json', 'jsonb'];

    // Rewrite metric and dimension columns dynamically based on physical table
    for (const agg of kpi.aggregations) {
        const resolved = resolveColumn(agg.column);
        agg.column = resolved;

        // If the resolved column STILL doesn't exist in the physical table, it means the KPI
        // targets a column from a different source file that wasn't merged. 
        // Fall back to the first available numeric column so we return real data instead of 0.
        if (!actualCols.includes(resolved)) {
            const bestNumeric = actualCols.find(c => NUMERIC_TYPES.includes(colTypes[c]));
            if (bestNumeric) {
                console.warn(`[Executor] Column "${resolved}" not found in table for KPI "${kpi.name}". Falling back to COUNT(${bestNumeric}).`);
                agg.column = bestNumeric;
                agg.function = 'COUNT' as typeof agg.function;
            }
        }

        // Safety Fallback: If SUM/AVG is requested on a clearly categorical column, fall back to COUNT.
        // For 'text' columns that contain numbers, the ::NUMERIC cast in sql-compiler.ts handles it safely.
        const type = colTypes[agg.column];
        if ((agg.function === 'SUM' || agg.function === 'AVG') && type && !NUMERIC_TYPES.includes(type)) {
            if (CATEGORICAL_TYPES.includes(type)) {
                console.warn(`[Executor] Safety fallback: ${agg.function} on categorical column "${agg.column}" (${type}) for KPI "${kpi.name}" changed to COUNT`);
                agg.function = 'COUNT' as typeof agg.function;
            }
        }
    }

    // ACTION 4: De-duplicate aggregation rules by (function, column) pair.
    // If two columns map to the same semantic role we'd get duplicate SQL expressions.
    const seenAggKeys = new Set<string>();
    kpi.aggregations = kpi.aggregations.filter(agg => {
        const key = `${agg.function}:${agg.column}`;
        if (seenAggKeys.has(key)) {
            console.warn(`[Executor] Duplicate aggregation removed: ${key} for KPI "${kpi.name}"`);
            return false;
        }
        seenAggKeys.add(key);
        return true;
    });

    for (const gb of kpi.groupBys) {
        gb.column = resolveColumn(gb.column);
    }
    if (kpi.lineage?.formula) {
        let f = kpi.lineage.formula;
        for (const [semanticCol] of Object.entries(aliases)) {
            const actual = resolveColumn(semanticCol);
            if (actual !== semanticCol.toLowerCase()) {
                f = f.replace(new RegExp(`\\b${semanticCol}\\b`, 'gi'), actual);
            }
        }
        // ACTION 1: Wrap any remaining SUM/AVG calls in the formula with ::NUMERIC casts.
        // This bulletproofs formula strings like 'SUM(revenue) / NULLIF(COUNT(order_id),0)'
        // that may have been partially resolved to TEXT columns.
        f = f.replace(/\b(SUM|AVG)\("?([\w]+)"?\)/gi, (_match, fn, col) => {
            const physCol = col.toLowerCase();
            const colType = colTypes[physCol];
            if (colType && !NUMERIC_TYPES.includes(colType)) {
                return `${fn}("${physCol}"::NUMERIC)`;
            }
            return `${fn}("${physCol}")`;
        });
        kpi.lineage.formula = f;
    }

    let possibleDateColumn: string | undefined = options.dateColumn;
    if (!possibleDateColumn && (options.dateFrom || options.dateTo || options.granularity)) {
        const priorityKeywords = [
            'order_date', 'signup_date', 'transaction_date', 'created_at', 
            'created', 'timestamp', 'date', 'order_time', 'transaction_time'
        ];
        
        // 1. Try exact or fuzzy matches for priority date columns first
        let dc = priorityKeywords.find(k => actualCols.includes(k));
        if (!dc) {
            dc = actualCols.find(c => priorityKeywords.some(pk => c.includes(pk)));
        }
        if (!dc) {
            // 2. Fallback to any date column that does NOT contain secondary keywords like 'churn', 'end', 'close', 'terminate', 'delete'
            const ignoreKeywords = ['churn', 'end', 'close', 'terminate', 'delete', 'cancel'];
            const generalKeywords = ['date', 'time', 'created', 'updated', 'timestamp', 'day', 'month', 'year'];
            dc = actualCols.find(c => 
                generalKeywords.some(gk => c.includes(gk)) && 
                !ignoreKeywords.some(ik => c.includes(ik))
            );
        }
        if (!dc) {
            // 3. Ultimate fallback to first matching date column
            const generalKeywords = ['date', 'time', 'created', 'updated', 'timestamp', 'day', 'month', 'year'];
            dc = actualCols.find(c => generalKeywords.some(gk => c.includes(gk))) || 'date';
        }
        possibleDateColumn = dc;
    }

    // Map filters to ExecutionFilters
    const mappedFilters: ExecutionFilters = {
        dateColumn: possibleDateColumn,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        categoryFilters: (options.filters ?? [])
            .filter((f): f is CategoryFilter => f.type === 'category')
            .map(f => ({ column: f.column, values: f.values })),
        equalsFilters: (options.filters ?? [])
            .filter((f): f is ValueFilter => f.type === 'value')
            .map(f => ({ column: f.column, value: String(f.value) })),
    };

    const compilationCtx: CompilationContext = {
        kpi,
        filters: mappedFilters,
        granularity: options.granularity,
        drillByColumn: options.groupBy,
    };

    // ── Step 3: Execute Primary Query ──
    const queryStart = Date.now();
    let primaryDataPoints: PostgresRow[] = [];
    let primaryValue = 0;

    try {
        if (options.granularity || options.groupBy) {
            // Time-series or grouped dataset
            const queryData = compileFullQuery(compilationCtx);
            const res = await pool.query<PostgresRow>(queryData.text, queryData.values);
            primaryDataPoints = res.rows;
            rowsReturned += res.rows.length;

            // Compute the total primary value by looking at the scalar equivalent
            const scalarQuery = compileScalarQuery(compilationCtx);
            const scalarRes = await pool.query<{ value: string | number }>(scalarQuery.text, scalarQuery.values);
            primaryValue = parseFloat(String(scalarRes.rows[0]?.value || '0'));

        } else {
            // Scalar single value
            const queryData = compileScalarQuery(compilationCtx);
            const res = await pool.query<{ value: string | number }>(queryData.text, queryData.values);
            primaryValue = parseFloat(String(res.rows[0]?.value || '0'));
            primaryDataPoints = [{ label: 'Total', value: primaryValue }];
            rowsReturned += 1;
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Executor] SQL Error on KPI ${kpiId}:`, msg);
        throw err;
    }

    // Format dataset rows into { label, value } or { date, label, value }
    // CRITICAL: must check `row.period` FIRST — time-series rows also contain a "value" column
    // (from `SELECT … AS "value"`) so the old `'value' in row` guard swallowed every time-series row.
    const aggAlias = `${kpi.aggregations[0].function.toLowerCase()}_${kpi.aggregations[0].column.replace(/\W/g, '_')}`;
    const formattedDataset = primaryDataPoints.map(row => {
        // ── Time-series row: DATE_TRUNC returns a "period" column ──
        if (row.period != null) {
            const rawPeriod = row.period;
            let dateStr: string;
            if (rawPeriod instanceof Date) {
                // Use local calendar fields to avoid UTC midnight shifting back to previous day in IST.
                // e.g. 2024-01-01T00:00:00+05:30 stored as UTC 2023-12-31T18:30:00Z
                // toISOString() → "2023-12-31" (WRONG). Local fields → "2024-01-01" (CORRECT).
                const y = rawPeriod.getFullYear();
                const m = String(rawPeriod.getMonth() + 1).padStart(2, '0');
                const d = String(rawPeriod.getDate()).padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            } else {
                dateStr = String(rawPeriod).slice(0, 10);
            }
            const val = typeof row.value === 'number' ? row.value
                : typeof row.value === 'string' ? parseFloat(row.value)
                    : typeof row[aggAlias] === 'number' ? row[aggAlias]
                        : typeof row[aggAlias] === 'string' ? parseFloat(row[aggAlias])
                            : 0;
            return { date: dateStr, label: dateStr, value: Number(val) || 0 };
        }

        // ── Scalar row (no grouping) ──
        if ('value' in row) return { label: 'Total', value: Number(row.value) || 0 };

        // ── Categorical / grouped row ──
        const groupCol = options.groupBy || (kpi.groupBys.length > 0 ? kpi.groupBys[0].column : null);
        const numVal = typeof row[aggAlias] === 'number' ? row[aggAlias]
            : typeof row[aggAlias] === 'string' ? parseFloat(row[aggAlias])
                : 0;
        return {
            label: groupCol && row[groupCol] != null ? String(row[groupCol]) : 'Unknown',
            value: Number(numVal) || 0,
            ...row,
        };
    });

    timings.queryMs = Date.now() - queryStart;

    // ── Step 4: Execute Comparison Query ──
    let previousValue: number | null = null;
    const comparisonQueryDate = compileComparisonQuery(compilationCtx);

    if (comparisonQueryDate) {
        try {
            const res = await pool.query<{ value: string | number }>(comparisonQueryDate.text, comparisonQueryDate.values);
            previousValue = parseFloat(String(res.rows[0]?.value || '0'));
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
    const currentGroupCol = options.groupBy || (kpi.groupBys.length > 0 ? kpi.groupBys[0].column : null);

    // Quick heuristic profiler since SQL already aggs
    const profiling = profileDataset(formattedDataset, {
        dateColumn: options.granularity ? 'date' : undefined,
        categoryColumns: currentGroupCol ? ['label'] : [],
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
    const joinsRaw = (kpi.lineage?.joins as KPIJoinPath[]) || [];

    const lineageSummary = {
        tables,
        joins: joinsRaw.map(j => ({
            from: `${j.sourceTable}.${j.sourceColumn}`,
            to: `${j.targetTable}.${j.targetColumn}`,
            on: j.joinType || 'LEFT',
        })),
        formula: kpi.lineage?.formula || '',
        aggregations: kpi.aggregations.map(a => `${a.function}(${a.column})`),
    };

    // ── Step 10: Performance Metadata ──
    const performance: ExecutionPerformance = {
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
        disableAnimation: profiling.recordCount > ANIMATION_DISABLE_THRESHOLD,
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

    // ── Step 0: Ensure table exists ──
    await ensureDataMaterialized(projectId);

    // Load dashboard config
    const config = await loadDashboardConfig(projectId);
    if (!config) {
        throw new KPIComputationError(`No dashboard config for project: ${projectId}. Run Module 5A first.`);
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
            const lineage = lineageEntries.find(e => e.kpiId === card.kpiId || e.id === card.kpiId);

            // BOUNDARY ENFORCEMENT: A Dashboard Config should never ask to execute a raw string with no lineage
            if (!lineage) {
                console.error(`[Executor] FATAL STRUCTURAL ERROR: No KPI lineage found for '${card.kpiId}'. This means Module 4 incorrectly passed an unstructured column to Module 5.`);
                throw new KPIComputationError(`FATAL STRUCTURAL ERROR: KPI ${card.kpiId} lacks lineage. The Business Intelligence Data Contract was violated.`);
            }

            // BOUNDARY ENFORCEMENT: Ensure the formula exists mathematically
            if (!lineage.formula || lineage.formula.trim() === '') {
                throw new KPIComputationError(`Structural Error: KPI ${card.kpiId} has empty mathematical formula`);
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
        granularity: options.granularity ?? 'monthly',
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
    return executeKPI(projectId, kpiId, {
        ...options,
        groupBy: groupByColumn,
        skipCache: true, // Drill-down always recomputes
    });
}

// ─── Internal Helpers ─────────────────────────────────────────────

async function loadDashboardConfig(projectId: string): Promise<DashboardConfigType | null> {
    const record = await db.dashboardConfig.findUnique({ where: { projectId } });
    if (!record) return null;

    // Use Zod to validate the JSON columns retrieved from Prisma
    return DashboardConfigSchema.parse({
        projectId: record.projectId,
        sections: record.sections,
        sidebarConfig: record.sidebarConfig,
        metadata: record.metadata,
        version: record.version,
    }) as unknown as DashboardConfigType;
}

async function loadLineageRegistry(projectId: string): Promise<KPILineageEntry[]> {
    const blueprint = await loadBlueprintWithKPIs(projectId);
    if (!blueprint || blueprint.kpis.length === 0) return [];

    return blueprint.kpis.map((kpi: ApprovedKPIWithRelations) => {
        const joinPaths = (kpi.lineage?.joins as unknown as KPIJoinPath[]) || [];
        return {
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
            joinPaths,
            aggregations: kpi.aggregations.map(a => ({
                function: a.function as KPIAggregation['function'],
                column: a.column,
                sourceId: kpi.sourceTable,
            })),
            technicalExplanation: 'Generated from relational BI Definition Layer',
            businessExplanation: 'Domain-defined structured metric',
            aiEnhanced: false,
            confidence: 100,
            tracedAt: kpi.updatedAt,
        } as KPILineageEntry;
    });
}
