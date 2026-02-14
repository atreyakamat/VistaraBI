// Module 5B — Filter Engine
// Applies filters, drill-down, and cross-filtering to dataset rows

import type {
    DataRow,
    Filter,
    FilterState,
    DateRangeFilter,
    CategoryFilter,
    ValueFilter,
    DrillDownPath,
    CrossFilterEvent,
    ProjectDataMap,
} from './types';

// ─── Core Filter Application ─────────────────────────────────────

/**
 * Apply all filters to a set of rows.
 * Filters are AND-combined (all must match).
 */
export function applyFilters(rows: DataRow[], filters: Filter[]): DataRow[] {
    if (filters.length === 0) return rows;

    let result = rows;

    for (const filter of filters) {
        switch (filter.type) {
            case 'date_range':
                result = applyDateRangeFilter(result, filter);
                break;
            case 'category':
                result = applyCategoryFilter(result, filter);
                break;
            case 'value':
                result = applyValueFilter(result, filter);
                break;
        }
    }

    return result;
}

// ─── Individual Filter Types ──────────────────────────────────────

/**
 * Filter rows by date range.
 */
function applyDateRangeFilter(rows: DataRow[], filter: DateRangeFilter): DataRow[] {
    const col = filter.column.toLowerCase();
    const fromDate = filter.from ? new Date(filter.from) : null;
    const toDate = filter.to ? new Date(filter.to) : null;

    return rows.filter(row => {
        const rawValue = row[col];
        if (rawValue === null || rawValue === undefined) return false;

        const date = new Date(rawValue as string | number);
        if (isNaN(date.getTime())) return false;

        if (fromDate && date < fromDate) return false;
        if (toDate && date > toDate) return false;

        return true;
    });
}

/**
 * Filter rows by categorical values (inclusion list).
 */
function applyCategoryFilter(rows: DataRow[], filter: CategoryFilter): DataRow[] {
    const col = filter.column.toLowerCase();
    const allowedValues = new Set(filter.values.map(v => String(v).toLowerCase()));

    return rows.filter(row => {
        const value = row[col];
        if (value === null || value === undefined) return false;
        return allowedValues.has(String(value).toLowerCase());
    });
}

/**
 * Filter rows by value comparison.
 */
function applyValueFilter(rows: DataRow[], filter: ValueFilter): DataRow[] {
    const col = filter.column.toLowerCase();

    return rows.filter(row => {
        const rawValue = row[col];
        if (rawValue === null || rawValue === undefined) return false;

        const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
        const filterValue = typeof filter.value === 'number' ? filter.value : parseFloat(String(filter.value));

        if (isNaN(numValue) || isNaN(filterValue)) {
            // Fall back to string comparison
            const strValue = String(rawValue).toLowerCase();
            const strFilter = String(filter.value).toLowerCase();

            switch (filter.operator) {
                case 'eq': return strValue === strFilter;
                case 'neq': return strValue !== strFilter;
                default: return false;
            }
        }

        switch (filter.operator) {
            case 'eq': return numValue === filterValue;
            case 'neq': return numValue !== filterValue;
            case 'gt': return numValue > filterValue;
            case 'gte': return numValue >= filterValue;
            case 'lt': return numValue < filterValue;
            case 'lte': return numValue <= filterValue;
            default: return true;
        }
    });
}

// ─── Drill-Down ───────────────────────────────────────────────────

/**
 * Apply drill-down path to progressively narrow the dataset.
 * Each step in the path adds a filter on column=value.
 */
export function applyDrillDown(rows: DataRow[], drillPath: DrillDownPath): DataRow[] {
    let result = rows;

    for (const step of drillPath.steps) {
        const col = step.column.toLowerCase();
        result = result.filter(row => {
            const value = row[col];
            return String(value ?? '').toLowerCase() === step.value.toLowerCase();
        });
    }

    return result;
}

// ─── Cross-Filtering ──────────────────────────────────────────────

/**
 * Generate filter criteria from a cross-filter event.
 * When a user clicks a value in chart A, this produces filters
 * that are applied to the datasets of related charts B, C, etc.
 */
export function buildCrossFilters(event: CrossFilterEvent): Filter[] {
    return [{
        type: 'category',
        column: event.selectedColumn,
        values: [String(event.selectedValue)],
    }];
}

/**
 * Apply cross-filter to a data map, returning filtered rows per source.
 */
export function applyCrossFilter(
    dataMap: ProjectDataMap,
    event: CrossFilterEvent
): Map<string, DataRow[]> {
    const filters = buildCrossFilters(event);
    const result = new Map<string, DataRow[]>();

    for (const [sourceId, source] of dataMap.sources) {
        // Only filter if the source has the selected column
        const col = event.selectedColumn.toLowerCase();
        if (source.columns.includes(col)) {
            result.set(sourceId, applyFilters(source.rows, filters));
        } else {
            result.set(sourceId, source.rows);
        }
    }

    return result;
}

// ─── Filter Option Discovery ──────────────────────────────────────

/**
 * Discover available filter options for a column.
 * Returns unique values sorted alphabetically.
 */
export function getFilterOptions(
    dataMap: ProjectDataMap,
    sourceId: string,
    column: string
): { value: string; count: number }[] {
    const source = dataMap.sources.get(sourceId);
    if (!source) return [];

    const col = column.toLowerCase();
    const counts = new Map<string, number>();

    for (const row of source.rows) {
        const value = row[col];
        if (value === null || value === undefined) continue;
        const key = String(value);
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Discover date range for a date column.
 */
export function getDateRange(
    dataMap: ProjectDataMap,
    sourceId: string,
    column: string
): { min: string; max: string } | null {
    const source = dataMap.sources.get(sourceId);
    if (!source) return null;

    const col = column.toLowerCase();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const row of source.rows) {
        const rawValue = row[col];
        if (!rawValue) continue;

        const date = new Date(rawValue as string | number);
        if (isNaN(date.getTime())) continue;

        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;
    }

    if (!minDate || !maxDate) return null;

    return {
        min: minDate.toISOString().split('T')[0],
        max: maxDate.toISOString().split('T')[0],
    };
}

/**
 * Find available drill-down columns for a KPI.
 * Returns non-numeric, non-date categorical columns.
 */
export function findDrillDownColumns(
    dataMap: ProjectDataMap,
    sourceId: string
): string[] {
    const source = dataMap.sources.get(sourceId);
    if (!source || source.rows.length === 0) return [];

    const sample = source.rows[0];
    const drillCols: string[] = [];

    for (const [key, value] of Object.entries(sample)) {
        // Skip numeric columns and common ID columns
        if (key.endsWith('id') || key === 'id') continue;
        if (typeof value === 'number') continue;

        // Check it's categorical (reasonable number of unique values)
        const uniqueCount = new Set(source.rows.map(r => r[key])).size;
        if (uniqueCount > 1 && uniqueCount <= Math.min(50, source.rows.length * 0.5)) {
            drillCols.push(key);
        }
    }

    return drillCols;
}
