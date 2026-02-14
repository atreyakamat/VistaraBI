// Module 5B — KPI Computer
// Core computation engine: reads lineage metadata and computes KPI values
// from in-memory data using joins and aggregations

import type { KPILineageEntry, KPIJoinPath, KPIAggregation } from '../prisma';
import type {
    DataRow,
    ProjectDataMap,
    KPIDataResult,
    KPIDataPoint,
    TimeGranularity,
} from './types';

// ─── Core KPI Computation ─────────────────────────────────────────

/**
 * Compute a single KPI value from lineage metadata and in-memory data.
 * This is the heart of Module 5B.
 */
export function computeKPI(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap
): KPIDataResult {
    const startTime = Date.now();

    // Step 1: Gather rows from all contributing sources
    let rows = gatherSourceRows(lineage, dataMap);

    // Step 2: Perform joins if multiple sources
    if (lineage.joinPaths.length > 0 && lineage.sources.length > 1) {
        rows = performMultiSourceJoin(lineage, dataMap);
    }

    // Step 3: Apply aggregations from lineage
    const currentValue = computeAggregatedValue(rows, lineage.aggregations, lineage.formula);

    // Step 4: Build data points (top-level aggregation as single point)
    const dataPoints: KPIDataPoint[] = [{
        label: 'Current',
        value: currentValue,
    }];

    console.log(`[KPIComputer] ${lineage.kpiName} = ${currentValue} (${Date.now() - startTime}ms)`);

    return {
        kpiId: lineage.kpiId,
        kpiName: lineage.kpiName,
        formula: lineage.formula,
        category: lineage.category,
        currentValue,
        trend: 'flat',
        dataPoints,
        computedAt: new Date().toISOString(),
    };
}

// ─── Time-Series Computation ──────────────────────────────────────

/**
 * Compute KPI values grouped by time granularity.
 * Produces data points suitable for line/bar charts.
 */
export function computeTimeSeries(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap,
    granularity: TimeGranularity,
    dateColumn?: string
): KPIDataResult {
    let rows = gatherSourceRows(lineage, dataMap);

    if (lineage.joinPaths.length > 0 && lineage.sources.length > 1) {
        rows = performMultiSourceJoin(lineage, dataMap);
    }

    // Find the date column
    const dateCols = findDateColumns(rows);
    const dateCol = dateColumn || dateCols[0];

    if (!dateCol) {
        // No date column found — fall back to simple computation
        return computeKPI(lineage, dataMap);
    }

    // Group rows by time bucket
    const groups = groupByTimeBucket(rows, dateCol, granularity);

    // Compute aggregation per bucket
    const dataPoints: KPIDataPoint[] = [];
    let latestValue = 0;

    const sortedBuckets = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [bucket, bucketRows] of sortedBuckets) {
        const value = computeAggregatedValue(bucketRows, lineage.aggregations, lineage.formula);
        dataPoints.push({ label: bucket, value });
        latestValue = value;
    }

    // Compute trend from last two data points
    const trend = computeTrend(dataPoints);

    return {
        kpiId: lineage.kpiId,
        kpiName: lineage.kpiName,
        formula: lineage.formula,
        category: lineage.category,
        currentValue: latestValue,
        previousValue: dataPoints.length >= 2 ? dataPoints[dataPoints.length - 2].value : undefined,
        trend: trend.direction,
        trendPercent: trend.percent,
        dataPoints,
        computedAt: new Date().toISOString(),
    };
}

// ─── Grouped KPI (Drill-Down) ─────────────────────────────────────

/**
 * Compute KPI values grouped by a categorical column.
 * Used for drill-down: e.g., Revenue by Category → by Region.
 */
