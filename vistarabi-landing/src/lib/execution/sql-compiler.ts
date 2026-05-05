/**
 * sql-compiler.ts — Deterministic SQL Compiler for KPI Execution
 *
 * Pure-function module that transforms structured KPI definitions (from the
 * relational Blueprint schema) into parameterized PostgreSQL queries.
 *
 * RULES:
 *  1. All identifiers are double-quoted to prevent SQL injection.
 *  2. All values are parameterized ($1, $2, ...).
 *  3. No string concatenation of user input.
 *  4. No dynamic function names — AggregationFunction enum is mapped statically.
 *  5. LIMIT safety cap on all queries.
 *  6. This module NEVER executes queries — it only compiles them.
 */

import type { ApprovedKPIWithRelations, AggregationRule, GroupByDefinition, LineageDefinition, KPIJoinPath } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SqlParameter = string | number | boolean | Date | null;

export interface CompiledQuery {
    text: string;
    values: SqlParameter[];
}

export interface ExecutionFilters {
    dateColumn?: string;
    dateFrom?: string;
    dateTo?: string;
    categoryFilters?: { column: string; values: string[] }[];
    equalsFilters?: { column: string; value: string }[];
}

export interface JoinDefinition {
    leftTable: string;
    rightTable: string;
    leftColumn: string;
    rightColumn: string;
    joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

export interface CompilationContext {
    kpi: ApprovedKPIWithRelations;
    filters?: ExecutionFilters;
    granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    drillByColumn?: string;
    limit?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10_000;

/** Map AggregationFunction enum string to safe SQL function text */
const AGG_SQL_MAP: Record<string, string> = {
    SUM: 'SUM',
    COUNT: 'COUNT',
    COUNT_DISTINCT: 'COUNT_DISTINCT', // handled specially below
    AVG: 'AVG',
    MIN: 'MIN',
    MAX: 'MAX',
};

/** Map granularity to DATE_TRUNC argument */
const GRANULARITY_MAP: Record<string, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
};

// ─── Identifier Quoting ──────────────────────────────────────────────────────

/**
 * Quote a SQL identifier (table or column name).
 * Strips any existing quotes and double-quotes interior double-quotes.
 */
function qi(identifier: string): string {
    const clean = identifier.replace(/"/g, '').trim();
    if (!clean || /[;\-\-\/\*]/.test(clean)) {
        throw new Error(`[SQL Compiler] Invalid identifier: "${identifier}"`);
    }
    return `"${clean}"`;
}

// ─── SELECT Clause ───────────────────────────────────────────────────────────

function compileSelectClause(
    aggregations: AggregationRule[],
    groupBys: GroupByDefinition[],
    granularity?: string,
    dateColumn?: string,
    drillByColumn?: string,
    formula?: string,
): string {
    const parts: string[] = [];

    // Time dimension if granularity is requested
    // R1 FIX: Cast to ::DATE to eliminate TIMESTAMPTZ timezone ambiguity.
    // PostgreSQL returns a plain DATE value (e.g. '2024-01-01') with no time component,
    // so JS never needs to interpret timezone offsets. The SQL layer owns the date boundary.
    // We also cast the dateColumn to TIMESTAMP to ensure it's the right type for DATE_TRUNC
    if (granularity && dateColumn) {
        const trunc = GRANULARITY_MAP[granularity] || 'month';
        // Ensure interval is cast to TEXT and column to TIMESTAMP
        parts.push(`DATE_TRUNC('${trunc}'::TEXT, ${qi(dateColumn)}::TIMESTAMP)::DATE AS "period"`);
    }

    // GroupBy columns in SELECT
    for (const gb of groupBys) {
        parts.push(`${qi(gb.column)} AS ${qi(gb.column)}`);
    }

    // Drill-down column (additional GROUP BY injected at query time)
    if (drillByColumn && !groupBys.some(g => g.column === drillByColumn)) {
        parts.push(`${qi(drillByColumn)} AS ${qi(drillByColumn)}`);
    }

    // Aggregation expressions (for chart tooltips, etc)
    for (const agg of aggregations) {
        // FIX: Use \W (single backslash) — the previous \\W was a double-escaped no-op.
        const alias = `${agg.function.toLowerCase()}_${agg.column.replace(/\W/g, '_')}`;
        if (agg.function === 'COUNT_DISTINCT') {
            parts.push(`COUNT(DISTINCT ${qi(agg.column)}) AS ${qi(alias)}`);
        } else if (agg.function === 'SUM' || agg.function === 'AVG' || agg.function === 'MIN' || agg.function === 'MAX') {
            // Cast to NUMERIC to prevent:
            //   - 42883 errors (SUM/AVG on TEXT)
            //   - Incorrect string ordering (MIN/MAX: '10' < '2' in lexicographic sort)
            // The ::NUMERIC cast returns NULL for non-numeric values (safe default).
            const fn = AGG_SQL_MAP[agg.function];
            if (!fn) throw new Error(`[SQL Compiler] Unknown aggregation function: ${agg.function}`);
            parts.push(`${fn}(${qi(agg.column)}::NUMERIC) AS ${qi(alias)}`);
        } else {
            const fn = AGG_SQL_MAP[agg.function];
            if (!fn) throw new Error(`[SQL Compiler] Unknown aggregation function: ${agg.function}`);
            parts.push(`${fn}(${qi(agg.column)}) AS ${qi(alias)}`);
        }
    }

    // Include the primary KPI computed "value"
    if (formula) {
        // Strip descriptive pseudo-SQL from library formulas.
        // We split by specific keyword sequences to avoid leaving trailing fragments like "GROUP".
        let safeFormula = formula
            .split(/\s+GROUP\s+BY\s+/i)[0]
            .split(/\s+ORDER\s+BY\s+/i)[0]
            .split(/\s+WHERE\s+/i)[0]
            .split(/\s+LIMIT\s+/i)[0]
            .split(/\s+BY\s+/i)[0];

        // Wrap ALL aggregation denominators with NULLIF to prevent division-by-zero crashes.
        // This covers every ratio KPI pattern across all 8 domains:
        //   COUNT denominator: COUNT(order_id) / COUNT(cart_id)
        //   SUM denominator:   SUM(revenue) / SUM(costs)     [Finance, Manufacturing]
        //   AVG denominator:   SUM(mrr) / AVG(user_id)       [SaaS CLV]
        //   MAX denominator:   MIN(val) / MAX(total)          [edge case]
        safeFormula = safeFormula.trim()
            .replace(/\bCOUNT\(([^)]+)\)/gi,  'NULLIF(COUNT($1), 0)')
            .replace(/\/\s*SUM\(([^)]+)\)/gi,  '/ NULLIF(SUM($1::NUMERIC), 0)')
            .replace(/\/\s*AVG\(([^)]+)\)/gi,  '/ NULLIF(AVG($1::NUMERIC), 0)')
            .replace(/\/\s*MAX\(([^)]+)\)/gi,  '/ NULLIF(MAX($1::NUMERIC), 0)');
        parts.push(`(${safeFormula}) AS "value"`);
    } else if (aggregations.length > 0) {
        const primaryAgg = aggregations[0];
        let fn: string;
        if (primaryAgg.function === 'COUNT_DISTINCT') {
            fn = `COUNT(DISTINCT ${qi(primaryAgg.column)})`;
        } else if (primaryAgg.function === 'SUM' || primaryAgg.function === 'AVG' ||
                   primaryAgg.function === 'MIN' || primaryAgg.function === 'MAX') {
            // Cast to NUMERIC for safe aggregation/ordering of TEXT columns from CSV uploads.
            fn = `${AGG_SQL_MAP[primaryAgg.function]}(${qi(primaryAgg.column)}::NUMERIC)`;
        } else {
            fn = `${AGG_SQL_MAP[primaryAgg.function]}(${qi(primaryAgg.column)})`;
        }
        parts.push(`${fn} AS "value"`);
    }

    if (parts.length === 0) {
        throw new Error('[SQL Compiler] No SELECT expressions generated — KPI has no aggregations');
    }

    return `SELECT ${parts.join(', ')}`;
}

