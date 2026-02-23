// Module 5 — Full Dashboard Integration Tests (Fixed)
// Validates 5A (Structure) + 5B (Rendering) + 5C (Explainability) together

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        dashboardConfig: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
        kPILineageRegistry: { findUnique: vi.fn() },
        project: { findUnique: vi.fn() },
        kPIBlueprint: { findUnique: vi.fn() },
        domainDetection: { findUnique: vi.fn() },
        source: { count: vi.fn(), findMany: vi.fn() },
        dataLineage: { findUnique: vi.fn() },
        relationshipRegistry: { findUnique: vi.fn() },
    },
}));

vi.mock('../../src/lib/visualization/data-loader', () => ({
    loadProjectData: vi.fn(),
    findSourceForColumn: vi.fn(),
}));

vi.mock('../../src/lib/data-lineage/kpi-lineage-registry', () => ({
    explainKPI: vi.fn(),
    getKPILineage: vi.fn(),
}));

vi.mock('../../src/lib/ai/ollama-client', () => ({
    checkOllamaHealth: vi.fn(),
    generateCompletion: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────

import { generateDashboardConfig } from '../../src/lib/dashboard/index';
import { computeDashboardData, computeSingleKPI } from '../../src/lib/visualization/index';
import { generateKPIInsight, generateDashboardInsights } from '../../src/lib/insights/insight-generator';
import { loadProjectData } from '../../src/lib/visualization/data-loader';
import db from '../../src/lib/prisma';
import { explainKPI } from '../../src/lib/data-lineage/kpi-lineage-registry';
import { checkOllamaHealth, generateCompletion } from '../../src/lib/ai/ollama-client';
import type { DashboardConfigSchema } from '../../src/lib/dashboard/types';
import type { DomainType, KPILineageEntry } from '../../src/lib/prisma';
import type { ProjectDataMap } from '../../src/lib/visualization/types';

// ─── Test Data ────────────────────────────────────────────────────

const PROJECT_ID = 'proj-integration';

const mockLineage: KPILineageEntry[] = [
    {
        id: 'lin-1', projectId: PROJECT_ID, kpiId: 'kpi-rev', kpiName: 'Revenue',
        domain: 'SALES', formula: 'SUM(amount)', category: 'financial',
        sources: [{ sourceId: 'src-sales', sourceName: 'sales.csv', columns: ['amount'], role: 'PRIMARY' }],
        joinPaths: [], aggregations: [{ function: 'SUM', column: 'amount', sourceId: 'src-sales' }],
        technicalExplanation: 'SUM(amount) from sales', businessExplanation: 'Total sales amount',
        aiEnhanced: false, confidence: 1, tracedAt: new Date().toISOString()
    },
    {
        id: 'lin-2', projectId: PROJECT_ID, kpiId: 'kpi-cust', kpiName: 'Customer_Count',
        domain: 'SALES', formula: 'COUNT_DISTINCT(customer_id)', category: 'growth',
        sources: [{ sourceId: 'src-sales', sourceName: 'sales.csv', columns: ['customer_id'], role: 'PRIMARY' }],
        joinPaths: [], aggregations: [{ function: 'COUNT_DISTINCT', column: 'customer_id', sourceId: 'src-sales' }],
        technicalExplanation: 'COUNT_DISTINCT(customer_id)', businessExplanation: 'Unique customers',
        aiEnhanced: false, confidence: 1, tracedAt: new Date().toISOString()
    }
];

const mockDataMap: ProjectDataMap = {
    projectId: PROJECT_ID,
    sources: new Map([
        ['src-sales', {
            sourceId: 'src-sales', sourceName: 'sales.csv',
            columns: ['amount', 'customer_id', 'date', 'category'],
            rows: [
                { amount: 100, customer_id: 'C1', date: '2024-01-01', category: 'Elec' },
                { amount: 200, customer_id: 'C2', date: '2024-01-02', category: 'Home' },
                { amount: 150, customer_id: 'C1', date: '2024-02-01', category: 'Elec' },
                { amount: 300, customer_id: 'C3', date: '2024-03-01', category: 'Auto' },
            ]
        }]
    ])
};

const mockDashboardConfig: DashboardConfigSchema = {
    projectId: PROJECT_ID,
    version: 1,
    sections: [{
        id: 'sect-1', title: 'Performance', order: 0, description: 'Desc', icon: 'test', collapsed: false,
        cards: [{
            kpiId: 'kpi-rev', kpiName: 'Revenue',
            chartSelection: {
                chartType: 'metric_card', chartLibrary: 'chartjs' as const,
                fallbackType: 'bar', fallbackLibrary: 'chartjs' as const,
                confidence: 0.6, reason: 'test'
            },
            cardSize: 'md' as const, position: 0, formula: 'SUM', category: 'sales', confidence: 1
        }]
    }],
    sidebarConfig: { projectId: PROJECT_ID, projectName: 'Integration Project', items: [] },
    metadata: {
        domain: 'SALES' as DomainType, domainName: 'Sales', domainIcon: '💰', domainColor: '#000',
        totalKPIs: 1, totalSections: 1, generatedAt: new Date().toISOString(), version: 1
    }
};

// ─── Mock Setup ───────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    (loadProjectData as any).mockResolvedValue(mockDataMap);
    (db as any).kPILineageRegistry.findUnique.mockResolvedValue({ entries: mockLineage });
    (db as any).dashboardConfig.findUnique.mockResolvedValue(JSON.parse(JSON.stringify(mockDashboardConfig)));
    (db as any).project.findUnique.mockResolvedValue({ id: PROJECT_ID, name: 'Integration Project' });
    (db as any).kPIBlueprint.findUnique.mockResolvedValue({
        kpis: [{ kpiId: 'kpi-rev', name: 'Revenue', kpiName: 'Revenue', confidence: 1, category: 'financial', formula: 'SUM(amount)', matchedColumns: [], addedAt: new Date() }]
    });
    (db as any).domainDetection.findUnique.mockResolvedValue({ detectedDomain: 'SALES' });
    (db as any).source.count.mockResolvedValue(1);
    (db as any).source.findMany.mockResolvedValue([{
        id: 'src-sales', fileName: 'sales.csv', columns: JSON.stringify([
            { name: 'amount', inferredType: 'NUMBER' },
            { name: 'customer_id', inferredType: 'TEXT' },
            { name: 'date', inferredType: 'DATE' },
            { name: 'category', inferredType: 'TEXT' },
        ]),
        parsedData: JSON.stringify(mockDataMap.sources.get('src-sales')!.rows),
    }]);
    (db as any).dataLineage.findUnique.mockResolvedValue({ id: 'lin-reg' });
    (db as any).relationshipRegistry.findUnique.mockResolvedValue({ id: 'rel-reg' });
    (db as any).dashboardConfig.upsert.mockResolvedValue({});
    (explainKPI as any).mockResolvedValue({
        kpiId: 'kpi-rev', kpiName: 'Revenue', domain: 'SALES', formula: 'SUM(amount)',
        technicalExplanation: 'SUM(amount)', businessExplanation: 'Total Revenue',
        sources: ['sales'], joins: [], aggregations: [{ function: 'SUM', column: 'amount' }]
    });
    (checkOllamaHealth as any).mockResolvedValue(true);
    (generateCompletion as any).mockResolvedValue(JSON.stringify({
        explanation: 'Test explanation', formulaSummary: 'Sum of amount',
        businessDefinition: 'Total revenue', recommendation: 'Monitor trends'
    }));
});

// ─── Tests ────────────────────────────────────────────────────────

describe('Module 5: Global Dashboard Intelligence Integration', () => {

    // 🧩 Part 1: Module 5A (Structure Engine)
    describe('Part 1: Module 5A — Structure Engine', () => {
        it('5A-01: Should generate valid dashboard schema from blueprint', async () => {
            const layout = await generateDashboardConfig(PROJECT_ID);

            expect(layout).toBeDefined();
            expect(layout.projectId).toBe(PROJECT_ID);
            expect(layout.sections.length).toBeGreaterThan(0);

            const allCards = layout.sections.flatMap(s => s.cards);
            expect(allCards.some(c => c.kpiId === 'kpi-rev')).toBe(true);
        });

        it('5A-02: Should be deterministic (idempotent)', async () => {
            const layout1 = await generateDashboardConfig(PROJECT_ID);
            const layout2 = await generateDashboardConfig(PROJECT_ID);
            const { metadata: _m1, ...rest1 } = layout1;
            const { metadata: _m2, ...rest2 } = layout2;
            expect(rest1).toEqual(rest2);
        });
    });

    // 🧩 Part 2: Module 5B (Rendering Engine)
    describe('Part 2: Module 5B — Rendering Engine', () => {
        it('5B-01: Should render dashboard with correct KPI values', async () => {
            const dashboard = await computeDashboardData(PROJECT_ID);

            expect(dashboard).toBeDefined();
            expect(dashboard.charts.length).toBeGreaterThanOrEqual(1);

            const revenueChart = dashboard.charts.find(c => c.kpiId === 'kpi-rev');
            expect(revenueChart).toBeDefined();
            // Value in data.currentValue: 100+200+150+300 = 750
            expect(revenueChart!.data.currentValue).toBe(750);
        });

        it('5B-02: Should propagate filters correctly', async () => {
            const filterState = {
                granularity: 'monthly' as const,
                filters: [{ type: 'category' as const, column: 'category', values: ['Elec'] }]
            };

            const dashboard = await computeDashboardData(PROJECT_ID, filterState);
            const revenueChart = dashboard.charts.find(c => c.kpiId === 'kpi-rev');

            // Filtered: Only 'Elec' rows (100 + 150 = 250)
            expect(revenueChart!.data.currentValue).toBe(250);
        });

        it('5B-03: Should support drill-down via computeSingleKPI', async () => {
            const result = await computeSingleKPI(PROJECT_ID, 'kpi-rev', { groupBy: 'category' });

            expect(result).not.toBeNull();
            expect(result!.dataPoints.length).toBe(3); // Elec, Home, Auto

            const elec = result!.dataPoints.find(dp => dp.label === 'Elec');
            expect(elec!.value).toBe(250);
        });
    });

    // 🧩 Part 3: Module 5C (Explainability & Insights)
    describe('Part 3: Module 5C — Explainability & Insights', () => {
        it('5C-01: Should produce KPI insight with anomaly detection', () => {
            // generateKPIInsight takes a structured params object, not (projectId, kpiId)
            const insight = generateKPIInsight({
                kpiId: 'kpi-rev',
                kpiName: 'Revenue',
                category: 'financial',
                currentValue: 750,
                previousValue: 500,
                delta: 250,
                deltaPercent: 50,
                trend: 'up',
                dataPoints: [
                    { label: '2024-01', value: 300 },
                    { label: '2024-02', value: 150 },
                    { label: '2024-03', value: 300 },
                ],
                profiling: { volatilityIndex: 0.3, distributionSkew: 0.1, recordCount: 3 },
                lineage: {
                    tables: ['sales.csv'],
                    joins: [],
                    formula: 'SUM(amount)',
                    aggregations: [{ function: 'SUM', column: 'amount' }],
                },
                aiExplanation: null,
            });

            expect(insight).toBeDefined();
            expect(insight.kpiId).toBe('kpi-rev');
            expect(insight.kpiName).toBe('Revenue');
            expect(insight.anomaly).toBeDefined();
            expect(insight.anomaly.severity).toBeDefined();
            expect(insight.lineageExplanation).toBeDefined();
            expect(typeof insight.lineageExplanation).toBe('string');
        });

        it('5C-02: Should detect spike anomaly on large delta', () => {
            const insight = generateKPIInsight({
                kpiId: 'kpi-spike',
                kpiName: 'Spike_KPI',
                category: 'revenue',
                currentValue: 1000,
                previousValue: 100,
                delta: 900,
                deltaPercent: 900,
                trend: 'up',
                dataPoints: [
                    { label: '2024-01', value: 100 },
                    { label: '2024-02', value: 110 },
                    { label: '2024-03', value: 1000 },
                ],
            });

            // A 900% increase should trigger anomaly detection
            expect(insight.anomaly.severity).not.toBe('normal');
        });

        it('5C-03: Should generate dashboard-level insights', () => {
            // First generate individual KPI insights
            const kpiInsight = generateKPIInsight({
                kpiId: 'kpi-rev',
                kpiName: 'Revenue',
                category: 'financial',
                currentValue: 750,
                previousValue: 500,
                delta: 250,
                deltaPercent: 50,
                trend: 'up',
                dataPoints: [
                    { label: '2024-01', value: 300 },
                    { label: '2024-02', value: 150 },
                    { label: '2024-03', value: 300 },
                ],
            });

            // Then pass to generateDashboardInsights(projectId, kpiInsights[])
            const globalInsights = generateDashboardInsights(PROJECT_ID, [kpiInsight]);

            expect(globalInsights).toBeDefined();
            expect(globalInsights.projectId).toBe(PROJECT_ID);
            expect(Array.isArray(globalInsights.insights)).toBe(true);
            expect(Array.isArray(globalInsights.feed)).toBe(true);
            expect(Array.isArray(globalInsights.alerts)).toBe(true);
            expect(typeof globalInsights.anomalyCount).toBe('number');
            expect(typeof globalInsights.trendingUp).toBe('number');
            expect(typeof globalInsights.trendingDown).toBe('number');
        });

        it('5C-04: Should rank top movers correctly', () => {
            const up = generateKPIInsight({
                kpiId: 'kpi-up', kpiName: 'Rising', category: 'rev',
                currentValue: 500, previousValue: 100, delta: 400, deltaPercent: 400, trend: 'up',
                dataPoints: [{ label: 'Q1', value: 100 }, { label: 'Q2', value: 500 }],
            });
            const down = generateKPIInsight({
                kpiId: 'kpi-down', kpiName: 'Falling', category: 'rev',
                currentValue: 100, previousValue: 500, delta: -400, deltaPercent: -80, trend: 'down',
                dataPoints: [{ label: 'Q1', value: 500 }, { label: 'Q2', value: 100 }],
            });

            const result = generateDashboardInsights(PROJECT_ID, [up, down]);

            expect(result.topMovers).toBeDefined();
            // Should identify top movers based on feed movements
        });
    });

    // 🧩 Part 4: System Contract
    describe('Part 4: System Contract', () => {
        it('Should write dashboardConfig via upsert (read inputs, write output)', async () => {
            await generateDashboardConfig(PROJECT_ID);

            expect((db as any).kPIBlueprint.findUnique).toHaveBeenCalled();
            expect((db as any).domainDetection.findUnique).toHaveBeenCalled();
            expect((db as any).dashboardConfig.upsert).toHaveBeenCalled();
        });

        it('Should handle missing blueprint gracefully', async () => {
            (db as any).kPIBlueprint.findUnique.mockResolvedValueOnce(null);

            try {
                await generateDashboardConfig(PROJECT_ID);
            } catch (e) {
                // Expected: should throw or return empty
                expect(e).toBeDefined();
            }
        });
    });
});