export function computeGroupedKPI(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap,
    groupByColumn: string
): KPIDataResult {
    let rows = gatherSourceRows(lineage, dataMap);

    if (lineage.joinPaths.length > 0 && lineage.sources.length > 1) {
        rows = performMultiSourceJoin(lineage, dataMap);
    }

    const col = groupByColumn.toLowerCase();

    // Group rows by categorical value
    const groups = new Map<string, DataRow[]>();
    for (const row of rows) {
        const key = String(row[col] ?? 'Unknown');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
    }

    // Compute aggregation per group
    const dataPoints: KPIDataPoint[] = [];
    for (const [key, groupRows] of groups) {
        const value = computeAggregatedValue(groupRows, lineage.aggregations, lineage.formula);
        dataPoints.push({ label: key, value });
    }

    // Sort by value descending
    dataPoints.sort((a, b) => b.value - a.value);

    const totalValue = dataPoints.reduce((sum, dp) => sum + dp.value, 0);

    return {
        kpiId: lineage.kpiId,
        kpiName: lineage.kpiName,
        formula: lineage.formula,
        category: lineage.category,
        currentValue: totalValue,
        dataPoints,
        computedAt: new Date().toISOString(),
    };
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Gather rows from the primary source for a KPI.
 */
function gatherSourceRows(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap
): DataRow[] {
    if (lineage.sources.length === 0) return [];

    const primarySource = lineage.sources.find(s => s.role === 'PRIMARY') || lineage.sources[0];
    const sourceData = dataMap.sources.get(primarySource.sourceId);

    return sourceData?.rows ?? [];
}

/**
 * Perform multi-source join using lineage join paths.
 * Implements INNER, LEFT, RIGHT, FULL joins.
 */
function performMultiSourceJoin(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap
): DataRow[] {
    if (lineage.sources.length < 2) {
        return gatherSourceRows(lineage, dataMap);
    }

    // Start with primary source
    const primarySource = lineage.sources.find(s => s.role === 'PRIMARY') || lineage.sources[0];
    let result = dataMap.sources.get(primarySource.sourceId)?.rows ?? [];

    // For each join path, join with the target
    for (const joinPath of lineage.joinPaths) {
        const targetSourceId = findSourceIdByTableName(
            lineage, dataMap, joinPath.targetTable
        );
        if (!targetSourceId) continue;

        const rightRows = dataMap.sources.get(targetSourceId)?.rows ?? [];
        result = performJoin(result, rightRows, joinPath);
    }

    return result;
}

/**
 * Perform a join between two datasets.
 */
function performJoin(
    leftRows: DataRow[],
    rightRows: DataRow[],
    joinPath: KPIJoinPath
): DataRow[] {
    const leftCol = joinPath.sourceColumn.toLowerCase();
    const rightCol = joinPath.targetColumn.toLowerCase();

    // Build a lookup index on the right side for performance
    const rightIndex = new Map<string, DataRow[]>();
    for (const row of rightRows) {
        const key = String(row[rightCol] ?? '');
        if (!rightIndex.has(key)) rightIndex.set(key, []);
        rightIndex.get(key)!.push(row);
    }

    const joined: DataRow[] = [];
    const matchedRight = new Set<number>();

    for (const leftRow of leftRows) {
        const key = String(leftRow[leftCol] ?? '');
        const matches = rightIndex.get(key) || [];

        if (matches.length > 0) {
            for (const rightRow of matches) {
                // Merge rows, prefixing conflicting keys
                joined.push({ ...rightRow, ...leftRow });
            }
        } else if (joinPath.joinType === 'LEFT' || joinPath.joinType === 'FULL') {
            joined.push({ ...leftRow });
        }
    }

    // For FULL joins, add unmatched right rows
    if (joinPath.joinType === 'FULL') {
        for (let i = 0; i < rightRows.length; i++) {
            const key = String(rightRows[i][rightCol] ?? '');
            const hasLeftMatch = leftRows.some(lr => String(lr[leftCol] ?? '') === key);
            if (!hasLeftMatch) {
                joined.push({ ...rightRows[i] });
            }
        }
    }

    return joined;
}

/**
 * Compute an aggregated value from rows using lineage aggregation definitions.
 * Supports SUM, AVG, COUNT, COUNT_DISTINCT, MIN, MAX.
 */
function computeAggregatedValue(
    rows: DataRow[],
    aggregations: KPIAggregation[],
    formula: string
): number {
    if (rows.length === 0) return 0;

    // If no aggregations defined, try to parse formula directly
    if (aggregations.length === 0) {
        return parseAndComputeFormula(rows, formula);
    }

    // For single aggregation, compute directly
    if (aggregations.length === 1) {
        return applyAggregation(rows, aggregations[0]);
    }

    // For complex formulas (e.g., SUM(a) / SUM(b)), compute each part
    // and combine using the formula pattern
    const values = new Map<string, number>();
    for (const agg of aggregations) {
        const key = `${agg.function}(${agg.column})`;
        values.set(key, applyAggregation(rows, agg));
    }

    return evaluateFormulaWithValues(formula, values);
}

/**
 * Apply a single aggregation function to rows.
 */
export function applyAggregation(rows: DataRow[], aggregation: KPIAggregation): number {
    const col = aggregation.column.toLowerCase();

    // Handle COUNT/COUNT_DISTINCT first — they don't need numeric values
    if (aggregation.function === 'COUNT') {
        return rows.length;
    }
    if (aggregation.function === 'COUNT_DISTINCT') {
        const uniqueValues = new Set(rows.map(r => r[col]).filter(v => v !== null && v !== undefined));
        return uniqueValues.size;
    }

    // Extract numeric values for math aggregations
    const values = rows
        .map(r => r[col])
        .filter(v => v !== null && v !== undefined)
        .map(v => typeof v === 'number' ? v : parseFloat(String(v)))
        .filter(v => !isNaN(v));

    if (values.length === 0) return 0;

    switch (aggregation.function) {
        case 'SUM':
            return values.reduce((sum, v) => sum + v, 0);
        case 'AVG':
            return values.reduce((sum, v) => sum + v, 0) / values.length;
        case 'MIN':
            return Math.min(...values);
        case 'MAX':
            return Math.max(...values);
        default:
            return 0;
    }
}

/**
 * Parse a formula string and compute its value from rows.
 * Handles common patterns: SUM(col), COUNT(col), AVG(col), etc.
 */
function parseAndComputeFormula(rows: DataRow[], formula: string): number {
    const upper = formula.toUpperCase().trim();

    // Match common patterns
    const sumMatch = upper.match(/SUM\((\w+)\)/);
    if (sumMatch) {
        const col = sumMatch[1].toLowerCase();
        return rows
            .map(r => typeof r[col] === 'number' ? r[col] as number : parseFloat(String(r[col] ?? '0')))
            .filter(v => !isNaN(v))
            .reduce((sum, v) => sum + v, 0);
    }

    const countMatch = upper.match(/COUNT\((\w+)\)/);
    if (countMatch) {
        return rows.length;
    }

    const avgMatch = upper.match(/AVG\((\w+)\)/);
    if (avgMatch) {
        const col = avgMatch[1].toLowerCase();
        const values = rows
            .map(r => typeof r[col] === 'number' ? r[col] as number : parseFloat(String(r[col] ?? '0')))
            .filter(v => !isNaN(v));
        return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }

    return 0;
}

/**
 * Evaluate a formula like "SUM(revenue) / SUM(orders)" given pre-computed values.
 */
function evaluateFormulaWithValues(formula: string, values: Map<string, number>): number {
    let expression = formula.toUpperCase();

    // Replace all aggregation expressions with their computed values
    for (const [key, val] of values) {
        expression = expression.replace(key.toUpperCase(), String(val));
    }

    // Simple arithmetic eval for patterns like "X / Y", "X - Y", "X * Y"
    try {
        // Only allow numbers and basic operators for safety
        const sanitized = expression.replace(/[^0-9.+\-*/() ]/g, '');
        if (sanitized.trim() === '') return 0;
        // Use Function constructor for safe math evaluation
        const result = new Function(`return (${sanitized})`)();
        return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
        return 0;
    }
}

// ─── Time Bucketing ───────────────────────────────────────────────

/**
 * Find columns that look like dates in a dataset.
 */
function findDateColumns(rows: DataRow[]): string[] {
    if (rows.length === 0) return [];

    const sample = rows[0];
    const dateCols: string[] = [];

    for (const [key, value] of Object.entries(sample)) {
        if (isDateLikeColumn(key) || isDateLikeValue(value)) {
            dateCols.push(key);
        }
    }

    return dateCols;
}

function isDateLikeColumn(name: string): boolean {
    const dateKeywords = ['date', 'time', 'created', 'updated', 'timestamp', 'day', 'month', 'year', 'order_date', 'orderdate'];
    return dateKeywords.some(kw => name.toLowerCase().includes(kw));
}

function isDateLikeValue(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // ISO date pattern or common date patterns
    return /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value);
}

