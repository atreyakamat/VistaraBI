// Module 5B — Visualization & Interaction Engine Tests
// Tests KPI computation, joins, filtering, drill-down, and edge cases

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
    source: { findMany: vi.fn() },
    dashboardConfig: { findUnique: vi.fn() },
    kPILineageRegistry: { findUnique: vi.fn() },
}));

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: mockDb,
}));

// ─── Imports (after mocks) ────────────────────────────────────────

import { applyAggregation, computeKPI, computeTimeSeries, computeGroupedKPI } from '../../src/lib/visualization/kpi-computer';
import { applyFilters, applyDrillDown, findDrillDownColumns, getFilterOptions } from '../../src/lib/visualization/filter-engine';
import type { KPILineageEntry, KPIAggregation } from '../../src/lib/prisma';
import type { DataRow, ProjectDataMap, Filter, DrillDownPath } from '../../src/lib/visualization/types';

// ─── Test Data ────────────────────────────────────────────────────

const mockRows: DataRow[] = [
    { id: '1', product: 'Widget A', category: 'Electronics', amount: 100, quantity: 5, order_date: '2024-01-15' },
    { id: '2', product: 'Widget B', category: 'Clothing', amount: 200, quantity: 3, order_date: '2024-01-20' },
    { id: '3', product: 'Widget C', category: 'Electronics', amount: 150, quantity: 7, order_date: '2024-02-10' },
    { id: '4', product: 'Widget D', category: 'Food', amount: 50, quantity: 10, order_date: '2024-02-15' },
    { id: '5', product: 'Widget E', category: 'Electronics', amount: 300, quantity: 2, order_date: '2024-03-01' },
    { id: '6', product: 'Widget F', category: 'Clothing', amount: 75, quantity: 8, order_date: '2024-03-15' },
];

const mockCustomerRows: DataRow[] = [
    { customer_id: '1', name: 'Alice', region: 'US' },
    { customer_id: '2', name: 'Bob', region: 'EU' },
    { customer_id: '3', name: 'Charlie', region: 'US' },
];

function buildDataMap(rows: DataRow[], sourceId = 'src-1', sourceName = 'sales.csv'): ProjectDataMap {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
        projectId: 'test-project',
        sources: new Map([
            [sourceId, {
                sourceId,
                sourceName,
                columns,
                rows,
            }],
        ]),
    };
}

function buildMultiSourceDataMap(): ProjectDataMap {
    return {
        projectId: 'test-project',
        sources: new Map([
            ['src-sales', {
                sourceId: 'src-sales',
                sourceName: 'sales.csv',
                columns: ['id', 'product', 'category', 'amount', 'quantity', 'order_date', 'customer_id'],
                rows: [
                    { id: '1', product: 'Widget A', category: 'Electronics', amount: 100, quantity: 5, order_date: '2024-01-15', customer_id: '1' },
                    { id: '2', product: 'Widget B', category: 'Clothing', amount: 200, quantity: 3, order_date: '2024-01-20', customer_id: '2' },
                    { id: '3', product: 'Widget C', category: 'Electronics', amount: 150, quantity: 7, order_date: '2024-02-10', customer_id: '1' },
                    { id: '4', product: 'Widget D', category: 'Food', amount: 50, quantity: 10, order_date: '2024-02-15', customer_id: '3' },
                ],
            }],
            ['src-customers', {
                sourceId: 'src-customers',
                sourceName: 'customers.csv',
                columns: ['customer_id', 'name', 'region'],
                rows: mockCustomerRows,
            }],
        ]),
    };
}

function buildLineage(overrides: Partial<KPILineageEntry> = {}): KPILineageEntry {
    return {
        id: 'lineage-1',
        projectId: 'test-project',
        kpiId: 'kpi-1',
        kpiName: 'Total Revenue',
        domain: 'ECOMMERCE',
        formula: 'SUM(amount)',
        category: 'revenue',
        sources: [{ sourceId: 'src-1', sourceName: 'sales.csv', columns: ['amount'], role: 'PRIMARY' }],
        joinPaths: [],
        aggregations: [{ function: 'SUM', column: 'amount', sourceId: 'src-1' }],
        technicalExplanation: 'SUM(amount) from sales',
        businessExplanation: 'Total revenue from sales',
        aiEnhanced: false,
        confidence: 0.95,
        tracedAt: new Date().toISOString(),
        ...overrides,
    };
}

// ─── Test Suites ──────────────────────────────────────────────────