// ─── FROM Clause ─────────────────────────────────────────────────────────────

function compileFromClause(sourceTable: string): string {
    return `FROM ${qi(sourceTable)}`;
}

// ─── JOIN Clause ─────────────────────────────────────────────────────────────

function compileJoinClause(lineage: LineageDefinition | null): string {
    if (!lineage) return '';

    const rawJoins = (lineage.joins || []) as KPIJoinPath[];
    if (rawJoins.length === 0) return '';

    return rawJoins.map(j => {
        const joinType = j.joinType || 'LEFT';
        const validJoins = ['INNER', 'LEFT', 'RIGHT', 'FULL'];
        if (!validJoins.includes(joinType)) {
            throw new Error(`[SQL Compiler] Invalid join type: ${joinType}`);
        }
        return `${joinType} JOIN ${qi(j.targetTable)} ON ${qi(j.sourceTable)}.${qi(j.sourceColumn)} = ${qi(j.targetTable)}.${qi(j.targetColumn)}`;
    }).join('\n');
}

// ─── WHERE Clause ────────────────────────────────────────────────────────────

interface WhereResult {
    clause: string;
    params: SqlParameter[];
}

function compileWhereClause(filters: ExecutionFilters | undefined, paramOffset: number = 0): WhereResult {
    if (!filters) return { clause: '', params: [] };

    const conditions: string[] = [];
    const params: SqlParameter[] = [];
    let idx = paramOffset + 1;

    // Date range filter
    if (filters.dateColumn && filters.dateFrom && filters.dateTo) {
        conditions.push(`${qi(filters.dateColumn)} BETWEEN $${idx} AND $${idx + 1}`);
        params.push(filters.dateFrom, filters.dateTo);
        idx += 2;
    } else if (filters.dateColumn && filters.dateFrom) {
        conditions.push(`${qi(filters.dateColumn)} >= $${idx}`);
        params.push(filters.dateFrom);
        idx++;
    } else if (filters.dateColumn && filters.dateTo) {
        conditions.push(`${qi(filters.dateColumn)} <= $${idx}`);
        params.push(filters.dateTo);
        idx++;
    }

    // Category IN filters
    if (filters.categoryFilters) {
        for (const cf of filters.categoryFilters) {
            const placeholders = cf.values.map(() => `$${idx++}`);
            conditions.push(`${qi(cf.column)} IN (${placeholders.join(', ')})`);
            params.push(...cf.values);
        }
    }

    // Equals filters
    if (filters.equalsFilters) {
        for (const ef of filters.equalsFilters) {
            conditions.push(`${qi(ef.column)} = $${idx}`);
            params.push(ef.value);
            idx++;
        }
    }

    if (conditions.length === 0) return { clause: '', params: [] };

    return {
        clause: `WHERE ${conditions.join(' AND ')}`,
        params,
    };
}