/**
 * Group rows by time bucket (daily, weekly, monthly, quarterly).
 */
function groupByTimeBucket(
    rows: DataRow[],
    dateColumn: string,
    granularity: TimeGranularity
): Map<string, DataRow[]> {
    const groups = new Map<string, DataRow[]>();
    const col = dateColumn.toLowerCase();

    for (const row of rows) {
        const rawDate = row[col];
        if (!rawDate) continue;

        const date = parseDate(rawDate);
        if (!date) continue;

        const bucket = formatBucket(date, granularity);
        if (!groups.has(bucket)) groups.set(bucket, []);
        groups.get(bucket)!.push(row);
    }

    return groups;
}

function parseDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function formatBucket(date: Date, granularity: TimeGranularity): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    switch (granularity) {
        case 'daily':
            return `${y}-${m}-${d}`;
        case 'weekly': {
            // ISO week start (Monday)
            const day = date.getDay();
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
            const wy = weekStart.getFullYear();
            const wm = String(weekStart.getMonth() + 1).padStart(2, '0');
            const wd = String(weekStart.getDate()).padStart(2, '0');
            return `${wy}-W${wm}${wd}`;
        }
        case 'monthly':
            return `${y}-${m}`;
        case 'quarterly': {
            const q = Math.ceil((date.getMonth() + 1) / 3);
            return `${y}-Q${q}`;
        }
    }
}