describe('Module 5B: Visualization & Interaction Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Aggregation Functions ──────────────────────────────────────

    describe('Aggregation Functions', () => {
        it('should compute SUM correctly', () => {
            const agg: KPIAggregation = { function: 'SUM', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBe(875); // 100 + 200 + 150 + 50 + 300 + 75
        });

        it('should compute AVG correctly', () => {
            const agg: KPIAggregation = { function: 'AVG', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBeCloseTo(145.83, 1); // 875 / 6
        });

        it('should compute COUNT correctly', () => {
            const agg: KPIAggregation = { function: 'COUNT', column: 'id', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBe(6);
        });

        it('should compute COUNT_DISTINCT correctly', () => {
            const agg: KPIAggregation = { function: 'COUNT_DISTINCT', column: 'category', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBe(3); // Electronics, Clothing, Food
        });

        it('should compute MIN correctly', () => {
            const agg: KPIAggregation = { function: 'MIN', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBe(50);
        });

        it('should compute MAX correctly', () => {
            const agg: KPIAggregation = { function: 'MAX', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(mockRows, agg);
            expect(result).toBe(300);
        });
    });

    // ── KPI Computation ───────────────────────────────────────────

    describe('KPI Computation', () => {
        it('should compute a SUM KPI from lineage', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeKPI(lineage, dataMap);

            expect(result.kpiId).toBe('kpi-1');
            expect(result.kpiName).toBe('Total Revenue');
            expect(result.currentValue).toBe(875);
        });

        it('should compute an AVG KPI', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage({
                kpiId: 'kpi-2',
                kpiName: 'Average Order Value',
                formula: 'AVG(amount)',
                aggregations: [{ function: 'AVG', column: 'amount', sourceId: 'src-1' }],
            });
            const result = computeKPI(lineage, dataMap);

            expect(result.currentValue).toBeCloseTo(145.83, 1);
        });

        it('should handle empty data gracefully', () => {
            const dataMap = buildDataMap([]);
            const lineage = buildLineage();
            const result = computeKPI(lineage, dataMap);

            expect(result.currentValue).toBe(0);
        });
    });

    // ── Time-Series Computation ───────────────────────────────────

    describe('Time-Series Computation', () => {
        it('should group data by monthly granularity', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeTimeSeries(lineage, dataMap, 'monthly', 'order_date');

            expect(result.dataPoints.length).toBeGreaterThanOrEqual(3); // Jan, Feb, Mar
            // Verify labels are month-based
            for (const dp of result.dataPoints) {
                expect(dp.label).toMatch(/^\d{4}-\d{2}$/);
            }
        });

        it('should group data by daily granularity', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeTimeSeries(lineage, dataMap, 'daily', 'order_date');

            expect(result.dataPoints.length).toBe(6); // Each row has a unique date
            for (const dp of result.dataPoints) {
                expect(dp.label).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            }
        });

        it('should compute trend correctly', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeTimeSeries(lineage, dataMap, 'monthly', 'order_date');

            expect(['up', 'down', 'flat']).toContain(result.trend);
            expect(result.previousValue).toBeDefined();
        });
    });

    // ── Grouped KPI (Drill-Down) ──────────────────────────────────

    describe('Grouped KPI (Drill-Down)', () => {
        it('should group by category correctly', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeGroupedKPI(lineage, dataMap, 'category');

            expect(result.dataPoints.length).toBe(3); // Electronics, Clothing, Food

            const electronics = result.dataPoints.find(dp => dp.label === 'Electronics');
            expect(electronics?.value).toBe(550); // 100 + 150 + 300

            const clothing = result.dataPoints.find(dp => dp.label === 'Clothing');
            expect(clothing?.value).toBe(275); // 200 + 75

            const food = result.dataPoints.find(dp => dp.label === 'Food');
            expect(food?.value).toBe(50);
        });

        it('should sort groups by value descending', () => {
            const dataMap = buildDataMap(mockRows);
            const lineage = buildLineage();
            const result = computeGroupedKPI(lineage, dataMap, 'category');

            const values = result.dataPoints.map(dp => dp.value);
            expect(values).toEqual([...values].sort((a, b) => b - a));
        });
    });

    // ── Filters ───────────────────────────────────────────────────

    describe('Filter Engine', () => {
        it('should filter by date range', () => {
            const filters: Filter[] = [{
                type: 'date_range',
                column: 'order_date',
                from: '2024-02-01',
                to: '2024-02-28',
            }];

            const result = applyFilters(mockRows, filters);
            expect(result.length).toBe(2); // Feb 10 and Feb 15
        });

        it('should filter by category', () => {
            const filters: Filter[] = [{
                type: 'category',
                column: 'category',
                values: ['Electronics'],
            }];

            const result = applyFilters(mockRows, filters);
            expect(result.length).toBe(3);
            expect(result.every(r => r.category === 'Electronics')).toBe(true);
        });

        it('should filter by value comparison', () => {
            const filters: Filter[] = [{
                type: 'value',
                column: 'amount',
                operator: 'gte',
                value: 150,
            }];

            const result = applyFilters(mockRows, filters);
            expect(result.length).toBe(3); // 200, 150, 300
        });

        it('should combine multiple filters (AND logic)', () => {
            const filters: Filter[] = [
                { type: 'category', column: 'category', values: ['Electronics'] },
                { type: 'value', column: 'amount', operator: 'gte', value: 150 },
            ];

            const result = applyFilters(mockRows, filters);
            expect(result.length).toBe(2); // Widget C (150) and Widget E (300)
        });

        it('should return all rows when no filters applied', () => {
            const result = applyFilters(mockRows, []);
            expect(result.length).toBe(6);
        });
    });

    // ── Drill-Down ────────────────────────────────────────────────

    describe('Drill-Down', () => {
        it('should narrow results by drill-down path', () => {
            const drillPath: DrillDownPath = {
                kpiId: 'kpi-1',
                steps: [{ column: 'category', value: 'Electronics' }],
            };

            const result = applyDrillDown(mockRows, drillPath);
            expect(result.length).toBe(3);
        });

        it('should support multi-step drill-down', () => {
            const drillPath: DrillDownPath = {
                kpiId: 'kpi-1',
                steps: [
                    { column: 'category', value: 'Electronics' },
                    { column: 'product', value: 'Widget A' },
                ],
            };

            const result = applyDrillDown(mockRows, drillPath);
            expect(result.length).toBe(1);
            expect(result[0].product).toBe('Widget A');
        });

        it('should return empty for non-matching drill-down', () => {
            const drillPath: DrillDownPath = {
                kpiId: 'kpi-1',
                steps: [{ column: 'category', value: 'NonExistent' }],
            };

            const result = applyDrillDown(mockRows, drillPath);
            expect(result.length).toBe(0);
        });
    });

    // ── Filter Discovery ──────────────────────────────────────────

    describe('Filter Discovery', () => {
        it('should find drill-down columns', () => {
            const dataMap = buildDataMap(mockRows);
            const cols = findDrillDownColumns(dataMap, 'src-1');

            // category should be available (3 unique / 6 rows = 50%)
            expect(cols).toContain('category');
            // product has 6 unique / 6 rows (100%) — exceeds heuristic threshold
            expect(cols).not.toContain('product');
            // id should not be available (ends with 'id')
            expect(cols).not.toContain('id');
        });

        it('should discover filter options', () => {
            const dataMap = buildDataMap(mockRows);
            const options = getFilterOptions(dataMap, 'src-1', 'category');

            expect(options.length).toBe(3);
            expect(options.map(o => o.value)).toContain('Electronics');
            expect(options.map(o => o.value)).toContain('Clothing');
            expect(options.map(o => o.value)).toContain('Food');

            // Verify counts
            const electronics = options.find(o => o.value === 'Electronics');
            expect(electronics?.count).toBe(3);
        });
    });

    // ── Edge Cases ────────────────────────────────────────────────

    describe('Edge Cases', () => {
        it('should handle null values in aggregation', () => {
            const rowsWithNulls: DataRow[] = [
                { amount: 100 },
                { amount: null },
                { amount: 200 },
                { amount: undefined },
            ];
            const agg: KPIAggregation = { function: 'SUM', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(rowsWithNulls, agg);
            expect(result).toBe(300);
        });

        it('should handle string numbers in aggregation', () => {
            const rowsWithStrings: DataRow[] = [
                { amount: '100' },
                { amount: '200.5' },
                { amount: '300' },
            ];
            const agg: KPIAggregation = { function: 'SUM', column: 'amount', sourceId: 'src-1' };
            const result = applyAggregation(rowsWithStrings, agg);
            expect(result).toBe(600.5);
        });

        it('should handle missing columns gracefully', () => {
            const lineage = buildLineage({
                aggregations: [{ function: 'SUM', column: 'nonexistent', sourceId: 'src-1' }],
            });
            const dataMap = buildDataMap(mockRows);
            const result = computeKPI(lineage, dataMap);
            expect(result.currentValue).toBe(0);
        });

        it('should handle large dataset (1000+ rows) without crashing', () => {
            const largeRows: DataRow[] = Array.from({ length: 1500 }, (_, i) => ({
                id: String(i),
                amount: Math.random() * 1000,
                category: ['A', 'B', 'C'][i % 3],
                order_date: `2024-${String(Math.floor(i / 125) + 1).padStart(2, '0')}-01`,
            }));

            const dataMap = buildDataMap(largeRows);
            const lineage = buildLineage();
            const result = computeKPI(lineage, dataMap);

            expect(result.currentValue).toBeGreaterThan(0);
            expect(result.computedAt).toBeDefined();
        });
    });
});
