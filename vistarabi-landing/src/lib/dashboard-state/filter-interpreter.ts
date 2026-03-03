// Module 5.5 — Global Filter Interpreter
// Converts business-oriented filter expressions into normalized, structured filters.
// DETERMINISTIC: no AI, no fuzzy matching. Rule-based only.
// Fiscal year convention: April→March (India standard) by default; configurable.

import type {
    NormalizedFilter,
    NormalizedDateFilter,
    NormalizedCategoryFilter,
    NormalizedValueFilter,
    NormalizedRankFilter,
    BusinessFilterExpression,
    FilterOperator,
    FiscalYearConvention,
} from './types';
import { FilterValidationError } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface InterpreterConfig {
    fiscalYearConvention: FiscalYearConvention;
    referenceDate?: Date; // For testing; defaults to Date.now()
}

const DEFAULT_CONFIG: InterpreterConfig = {
    fiscalYearConvention: 'april_march',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a single business filter expression into a NormalizedFilter.
 * Throws FilterValidationError if the expression is unrecognizable.
 */
export function parseBusinessFilter(
    expression: BusinessFilterExpression,
    config: InterpreterConfig = DEFAULT_CONFIG
): NormalizedFilter {
    const expr = expression.trim();
    const ref = config.referenceDate || new Date();

    // ── 1. Fiscal Year: "FY2025", "FY2024-25", "FY 2025" ──
    const fyMatch = expr.match(/^FY\s*(\d{4})(?:-\d{2,4})?$/i);
    if (fyMatch) {
        return parseFiscalYear(parseInt(fyMatch[1], 10), config.fiscalYearConvention);
    }

    // ── 2. Quarter only: "Q1", "Q2", "Q3", "Q4" ──
    const qOnlyMatch = expr.match(/^Q([1-4])$/i);
    if (qOnlyMatch) {
        const currentYear = ref.getFullYear();
        return parseQuarter(parseInt(qOnlyMatch[1], 10), currentYear);
    }

    // ── 3. Quarter + Year: "Q1 2025", "Q3-2024" ──
    const qYearMatch = expr.match(/^Q([1-4])[- ]*(\d{4})$/i);
    if (qYearMatch) {
        return parseQuarter(parseInt(qYearMatch[1], 10), parseInt(qYearMatch[2], 10));
    }

    // ── 4. Relative: "Last N days/weeks/months" ──
    const lastNMatch = expr.match(/^last\s+(\d+)\s+(day|week|month|year)s?$/i);
    if (lastNMatch) {
        return parseLastN(parseInt(lastNMatch[1], 10), lastNMatch[2].toLowerCase(), ref);
    }

    // ── 5. This period: "This week/month/quarter/year" ──
    const thisPeriodMatch = expr.match(/^this\s+(week|month|quarter|year)$/i);
    if (thisPeriodMatch) {
        return parseThisPeriod(thisPeriodMatch[1].toLowerCase(), ref);
    }

    // ── 6. Ranking: "Top N products", "Top N by revenue", "Bottom N customers" ──
    const rankMatch = expr.match(/^(top|bottom)\s+(\d+)(?:\s+by\s+(\w+))?(?:\s+(\w+))?$/i);
    if (rankMatch) {
        const direction = rankMatch[1].toLowerCase();
        const limit = parseInt(rankMatch[2], 10);
        const byColumn = rankMatch[3] || rankMatch[4] || 'value';
        return {
            type: 'rank',
            column: byColumn.toLowerCase(),
            limit,
            orderDir: direction === 'top' ? 'desc' : 'asc',
            label: expr,
        } as NormalizedRankFilter;
    }

    // ── 7. Value comparison: "Revenue > 10000", "quantity <= 50", "status = active" ──
    const valueMatch = expr.match(/^(\w+)\s*(>=|<=|!=|>|<|=|==)\s*(.+)$/i);
    if (valueMatch) {
        return parseValueExpression(valueMatch[1], valueMatch[2], valueMatch[3].trim(), expr);
    }

    // ── 8. Category list: "category: Electronics, Clothing" ──
    const categoryMatch = expr.match(/^(\w+)\s*:\s*(.+)$/i);
    if (categoryMatch) {
        return {
            type: 'category',
            column: categoryMatch[1].toLowerCase(),
            values: categoryMatch[2].split(',').map(v => v.trim()).filter(Boolean),
            label: expr,
        } as NormalizedCategoryFilter;
    }

    throw new FilterValidationError(expr, 'No matching filter pattern found. Valid patterns: FY2025, Q1, Last 30 days, This month, Top 5 by revenue, column > value, column: value1, value2');
}

/**
 * Parse multiple business filter expressions into normalized filters.
 * Skips empty strings. Collects all errors and throws as a single aggregate error.
 */
export function normalizeFilters(
    expressions: BusinessFilterExpression[],
    config: InterpreterConfig = DEFAULT_CONFIG
): NormalizedFilter[] {
    const results: NormalizedFilter[] = [];
    const errors: string[] = [];

    for (const expr of expressions) {
        if (!expr.trim()) continue;
        try {
            results.push(parseBusinessFilter(expr, config));
        } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
        }
    }

    if (errors.length > 0) {
        throw new FilterValidationError(
            expressions.join(', '),
            `${errors.length} filter(s) failed:\n${errors.join('\n')}`
        );
    }

    return results;
}