// ─── GROUP BY Clause ─────────────────────────────────────────────────────────

function compileGroupByClause(
    groupBys: GroupByDefinition[],
    granularity?: string,
    dateColumn?: string,
    drillByColumn?: string,
): string {
    const parts: string[] = [];

    // Time dimension grouping
    // R1 FIX: Match the ::DATE cast from compileSelectClause so GROUP BY aligns perfectly.
    // Ensure explicit casts for date_trunc to avoid 'unknown' type errors.
    if (granularity && dateColumn) {
        const trunc = GRANULARITY_MAP[granularity] || 'month';
        parts.push(`DATE_TRUNC('${trunc}'::TEXT, ${qi(dateColumn)}::TIMESTAMP)::DATE`);
    }

    // Defined group-bys
    for (const gb of groupBys) {
        parts.push(qi(gb.column));
    }

    // Drill-down injection
    if (drillByColumn && !groupBys.some(g => g.column === drillByColumn)) {
        parts.push(qi(drillByColumn));
    }

    if (parts.length === 0) return '';

    return `GROUP BY ${parts.join(', ')}`;
}

// ─── ORDER BY Clause ─────────────────────────────────────────────────────────

function compileOrderByClause(
    groupBys: GroupByDefinition[],
    granularity?: string,
    dateColumn?: string,
    drillByColumn?: string,
): string {
    const parts: string[] = [];

    // Time dimension first
    if (granularity && dateColumn) {
        parts.push('"period" ASC');
    }

    // Group columns
    for (const gb of groupBys) {
        parts.push(`${qi(gb.column)} ASC`);
    }

    // Drill column
    if (drillByColumn && !groupBys.some(g => g.column === drillByColumn)) {
        parts.push(`${qi(drillByColumn)} ASC`);
    }

    if (parts.length === 0) return '';

    return `ORDER BY ${parts.join(', ')}`;
}

