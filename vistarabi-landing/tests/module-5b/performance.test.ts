// Module 5B — Performance Tests
// Validates engine capability to handle large datasets (100k+ rows) within acceptable time limits

import { describe, it, expect, vi } from 'vitest';
import { computeKPI, computeGroupedKPI } from '../../src/lib/visualization/kpi-computer';
import type { DataRow, ProjectDataMap } from '../../src/lib/visualization/types';
import type { KPILineageEntry } from '../../src/lib/prisma';

// ─── Test Data Generator ──────────────────────────────────────────

function generateLargeDataset(count: number): DataRow[] {
    const rows: DataRow[] = new Array(count);
    const products = ['Widget A', 'Widget B', 'Widget C', 'Widget D', 'Widget E'];
    const categories = ['Electronics', 'Clothing', 'Home', 'Garden', 'Toys'];
    const regions = ['North', 'South', 'East', 'West'];

    for (let i = 0; i < count; i++) {
        rows[i] = {
            id: i,
            amount: Math.random() * 1000,
            quantity: Math.floor(Math.random() * 10) + 1,
            product: products[i % products.length],
            category: categories[i % categories.length],
            region: regions[i % regions.length],
            order_date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        };
    }
    return rows;
}

function buildDataMap(rows: DataRow[]): ProjectDataMap {
    return {
        projectId: 'perf-project',
        sources: new Map([
            ['src-large', {
                sourceId: 'src-large',
                sourceName: 'large_sales.csv',
                columns: ['id', 'amount', 'quantity', 'product', 'category', 'region', 'order_date'],
                rows,
            }],
        ]),
    };
}

const largeLineage: KPILineageEntry = {
    id: 'lin-perf',
    projectId: 'perf-project',
    kpiId: 'kpi-perf',
    kpiName: 'Performance Revenue',
    domain: 'SALES',
    formula: 'SUM(amount)',
    category: 'revenue',
    sources: [{ sourceId: 'src-large', sourceName: 'large_sales.csv', columns: ['amount'], role: 'PRIMARY' }],
    joinPaths: [],
    aggregations: [{ function: 'SUM', column: 'amount', sourceId: 'src-large' }],
    technicalExplanation: '',
    businessExplanation: '',
    aiEnhanced: false,
    confidence: 1,
    tracedAt: new Date().toISOString(),
};

// ─── Performance Suite ────────────────────────────────────────────

describe('Module 5B: Performance Tests', () => {
    // We increase timeout for performance tests, though we expect them to be fast
    const TIMEOUT_MS = 5000;

    // Performance Thresholds
    const THRESHOLD_AGGREGATION_MS = 200; // 200ms for 100k rows simple agg
    const THRESHOLD_GROUPING_MS = 500;    // 500ms for 100k rows grouping

    it(`should aggregate 100,000 rows under ${THRESHOLD_AGGREGATION_MS}ms`, () => {
        const rows = generateLargeDataset(100000);
        const dataMap = buildDataMap(rows);

        const startTime = performance.now();
        const result = computeKPI(largeLineage, dataMap);
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`[Perf] 100k Aggregation: ${duration.toFixed(2)}ms`);

        expect(result.currentValue).toBeGreaterThan(0);
        expect(duration).toBeLessThan(THRESHOLD_AGGREGATION_MS);
    }, TIMEOUT_MS);

    it(`should group 100,000 rows (Drill-Down) under ${THRESHOLD_GROUPING_MS}ms`, () => {
        const rows = generateLargeDataset(100000);
        const dataMap = buildDataMap(rows);

        const startTime = performance.now();
        const result = computeGroupedKPI(largeLineage, dataMap, 'category');
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`[Perf] 100k Grouping: ${duration.toFixed(2)}ms`);

        expect(result.dataPoints.length).toBe(5); // 5 categories
        expect(duration).toBeLessThan(THRESHOLD_GROUPING_MS);
    }, TIMEOUT_MS);

    it('should handle 100,000 rows join efficiently', () => {
        // Create 2 datasets of 50k each to join
        // This tests the Hash Join implementation efficiency
        const leftRows = generateLargeDataset(50000).map(r => ({ ...r, customer_id: r.id }));
        const rightRows = generateLargeDataset(50000).map(r => ({ ...r, customer_id: r.id, name: `User ${r.id}` }));

        const joinDataMap: ProjectDataMap = {
            projectId: 'perf-join',
            sources: new Map([
                ['src-left', { sourceId: 'src-left', sourceName: 'orders', columns: ['customer_id', 'amount'], rows: leftRows }],
                ['src-right', { sourceId: 'src-right', sourceName: 'customers', columns: ['customer_id', 'name'], rows: rightRows }],
            ])
        };

        const joinLineage: KPILineageEntry = {
            ...largeLineage,
            sources: [
                { sourceId: 'src-left', sourceName: 'orders', columns: ['amount'], role: 'PRIMARY' },
                { sourceId: 'src-right', sourceName: 'customers', columns: ['name'], role: 'JOINED' },
            ],
            joinPaths: [{
                sourceTable: 'orders',
                sourceColumn: 'customer_id',
                targetTable: 'customers',
                targetColumn: 'customer_id',
                joinType: 'INNER'
            }]
        };

        const startTime = performance.now();
        const result = computeKPI(joinLineage, joinDataMap);
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`[Perf] 50k x 50k Join: ${duration.toFixed(2)}ms`);

        // Hash join should be O(N+M) ≈ linear time
        // 100k total rows join should still be reasonably fast (< 1000ms)
        expect(result.currentValue).toBeGreaterThan(0);
        expect(duration).toBeLessThan(1000);
    }, TIMEOUT_MS);
});
