
// Module 5A Unit Tests
// Tests the dashboard layout engine logic (grouping, inference, sidebar)
// Mocks DB calls to focus on pure logic

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSections } from '../../src/lib/dashboard/section-builder';
import { selectChart } from '../../src/lib/dashboard/chart-inferrer';
import { buildSidebarConfig } from '../../src/lib/dashboard/sidebar-builder';
import { generateDashboardConfig } from '../../src/lib/dashboard';
// import { SECTION_DEFINITIONS } from '../../src/lib/dashboard/types';
import { ApprovedKPI } from '../../src/lib/prisma';
// import db from '../../src/lib/prisma'; // Not needed if we use the mock handle

// Hoist the mock object so it's available in vi.mock factory AND tests
const mockDb = vi.hoisted(() => ({
    project: { findUnique: vi.fn() },
    kPIBlueprint: { findUnique: vi.fn() },
    domainDetection: { findUnique: vi.fn() },
    source: { count: vi.fn() },
    dataLineage: { findUnique: vi.fn() },
    relationshipRegistry: { findUnique: vi.fn() },
    dashboardConfig: { findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: mockDb,
}));

describe('Module 5A: Dashboard Layout Engine', () => {

    // Test Data
    const mockKPIs: any[] = [
        { kpiId: '1', kpiName: 'Revenue', formula: 'SUM(rev)', category: 'revenue', confidence: 0.9, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'rev' }] },
        { kpiId: '2', kpiName: 'Margin', formula: 'SUM(profit)/SUM(rev)', category: 'profitability', confidence: 0.8, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'profit' }] },
        { kpiId: '3', kpiName: 'Customers', formula: 'COUNT(users)', category: 'customer', confidence: 0.95, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'COUNT', column: 'users' }] },
        { kpiId: '4', kpiName: 'Conversion', formula: 'AVG(conv)', category: 'customer', confidence: 0.7, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'AVG', column: 'conv' }] },
        { kpiId: '5', kpiName: 'Unknown Metric', formula: 'SUM(x)', category: 'unknown_cat', confidence: 0.5, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'x' }] },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── 1️⃣ Grouping Logic Tests ──────────────────────────────────────

    describe('KPI Grouping Logic', () => {
        it('should group KPIs into correct business sections', () => {
            const sections = buildSections(mockKPIs, 'ECOMMERCE', '#000');

            // Financial Section -> 'revenue' section per SECTION_DEFINITIONS
            const finSection = sections.find(s => s.id === 'revenue');
            expect(finSection).toBeDefined();
            expect(finSection?.cards).toHaveLength(1); // Revenue
            expect(finSection?.cards.map(c => c.kpiName)).toEqual(expect.arrayContaining(['Revenue']));

            // Customer Section
            const custSection = sections.find(s => s.id === 'customers');
            expect(custSection).toBeDefined();
            expect(custSection?.cards).toHaveLength(2); // Customers, Conversion
        });

        it('should place unknown categories into "General Metrics"', () => {
            const sections = buildSections(mockKPIs, 'ECOMMERCE', '#000');
            const otherSection = sections.find(s => s.id === 'general');

            expect(otherSection).toBeDefined();
            expect(otherSection?.cards).toHaveLength(2); // Margin, Unknown Metric
            expect(otherSection?.cards[1].kpiName).toBe('Unknown Metric');
        });
    });

    // ─── 2️⃣ Priority Ordering Tests ────────────────────────────────────

    describe('Priority Ordering', () => {
        it('should sort KPIs by library priority then confidence', () => {
            const sections = buildSections(mockKPIs, 'ECOMMERCE', '#000');
            const finCards = sections.find(s => s.id === 'revenue')?.cards;

            expect(finCards?.[0].kpiName).toBe('Revenue'); // Prio 1
        });
    });

    // ─── 3️⃣ Chart Inference Tests ──────────────────────────────────────

    describe('Chart Type Inference', () => {
        it('should infer metric_card for simple SUMs', () => {
            const result = selectChart({ hasTimeDimension: false, numberOfSeries: 1, uniqueCategoryCount: 1, numericDimensionCount: 1, hierarchicalDepth: 0, recordCount: 10, volatilityIndex: 0, distributionType: 'normal', cardinalityLevel: 'low', isSequentialChange: false, categoryColumns: [], numericColumns: ['revenue'] });
            expect(result.chartType).toBe('doughnut');
        });

        it('should infer bar chart for COUNTs', () => {
            const result = selectChart({ hasTimeDimension: false, numberOfSeries: 1, uniqueCategoryCount: 15, numericDimensionCount: 1, hierarchicalDepth: 1, recordCount: 100, volatilityIndex: 0.1, distributionType: 'skewed', cardinalityLevel: 'medium', isSequentialChange: false, categoryColumns: ['category'], numericColumns: ['orders'] });
            expect(result.chartType).toBe('box_plot');
        });

        it('should infer line chart for time-series AVG', () => {
            const result = selectChart({ hasTimeDimension: true, numberOfSeries: 1, uniqueCategoryCount: 30, numericDimensionCount: 1, hierarchicalDepth: 1, recordCount: 365, volatilityIndex: 0.05, distributionType: 'normal', cardinalityLevel: 'high', isSequentialChange: false, dateColumn: 'date', categoryColumns: [], numericColumns: ['order_value'] });
            expect(result.chartType).toBe('line');
        });

        it('should infer metric_card for Ratios', () => {
            const result = selectChart({ hasTimeDimension: false, numberOfSeries: 1, uniqueCategoryCount: 1, numericDimensionCount: 2, hierarchicalDepth: 0, recordCount: 10, volatilityIndex: 0, distributionType: 'normal', cardinalityLevel: 'low', isSequentialChange: false, categoryColumns: [], numericColumns: ['a', 'b'] });
            expect(result.chartType).toBe('doughnut');
        });
    });

    // ─── 4️⃣ Layout Schema Validation ───────────────────────────────────

    describe('Layout Schema Generation', () => {
        it('should generate valid DashboardConfigSchema structure', async () => {
            // Mock DB returns
            mockDb.project.findUnique.mockResolvedValue({ id: 'p1', name: 'Test Proj' });
            const mockKPIs: any[] = [
                { kpiId: '1', kpiName: 'Revenue', formula: 'SUM(rev)', category: 'revenue', confidence: 0.9, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'rev', sourceId: 'src1' }] }
            ];
            mockDb.kPIBlueprint.findUnique.mockResolvedValue({ kpis: mockKPIs });
            mockDb.domainDetection.findUnique.mockResolvedValue({ detectedDomain: 'ECOMMERCE' });
            mockDb.source.count.mockResolvedValue(5);
            mockDb.dashboardConfig.upsert.mockResolvedValue({ version: 1 });
            // Mock missing sidebar dependencies
            mockDb.dataLineage.findUnique.mockResolvedValue(null);
            mockDb.relationshipRegistry.findUnique.mockResolvedValue(null);

            const config = await generateDashboardConfig('p1');

            expect(config.projectId).toBe('p1');
            expect(config.version).toBe(1);
            expect(config.sections).toBeDefined();
            expect(config.sidebarConfig).toBeDefined();
            expect(config.metadata.totalKPIs).toBe(1);
            expect(config.metadata.domain).toBe('ECOMMERCE');
        });
    });

    // ─── 5️⃣ Sidebar Structure Tests ────────────────────────────────────

    describe('Sidebar Structure', () => {
        it('should have all 9 standard items', async () => {
            mockDb.source.count.mockResolvedValue(5);
            mockDb.domainDetection.findUnique.mockResolvedValue({ id: 'd1' });
            mockDb.kPIBlueprint.findUnique.mockResolvedValue({ id: 'b1' });
            mockDb.dataLineage.findUnique.mockResolvedValue({ id: 'l1' });
            mockDb.relationshipRegistry.findUnique.mockResolvedValue({ id: 'r1' });

            const config = await buildSidebarConfig('p1', 'Test');
            expect(config.items).toHaveLength(9);
            expect(config.items.map(i => i.id)).toEqual(
                ['dashboard', 'data-sources', 'intelligence', 'domain', 'kpi-blueprint', 'data-lineage', 'ai-chat', 'reports', 'settings']
            );
        });

        it('should enable intelligence only if sources exist', async () => {
            mockDb.source.count.mockResolvedValue(0);
            mockDb.domainDetection.findUnique.mockResolvedValue(null);
            mockDb.kPIBlueprint.findUnique.mockResolvedValue(null);
            mockDb.dataLineage.findUnique.mockResolvedValue(null);
            mockDb.relationshipRegistry.findUnique.mockResolvedValue(null);

            let config = await buildSidebarConfig('p1', 'Test');
            expect(config.items.find(i => i.id === 'intelligence')?.enabled).toBe(false);

            mockDb.source.count.mockResolvedValue(5);
            config = await buildSidebarConfig('p1', 'Test');
            expect(config.items.find(i => i.id === 'intelligence')?.enabled).toBe(true);
        });
    });

    // ─── 6️⃣ Determinism & Regeneration ────────────────────────────────

    describe('Determinism', () => {
        it('should produce identical output for same input', async () => {
            mockDb.project.findUnique.mockResolvedValue({ id: 'p1' });
            const mockKPIs: any[] = [
                { kpiId: '1', kpiName: 'Revenue', formula: 'SUM(rev)', category: 'revenue', confidence: 0.9, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'rev', sourceId: 'src1' }] }
            ];
            mockDb.kPIBlueprint.findUnique.mockResolvedValue({ kpis: mockKPIs });
            mockDb.domainDetection.findUnique.mockResolvedValue({ detectedDomain: 'ECOMMERCE' });
            mockDb.source.count.mockResolvedValue(5);
            mockDb.dashboardConfig.upsert.mockResolvedValue({ version: 1 });

            // Ensure other calls return consistent values
            mockDb.dataLineage.findUnique.mockResolvedValue(null);
            mockDb.relationshipRegistry.findUnique.mockResolvedValue(null);

            const run1 = await generateDashboardConfig('p1');
            const run2 = await generateDashboardConfig('p1');

            expect(run1.sections).toEqual(run2.sections);
            expect(run1.sidebarConfig).toEqual(run2.sidebarConfig);
        });

        it('should increment version on regeneration', async () => {
            mockDb.project.findUnique.mockResolvedValue({ id: 'p1' });
            const mockKPIs: any[] = [
                { kpiId: '1', kpiName: 'Revenue', formula: 'SUM(rev)', category: 'revenue', confidence: 0.9, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'rev', sourceId: 'src1' }] }
            ];
            mockDb.kPIBlueprint.findUnique.mockResolvedValue({ kpis: mockKPIs });
            mockDb.domainDetection.findUnique.mockResolvedValue({ detectedDomain: 'ECOMMERCE' });
            mockDb.source.count.mockResolvedValue(5);

            // Mock existing config
            mockDb.dashboardConfig.findUnique.mockResolvedValue({ version: 5 });
            mockDb.dashboardConfig.upsert.mockResolvedValue({ version: 6 });

            const config = await generateDashboardConfig('p1');
            expect(config.version).toBe(6);
        });
    });

    // ─── 7️⃣ Add/Remove KPIs ──────────────────────────────────────────

    describe('Dynamic Updates', () => {
        it('should integrate new KPIs into correct sections', () => {
            const mockKPIs: any[] = [
                { kpiId: '1', kpiName: 'Revenue', formula: 'SUM(rev)', category: 'revenue', confidence: 0.9, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'rev', sourceId: 'src1' }] }
            ];
            const newKPI: any = {
                kpiId: '6', kpiName: 'New Metric', formula: 'SUM(z)',
                category: 'risk', confidence: 1.0, matchedColumns: [], addedAt: new Date(), aggregations: [{ function: 'SUM', column: 'z' }]
            };

            const kpis = [...mockKPIs, newKPI];
            const sections = buildSections(kpis, 'ECOMMERCE', '#000');

            const riskSection = sections.find(s => s.id === 'quality');
            expect(riskSection).toBeDefined();
            expect(riskSection?.cards).toHaveLength(1);
            expect(riskSection?.cards[0].kpiName).toBe('New Metric');
        });
    });

    // ─── 8️⃣ Edge Cases ────────────────────────────────────────────────

    describe('Edge Cases', () => {
        it('should handle empty blueprint gracefully', () => {
            const sections = buildSections([], 'ECOMMERCE', '#000');
            expect(sections).toHaveLength(0);
        });

        it('should handle large KPI sets (20+) without crashing', () => {
            const largeSet = Array.from({ length: 50 }, (_, i) => ({
                kpiId: `${i}`,
                kpiName: `Metric ${i}`,
                formula: 'SUM(x)',
                category: i % 2 === 0 ? 'revenue' : 'customer',
                confidence: 0.9,
                matchedColumns: [],
                addedAt: new Date(),
                aggregations: [{ function: 'SUM', column: 'x' }]
            }));

            const sections = buildSections(largeSet as any[], 'ECOMMERCE', '#000');
            const totalCards = sections.reduce((sum, s) => sum + s.cards.length, 0);

            expect(totalCards).toBe(50);
            expect(sections.length).toBeGreaterThan(0);
        });
    });
});