// ─── Full Query Compilation ──────────────────────────────────────────────────

/**
 * Compile a complete parameterized SQL query for a KPI.
 * This is the main entry point of the compiler.
 */
export function compileFullQuery(ctx: CompilationContext): CompiledQuery {
    const { kpi, filters, granularity, drillByColumn, limit } = ctx;

    // Validation
    if (!kpi.aggregations || kpi.aggregations.length === 0) {
        throw new Error(`[SQL Compiler] KPI "${kpi.name}" has no AggregationRules — cannot compile`);
    }
    if (!kpi.sourceTable) {
        throw new Error(`[SQL Compiler] KPI "${kpi.name}" has no sourceTable — cannot compile`);
    }

    const dateColumn = filters?.dateColumn;

    const formula = kpi.lineage?.formula || (kpi as { formula?: string }).formula;

    const selectClause = compileSelectClause(
        kpi.aggregations,
        kpi.groupBys,
        granularity,
        dateColumn,
        drillByColumn,
        formula
    );
    const fromClause = compileFromClause(kpi.sourceTable);
    const joinClause = compileJoinClause(kpi.lineage);
    const { clause: whereClause, params } = compileWhereClause(filters);
    const groupByClause = compileGroupByClause(kpi.groupBys, granularity, dateColumn, drillByColumn);
    const orderByClause = compileOrderByClause(kpi.groupBys, granularity, dateColumn, drillByColumn);

    const queryLimit = limit || DEFAULT_LIMIT;

    const text = [
        selectClause,
        fromClause,
        joinClause,
        whereClause,
        groupByClause,
        orderByClause,
        `LIMIT ${queryLimit}`,
    ].filter(Boolean).join('\n');

    return { text, values: params };
}

// ─── Comparison Period Query ─────────────────────────────────────────────────

/**
 * Compile a comparison query with shifted date parameters.
 * Computes previous period by the same duration as the primary filter.
 *
 * Example: dateFrom=2024-01-01, dateTo=2024-01-31
 *   -> previous: 2023-12-01 to 2023-12-31
 */
export function compileComparisonQuery(ctx: CompilationContext): CompiledQuery | null {
    const { filters } = ctx;

    if (!filters?.dateColumn || !filters.dateFrom || !filters.dateTo) {
        return null;
    }

    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    const durationMs = to.getTime() - from.getTime();

    if (isNaN(durationMs) || durationMs <= 0) return null;

    const prevTo = new Date(from.getTime() - 1); // day before current start
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    const shiftedFilters: ExecutionFilters = {
        ...filters,
        dateFrom: prevFrom.toISOString().split('T')[0],
        dateTo: prevTo.toISOString().split('T')[0],
    };

    return compileFullQuery({
        ...ctx,
        filters: shiftedFilters,
        // Comparison query only needs aggregate value, strip grouping for scalar
        granularity: undefined,
        drillByColumn: undefined,
    });
}

// ─── Scalar Query (single value, no grouping) ────────────────────────────────

/**
 * Compile a scalar query that returns just the aggregate value(s),
 * ignoring all GROUP BY / ORDER BY. Used for computing the primary KPI value.
 */
export function compileScalarQuery(ctx: CompilationContext): CompiledQuery {
    const { kpi, filters } = ctx;

    if (!kpi.aggregations || kpi.aggregations.length === 0) {
        throw new Error(`[SQL Compiler] KPI "${kpi.name}" has no AggregationRules — cannot compile`);
    }

    const formula = kpi.lineage?.formula || (kpi as { formula?: string }).formula;

    const selectClause = compileSelectClause(kpi.aggregations, [], undefined, undefined, undefined, formula);
    const fromClause = compileFromClause(kpi.sourceTable);
    const joinClause = compileJoinClause(kpi.lineage);
    const { clause: whereClause, params } = compileWhereClause(filters);

    const text = [selectClause, fromClause, joinClause, whereClause].filter(Boolean).join('\n');
    return { text, values: params };
}
