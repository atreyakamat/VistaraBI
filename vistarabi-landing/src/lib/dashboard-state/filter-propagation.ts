// Module 5.5 — Cross-Card Filter Propagation
// Merges global dashboard filters with card-level overrides.
// Also handles cache invalidation when global filters change.

import type { NormalizedFilter } from './types';
import type { Filter } from '@/lib/visualization/types';
import { invalidateProject } from '@/lib/execution/cache';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Merge global filters and card-level overrides into a single ordered filter list.
 * Merge order: global first, then card overrides.
 * If both global and card-level have a filter on the same column+type, card override wins.
 */
export function mergeFilters(
    globalFilters: NormalizedFilter[],
    cardOverrides: NormalizedFilter[]
): NormalizedFilter[] {
    // Start with global filters
    const merged: NormalizedFilter[] = [...globalFilters];

    // Apply card overrides — they win on same (type, column) combination
    for (const override of cardOverrides) {
        const existingIdx = merged.findIndex(
            f => f.type === override.type && f.column === override.column
        );
        if (existingIdx >= 0) {
            merged[existingIdx] = override; // Card override wins
        } else {
            merged.push(override);
        }
    }

    return merged;
}

/**
 * Broadcast a global filter change for a project.
 * Invalidates the entire KPI result cache so all cards re-execute with new filters.
 * Called when a user changes a global date range, for example.
 */
export function broadcastFilterChange(
    projectId: string,
    newGlobalFilters: NormalizedFilter[]
): { projectId: string; invalidatedEntries: number; appliedFilters: NormalizedFilter[] } {
    const count = invalidateProject(projectId);
    return {
        projectId,
        invalidatedEntries: count,
        appliedFilters: newGlobalFilters,
    };
}

/**
 * Convert Module 5.5 NormalizedFilter[] into Module 5B Filter[] (for the executor).
 * Rank filters are dropped here — they are applied at the SQL layer via GROUP BY limits,
 * not via the Filter union type. This is intentional boundary discipline.
 */
export function toExecutionFilters(normalized: NormalizedFilter[]): Filter[] {
    const out: Filter[] = [];

    for (const f of normalized) {
        switch (f.type) {
            case 'date_range':
                out.push({
                    type: 'date_range',
                    column: f.column,
                    from: f.from,
                    to: f.to,
                });
                break;

            case 'category':
                out.push({
                    type: 'category',
                    column: f.column,
                    values: f.values,
                });
                break;

            case 'value':
                out.push({
                    type: 'value',
                    column: f.column,
                    operator: f.operator as any,
                    value: f.value,
                });
                break;

            case 'rank':
                // Rank filters are handled via groupBy+limit in the executor options.
                // They don't map to the Filter type directly.
                break;
        }
    }

    return out;
}

/**
 * Extract date range from normalized filters (for executor options).
 * Returns the first date_range filter found for date column.
 */
export function extractDateRange(
    filters: NormalizedFilter[]
): { dateFrom?: string; dateTo?: string; dateColumn?: string } {
    const dateFilter = filters.find(f => f.type === 'date_range');
    if (!dateFilter || dateFilter.type !== 'date_range') return {};
    return {
        dateFrom: dateFilter.from,
        dateTo: dateFilter.to,
        dateColumn: dateFilter.column !== 'date' ? dateFilter.column : undefined,
    };
}

/**
 * Extract rank config from normalized filters (for executor options).
 */
export function extractRankConfig(
    filters: NormalizedFilter[]
): { groupBy?: string; limit?: number } {
    const rankFilter = filters.find(f => f.type === 'rank');
    if (!rankFilter || rankFilter.type !== 'rank') return {};
    return { groupBy: rankFilter.column };
}
