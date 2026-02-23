// Module 5B — Explanation Cache Tests
// Tests the 3-layer cache (in-memory, Prisma, generate) for KPI explanations

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
    dashboardConfig: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: mockDb,
}));

vi.mock('../../src/lib/dashboard/kpi-explainer', () => ({
    generateKPIExplanations: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────

import { getKPIExplanation, batchGenerateExplanations } from '../../src/lib/execution/explanation-cache';
import { generateKPIExplanations } from '../../src/lib/dashboard/kpi-explainer';
import { clearAllCaches, setCachedExplanation, buildCacheKey } from '../../src/lib/execution/cache';

// ─── Test Data ────────────────────────────────────────────────────

const mockExplanation = {
    kpiId: 'kpi-rev',
    explanation: 'Total revenue from all sales',
    formulaSummary: 'SUM(amount)',
    dataSourceRef: 'sales.csv',
    businessDefinition: 'Aggregate sales revenue',
    recommendation: 'Track weekly for seasonal patterns',
};

const kpiContext = {
    kpiName: 'Revenue',
    formula: 'SUM(amount)',
    category: 'revenue',
    columns: ['amount'],
    currentValue: 875,
};

// ─── Tests ────────────────────────────────────────────────────────

describe('Module 5B — Explanation Cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearAllCaches();
    });

    describe('Layer 1: In-Memory Cache', () => {
        it('should return cached explanation from memory', async () => {
            const cacheKey = buildCacheKey('proj-1', 'kpi-rev', { type: 'explanation' });
            setCachedExplanation(cacheKey, mockExplanation);

            const result = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);

            expect(result).toEqual(mockExplanation);
            // Should NOT hit DB
            expect(mockDb.dashboardConfig.findUnique).not.toHaveBeenCalled();
        });
    });

    describe('Layer 2: Persistent Store (Prisma)', () => {
        it('should fetch from DashboardConfig metadata', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue({
                metadata: {
                    kpiExplanations: { 'kpi-rev': mockExplanation },
                },
            });

            const result = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);

            expect(result).toEqual(mockExplanation);
            expect(mockDb.dashboardConfig.findUnique).toHaveBeenCalled();
        });

        it('should cache the Prisma result in memory for next call', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue({
                metadata: {
                    kpiExplanations: { 'kpi-rev': mockExplanation },
                },
            });

            // First call: hits Prisma
            await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);

            // Second call: should use in-memory cache
            vi.clearAllMocks();
            const second = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);

            expect(second).toEqual(mockExplanation);
            expect(mockDb.dashboardConfig.findUnique).not.toHaveBeenCalled();
        });
    });

    describe('Layer 3: Generate via AI', () => {
        it('should generate and store when not cached or stored', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);
            (generateKPIExplanations as any).mockResolvedValue({
                'kpi-rev': mockExplanation,
            });

            const result = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);

            expect(result).toEqual(mockExplanation);
            expect(generateKPIExplanations).toHaveBeenCalled();
        });

        it('should return null if generation fails', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);
            (generateKPIExplanations as any).mockRejectedValue(new Error('AI unavailable'));

            const result = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);
            expect(result).toBeNull();
        });

        it('should return null if generation returns empty', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);
            (generateKPIExplanations as any).mockResolvedValue({});

            const result = await getKPIExplanation('proj-1', 'kpi-rev', kpiContext);
            expect(result).toBeNull();
        });
    });

    describe('Batch Generation', () => {
        it('should generate explanations for multiple KPIs', async () => {
            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);
            (generateKPIExplanations as any).mockResolvedValue({
                'kpi-rev': { ...mockExplanation, kpiId: 'kpi-rev' },
                'kpi-margin': { ...mockExplanation, kpiId: 'kpi-margin' },
            });

            const results = await batchGenerateExplanations('proj-1', [
                { kpiId: 'kpi-rev', kpiName: 'Revenue', formula: 'SUM(amount)', category: 'revenue', columns: ['amount'] },
                { kpiId: 'kpi-margin', kpiName: 'Margin', formula: 'SUM(profit)/SUM(rev)', category: 'profitability', columns: ['profit', 'rev'] },
            ]);

            expect(Object.keys(results)).toHaveLength(2);
            expect(results['kpi-rev']).toBeDefined();
            expect(results['kpi-margin']).toBeDefined();
        });

        it('should skip already-cached KPIs in batch', async () => {
            // Pre-cache one
            const cacheKey = buildCacheKey('proj-1', 'kpi-rev', { type: 'explanation' });
            setCachedExplanation(cacheKey, mockExplanation);

            mockDb.dashboardConfig.findUnique.mockResolvedValue(null);
            (generateKPIExplanations as any).mockResolvedValue({
                'kpi-margin': { ...mockExplanation, kpiId: 'kpi-margin' },
            });

            const results = await batchGenerateExplanations('proj-1', [
                { kpiId: 'kpi-rev', kpiName: 'Revenue', formula: 'SUM(amount)', category: 'revenue', columns: ['amount'] },
                { kpiId: 'kpi-margin', kpiName: 'Margin', formula: 'SUM(profit)/SUM(rev)', category: 'profitability', columns: ['profit', 'rev'] },
            ]);

            expect(results['kpi-rev']).toEqual(mockExplanation);
            expect(results['kpi-margin']).toBeDefined();

            // generateKPIExplanations should only be called with one KPI (margin)
            const callArgs = (generateKPIExplanations as any).mock.calls[0]?.[0];
            if (callArgs) {
                expect(callArgs.length).toBe(1);
                expect(callArgs[0].kpiId).toBe('kpi-margin');
            }
        });
    });
});
