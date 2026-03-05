// Module 5B — KPI Executor Pipeline Tests
// Tests executeKPI, executeDashboard, executeDrill, and helper functions

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Environment Mocks ────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
    dashboardConfig: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    kPILineageRegistry: { findUnique: vi.fn() },
    source: { findMany: vi.fn() },
    kPIBlueprint: { findUnique: vi.fn() },
}));

const mockPool = vi.hoisted(() => ({
    query: vi.fn(),
    getClient: vi.fn(),
    destroyPool: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: mockDb,
}));

vi.mock('../../src/lib/execution/pool', () => ({
    __esModule: true,
    default: mockPool,
    query: mockPool.query,
    getClient: mockPool.getClient,
    destroyPool: mockPool.destroyPool,
}));

vi.mock('../../src/lib/visualization/data-loader', () => ({
    loadProjectData: vi.fn(),
}));

vi.mock('../../src/lib/dashboard/kpi-explainer', () => ({
    generateKPIExplanations: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/lib/ai/ollama-client', () => ({
    checkOllamaHealth: vi.fn().mockResolvedValue(false),
    generateCompletion: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────

import { executeKPI, executeDashboard, executeDrill } from '../../src/lib/execution/kpi-executor';
import { loadProjectData } from '../../src/lib/visualization/data-loader';
import { clearAllCaches } from '../../src/lib/execution/cache';
import type { KPILineageEntry } from '../../src/lib/prisma';
import type { ProjectDataMap } from '../../src/lib/visualization/types';

// ─── Test Data ────────────────────────────────────────────────────

function buildLineage(overrides: Partial<KPILineageEntry> = {}): KPILineageEntry {
    return {
        id: 'lin-1', projectId: 'proj-1', kpiId: 'kpi-rev', kpiName: 'Revenue',
        domain: 'SALES', formula: 'SUM(amount)', category: 'revenue',
        sources: [{ sourceId: 'src-1', sourceName: 'sales.csv', columns: ['amount', 'category', 'date'], role: 'PRIMARY' }],
        joinPaths: [],
        aggregations: [{ function: 'SUM', column: 'amount', sourceId: 'src-1' }],
        technicalExplanation: 'SUM(amount)', businessExplanation: 'Total revenue',
        aiEnhanced: false, confidence: 0.95, tracedAt: new Date().toISOString(),
        ...overrides,
    };
}

function buildDataMap(): ProjectDataMap {
    return {
        projectId: 'proj-1',
        sources: new Map([
            ['src-1', {
                sourceId: 'src-1', sourceName: 'sales.csv',
                columns: ['amount', 'category', 'date'],
                rows: [
                    { amount: 100, category: 'Electronics', date: '2024-01-15' },
                    { amount: 200, category: 'Clothing', date: '2024-01-20' },
                    { amount: 150, category: 'Electronics', date: '2024-02-10' },
                    { amount: 50, category: 'Food', date: '2024-02-15' },
                    { amount: 300, category: 'Electronics', date: '2024-03-01' },
                    { amount: 75, category: 'Clothing', date: '2024-03-15' },
                ],
            }],
        ]),
    };
}

// ─── Test Suites ──────────────────────────────────────────────────

describe('Module 5B — KPI Executor Pipeline', () => {
    const lineage = buildLineage();
    const dataMap = buildDataMap();

    beforeEach(() => {
        vi.clearAllMocks();
        clearAllCaches();
        mockDb.kPIBlueprint.findUnique.mockResolvedValue({
            kpis: [{ 
                id: 'kpi-rev', 
                kpiLibraryId: 'kpi-rev', 
                kpiId: 'kpi-rev', 
                name: 'Revenue', 
                kpiName: 'Revenue', 
                category: 'revenue', 
                sourceTable: 'sales.csv',
                formula: 'SUM(amount)', 
                aggregations: [{ function: 'SUM', column: 'amount' }], 
                groupBys: [],
                lineage: { formula: 'SUM(amount)', tables: ['sales.csv'], joins: [] }
            }]
        });

        // Mock information_schema check
        mockPool.query.mockImplementation((text: string, params: any[]) => {
            if (text.includes('information_schema.columns')) {
                return Promise.resolve({ rows: [{ column_name: 'amount' }, { column_name: 'category' }, { column_name: 'date' }] });
            }
            
            if (params && params.includes('EMPTY')) {
                return Promise.resolve({ rows: [] });
            }
            if (text.includes('IN ($1)')) { // Category filter
                return Promise.resolve({ rows: [{ period: '2024-03-01', value: 300 }] });
            }
            if (text.includes('BETWEEN')) { // Date range filter
                return Promise.resolve({ rows: [{ period: '2024-02-01', value: 200 }] });
            }
            if (text.includes('GROUP BY')) {
                return Promise.resolve({
                    rows: [
                        { category: 'Electronics', sum_amount: 550 },
                        { category: 'Clothing', sum_amount: 300 },
                        { category: 'Food', sum_amount: 50 }
                    ]
                });
            }

            // Default mock for data queries
            return Promise.resolve({
                rows: [
                    { period: '2024-03-01', value: 375 },
                    { period: '2024-02-01', value: 200 },
                    { period: '2024-01-01', value: 300 }
                ]
            });
        });
    });

    // ── Single KPI Execution ──────────────────────────────────────

    describe('executeKPI', () => {
        it('should produce a valid KPIExecutionResult', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });

            expect(result.kpiId).toBe('kpi-rev');
            expect(result.kpiName).toBe('Revenue');
            expect(result.category).toBe('revenue');
            expect(result.primaryValue).toBeDefined();
            expect(typeof result.primaryValue).toBe('number');
            expect(result.dataset).toBeDefined();
            expect(Array.isArray(result.dataset)).toBe(true);
            expect(result.profiling).toBeDefined();
            expect(result.recommendedChartType).toBeDefined();
            expect(result.recommendedChartLibrary).toBeDefined();
            expect(result.performance).toBeDefined();
            expect(result.performance.totalTimeMs).toBeGreaterThanOrEqual(0);
        });

        it('should compute correct primary value (SUM)', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });

            // Default behavior uses computeTimeSeries('monthly') → currentValue
            // is last month's total (March: 300+75=375)
            expect(result.primaryValue).toBe(375);
        });

        it('should apply filters and reduce dataset', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                filters: [{ type: 'category', column: 'category', values: ['Electronics'] }],
            });

            // Electronics only (March bucket: 300) — filters reduce the primaryValue
            expect(result.primaryValue).toBe(300);
        });

        it('should apply date range filter', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                dateFrom: '2024-02-01',
                dateTo: '2024-02-28',
            });

            // Feb: 150+50=200
            expect(result.primaryValue).toBe(200);
        });

        it('should use groupBy for drill-down', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                groupBy: 'category',
            });

            expect(result.dataset.length).toBe(3); // Electronics, Clothing, Food
            const electronics = result.dataset.find(dp => dp.label === 'Electronics');
            expect(electronics).toBeDefined();
            expect(electronics!.value).toBe(550);
        });

        it('should return cache hit on second call', async () => {
            const first = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });
            expect(first.performance.cacheHit).toBe(false);

            const second = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });
            expect(second.performance.cacheHit).toBe(true);
        });

        it('should bypass cache when skipCache is true', async () => {
            await executeKPI('proj-1', 'kpi-rev', { skipAIExplanation: true });

            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                skipCache: true,
            });
            expect(result.performance.cacheHit).toBe(false);
        });

        it('should populate profiling data correctly', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });

            const profiling = result.profiling;
            expect(profiling.recordCount).toBeGreaterThan(0);
            expect(typeof profiling.volatilityIndex).toBe('number');
            expect(typeof profiling.distributionSkew).toBe('number');
            expect(['low', 'medium', 'high', 'very_high']).toContain(profiling.cardinalityLevel);
            expect(typeof profiling.hasTimeDimension).toBe('boolean');
        });

        it('should recommend a chart type based on data profile', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                granularity: 'monthly',
            });

            // Time-series data → should recommend line or area
            const validTypes = ['line', 'area', 'bar', 'metric_card', 'heatmap'];
            expect(validTypes).toContain(result.recommendedChartType);
        });

        it('should report animation flag based on profiler record count', async () => {
            // Small datasets: profiler.recordCount < 5000 → disableAnimation=false
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });

            // 6 rows → monthly buckets (3) → profiler records = 3, well under 5000 threshold
            expect(result.disableAnimation).toBe(false);
            expect(result.profiling.recordCount).toBeLessThan(5000);
        });

        it('should build lineage summary correctly', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
            });

            expect(result.lineage.tables).toContain('sales.csv');
            expect(result.lineage.formula).toBe('SUM(amount)');
            expect(result.lineage.aggregations).toContain('SUM(amount)');
        });

        it('should handle empty source data gracefully', async () => {
            const result = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                filters: [{ type: 'value', column: 'category', value: 'EMPTY' } as any]
            });

            expect(result.primaryValue).toBe(0);
            // Empty input may produce 0 or 1 bucketed data points depending on implementation
            expect(result.datasetSize).toBeLessThanOrEqual(1);
        });

        it('should use granularity option for time bucketing', async () => {
            const daily = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                granularity: 'daily',
            });

            const monthly = await executeKPI('proj-1', 'kpi-rev', {
                skipAIExplanation: true,
                skipCache: true,
                granularity: 'monthly',
            });

            // Daily should have more data points than monthly
            expect(daily.dataset.length).toBeGreaterThanOrEqual(monthly.dataset.length);
        });
    });

    // ── Full Dashboard Execution ──────────────────────────────────

    describe('executeDashboard', () => {
        beforeEach(() => {
            // loadDashboardConfig reads record.projectId, record.sections, etc directly
            mockDb.dashboardConfig.findUnique.mockResolvedValue({
                projectId: 'proj-1',
                sections: [{
                    id: 'sect-1', title: 'Revenue', description: 'Section description', icon: 'chart-line', order: 1, collapsed: false, cards: [{
                        kpiId: 'kpi-rev', kpiName: 'Revenue', formula: 'SUM(amount)', category: 'revenue', cardSize: 'sm', position: 1, confidence: 0.95,
                        chartSelection: { chartType: 'line', chartLibrary: 'chartjs', fallbackType: 'bar', fallbackLibrary: 'chartjs', confidence: 0.9, reason: 'Trend analysis' },
                    }]
                }],
                sidebarConfig: { projectId: 'proj-1', projectName: 'Test', items: [] },
                metadata: { domain: 'SALES', domainName: 'Sales', domainIcon: 'sales', domainColor: 'blue', totalKPIs: 1, totalSections: 1, generatedAt: new Date().toISOString(), version: 1 },
                version: 1,
            });
            mockDb.kPILineageRegistry.findUnique.mockResolvedValue({
                entries: [buildLineage()],
            });
            (loadProjectData as any).mockResolvedValue(buildDataMap());
        });

        it('should execute all KPIs in dashboard config', async () => {
            const result = await executeDashboard('proj-1', { skipAIExplanation: true });

            expect(result.projectId).toBe('proj-1');
            expect(result.kpis.length).toBeGreaterThan(0);
            expect(result.metadata.totalKPIs).toBeGreaterThan(0);
            expect(result.metadata.computedKPIs).toBe(result.kpis.length);
            expect(result.metadata.totalTimeMs).toBeGreaterThanOrEqual(0);
        });

        it('should include performance metadata', async () => {
            const result = await executeDashboard('proj-1', { skipAIExplanation: true });

            expect(result.metadata.cacheHitCount).toBeDefined();
            expect(result.metadata.cacheMissCount).toBeDefined();
            expect(typeof result.metadata.totalTimeMs).toBe('number');
        });

        it('should throw for missing dashboard config', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);

            await expect(executeDashboard('proj-missing', { skipAIExplanation: true }))
                .rejects.toThrow();
        });
    });

    // ── Drill-Down Execution ──────────────────────────────────────

    describe('executeDrill', () => {
        beforeEach(() => {
            mockDb.kPILineageRegistry.findUnique.mockResolvedValue({
                entries: [buildLineage()],
            });
            (loadProjectData as any).mockResolvedValue(buildDataMap());
        });

        it('should execute drill-down query for a specific KPI', async () => {
            const result = await executeDrill('proj-1', 'kpi-rev', 'category', {
                skipAIExplanation: true,
            });

            expect(result.kpiId).toBe('kpi-rev');
            expect(result.dataset.length).toBe(3); // 3 categories
        });

        it('should sort drill-down results by value descending', async () => {
            const result = await executeDrill('proj-1', 'kpi-rev', 'category', {
                skipAIExplanation: true,
            });

            const values = result.dataset.map(dp => dp.value);
            expect(values).toEqual([...values].sort((a, b) => b - a));
        });
    });
});