// ─── Trend Computation ───────────────────────────────────────────

function computeTrend(dataPoints: KPIDataPoint[]): { direction: 'up' | 'down' | 'flat'; percent: number } {
    if (dataPoints.length < 2) {
        return { direction: 'flat', percent: 0 };
    }

    const current = dataPoints[dataPoints.length - 1].value;
    const previous = dataPoints[dataPoints.length - 2].value;

    if (previous === 0) {
        return { direction: current > 0 ? 'up' : 'flat', percent: 0 };
    }

    const percent = ((current - previous) / Math.abs(previous)) * 100;
    const direction = percent > 1 ? 'up' : percent < -1 ? 'down' : 'flat';

    return { direction, percent: Math.round(percent * 100) / 100 };
}

// ─── Utility ──────────────────────────────────────────────────────

/**
 * Find sourceId by looking up table names in the lineage sources.
 */
function findSourceIdByTableName(
    lineage: KPILineageEntry,
    dataMap: ProjectDataMap,
    tableName: string
): string | null {
    const lower = tableName.toLowerCase();

    // Check lineage sources first
    const lineageSource = lineage.sources.find(
        s => s.sourceName.toLowerCase().replace(/\.[^.]+$/, '') === lower
    );
    if (lineageSource) return lineageSource.sourceId;

    // Check data map
    for (const source of dataMap.sources.values()) {
        if (source.sourceName.toLowerCase().replace(/\.[^.]+$/, '') === lower) {
            return source.sourceId;
        }
    }

    return null;
}