// ─── Fiscal Year Parsing ──────────────────────────────────────────────────────

function parseFiscalYear(year: number, convention: FiscalYearConvention): NormalizedDateFilter {
    let from: string;
    let to: string;

    if (convention === 'april_march') {
        // FY2025 = April 1, 2024 → March 31, 2025
        from = `${year - 1}-04-01`;
        to = `${year}-03-31`;
    } else {
        // FY2025 = January 1, 2025 → December 31, 2025
        from = `${year}-01-01`;
        to = `${year}-12-31`;
    }

    return {
        type: 'date_range',
        column: 'date',       // Resolved by executor against actual date column
        from,
        to,
        label: `FY${year}`,
    };
}

// ─── Quarter Parsing ──────────────────────────────────────────────────────────

const QUARTER_MONTHS: Record<number, [number, number]> = {
    1: [1, 3],
    2: [4, 6],
    3: [7, 9],
    4: [10, 12],
};

function parseQuarter(quarter: 1 | 2 | 3 | 4, year: number): NormalizedDateFilter {
    const [startMonth, endMonth] = QUARTER_MONTHS[quarter];
    const lastDayOfMonth = new Date(year, endMonth, 0).getDate();

    return {
        type: 'date_range',
        column: 'date',
        from: `${year}-${String(startMonth).padStart(2, '0')}-01`,
        to: `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`,
        label: `Q${quarter} ${year}`,
    };
}

// ─── Relative Date Parsing ────────────────────────────────────────────────────

function parseLastN(n: number, unit: string, ref: Date): NormalizedDateFilter {
    const to = formatDate(ref);
    const from = new Date(ref);

    switch (unit) {
        case 'day': from.setDate(from.getDate() - n); break;
        case 'week': from.setDate(from.getDate() - n * 7); break;
        case 'month': from.setMonth(from.getMonth() - n); break;
        case 'year': from.setFullYear(from.getFullYear() - n); break;
    }

    return {
        type: 'date_range',
        column: 'date',
        from: formatDate(from),
        to,
        label: `Last ${n} ${unit}${n !== 1 ? 's' : ''}`,
    };
}

function parseThisPeriod(period: string, ref: Date): NormalizedDateFilter {
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 0-indexed
    let from: Date;
    let to: Date;

    switch (period) {
        case 'week': {
            const dow = ref.getDay(); // 0=Sun
            from = new Date(ref); from.setDate(ref.getDate() - dow); from.setHours(0, 0, 0, 0);
            to = new Date(from); to.setDate(from.getDate() + 6);
            break;
        }
        case 'month': {
            from = new Date(year, month, 1);
            to = new Date(year, month + 1, 0);
            break;
        }
        case 'quarter': {
            const q = Math.floor(month / 3) + 1;
            const [sm, em] = QUARTER_MONTHS[q as 1 | 2 | 3 | 4];
            from = new Date(year, sm - 1, 1);
            to = new Date(year, em, 0);
            break;
        }
        case 'year': {
            from = new Date(year, 0, 1);
            to = new Date(year, 11, 31);
            break;
        }
        default:
            from = ref; to = ref;
    }

    return {
        type: 'date_range',
        column: 'date',
        from: formatDate(from),
        to: formatDate(to),
        label: `This ${period}`,
    };
}

// ─── Value Expression Parsing ─────────────────────────────────────────────────

const OP_MAP: Record<string, FilterOperator> = {
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
    '=': 'eq',
    '==': 'eq',
    '!=': 'neq',
};

function parseValueExpression(
    column: string,
    rawOp: string,
    rawValue: string,
    label: string
): NormalizedValueFilter {
    const operator = OP_MAP[rawOp];
    if (!operator) {
        throw new FilterValidationError(label, `Unknown operator "${rawOp}"`);
    }

    // Try numeric, fall back to string
    const numericVal = parseFloat(rawValue);
    const value: number | string = isNaN(numericVal) ? rawValue : numericVal;

    return {
        type: 'value',
        column: column.toLowerCase(),
        operator,
        value,
        label,
    };
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
