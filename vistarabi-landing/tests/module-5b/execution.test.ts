// Module 5B — Data Execution Engine Tests
// Unit + integration tests for cache, profiler, executor

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Cache Tests ──────────────────────────────────────────────────

describe('Module 5B — Cache Layer', () => {
    let cache: typeof import('../../src/lib/execution/cache');

    beforeEach(async () => {
        cache = await import('../../src/lib/execution/cache');
        cache.clearAllCaches();
    });

    it('should generate deterministic cache keys', () => {
        const key1 = cache.buildCacheKey('proj1', 'kpi1', { granularity: 'monthly' });
        const key2 = cache.buildCacheKey('proj1', 'kpi1', { granularity: 'monthly' });
        expect(key1).toBe(key2);
    });

    it('should return base key when no filters', () => {
        const key = cache.buildCacheKey('proj1', 'kpi1');
        expect(key).toBe('proj1:kpi1');
    });

    it('should store and retrieve cached results', () => {
        cache.setCachedResult('test-key', { value: 42 });
        const result = cache.getCachedResult('test-key');
        expect(result).toEqual({ value: 42 });
    });

    it('should return null for cache miss', () => {
        const result = cache.getCachedResult('nonexistent');
        expect(result).toBeNull();
    });

    it('should expire entries after TTL', async () => {
        cache.setCachedResult('ttl-test', { value: 1 }, 50); // 50ms TTL
        expect(cache.getCachedResult('ttl-test')).toEqual({ value: 1 });

        await new Promise(r => setTimeout(r, 60));
        expect(cache.getCachedResult('ttl-test')).toBeNull();
    });

    it('should invalidate by project prefix', () => {
        cache.setCachedResult('proj1:kpi1', { v: 1 });
        cache.setCachedResult('proj1:kpi2', { v: 2 });
        cache.setCachedResult('proj2:kpi1', { v: 3 });

        const invalidated = cache.invalidateProject('proj1');
        expect(invalidated).toBeGreaterThanOrEqual(2);
        expect(cache.getCachedResult('proj1:kpi1')).toBeNull();
        expect(cache.getCachedResult('proj2:kpi1')).toEqual({ v: 3 });
    });

    it('should invalidate specific KPI', () => {
        cache.setCachedResult('proj1:kpi1', { v: 1 });
        cache.setCachedResult('proj1:kpi2', { v: 2 });

        cache.invalidateKPI('proj1', 'kpi1');
        expect(cache.getCachedResult('proj1:kpi1')).toBeNull();
        expect(cache.getCachedResult('proj1:kpi2')).toEqual({ v: 2 });
    });

    it('should report cache statistics', () => {
        cache.setCachedResult('k1', { v: 1 });
        cache.setCachedExplanation('k2', { text: 'test' });

        const stats = cache.getCacheStats();
        expect(stats.queryEntries).toBe(1);
        expect(stats.explanationEntries).toBe(1);
        expect(stats.totalEntries).toBe(2);
    });

    it('should clear all caches', () => {
        cache.setCachedResult('k1', { v: 1 });
        cache.setCachedExplanation('k2', { text: 'test' });
        cache.setCachedProfiling('k3', { count: 10 });

        cache.clearAllCaches();
        const stats = cache.getCacheStats();
        expect(stats.totalEntries).toBe(0);
    });
});

// ─── Profiler Tests ───────────────────────────────────────────────

describe('Module 5B — Data Profiler', () => {
    let profiler: typeof import('../../src/lib/execution/data-profiler');

    beforeEach(async () => {
        profiler = await import('../../src/lib/execution/data-profiler');
    });

    it('should compute recordCount', () => {
        const result = profiler.profileDataset([
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
            { label: 'C', value: 30 },
        ]);
        expect(result.recordCount).toBe(3);
    });

    it('should compute uniqueCategoryCount', () => {
        const result = profiler.profileDataset([
            { label: 'A', value: 10 },
            { label: 'A', value: 20 },
            { label: 'B', value: 30 },
        ]);
        expect(result.uniqueCategoryCount).toBe(2);
    });

    it('should detect time dimension from ISO date labels', () => {
        const result = profiler.profileDataset([
            { label: '2024-01', value: 100 },
            { label: '2024-02', value: 200 },
            { label: '2024-03', value: 300 },
        ]);
        expect(result.hasTimeDimension).toBe(true);
    });

    it('should not detect time dimension from non-date labels', () => {
        const result = profiler.profileDataset([
            { label: 'Electronics', value: 100 },
            { label: 'Clothing', value: 200 },
            { label: 'Food', value: 300 },
        ]);
        expect(result.hasTimeDimension).toBe(false);
    });

    it('should classify cardinality levels', () => {
        // Low: 3 unique out of 3
        const low = profiler.profileDataset([
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
            { label: 'C', value: 30 },
        ]);
        expect(low.cardinalityLevel).toBe('low');
    });

    it('should compute volatility index', () => {
        // Stable data: low volatility
        const stable = profiler.profileDataset([
            { label: 'A', value: 100 },
            { label: 'B', value: 101 },
            { label: 'C', value: 99 },
        ]);
        expect(stable.volatilityIndex).toBeLessThan(0.1);

        // Volatile data: high volatility
        const volatile = profiler.profileDataset([
            { label: 'A', value: 10 },
            { label: 'B', value: 1000 },
            { label: 'C', value: 50 },
        ]);
        expect(volatile.volatilityIndex).toBeGreaterThan(1);
    });

    it('should detect sequential change', () => {
        // Alternating positive/negative values → sequential change
        const result = profiler.profileDataset([
            { label: 'Q1', value: 5 },
            { label: 'Q2', value: -3 },
            { label: 'Q3', value: 7 },
            { label: 'Q4', value: -2 },
            { label: 'Q5', value: 4 },
        ]);
        expect(result.isSequentialChange).toBe(true);
    });

    it('should return all 10 profiling features', () => {
        const result = profiler.profileDataset([
            { label: '2024-01', value: 100 },
            { label: '2024-02', value: 200 },
        ]);

        expect(result).toHaveProperty('recordCount');
        expect(result).toHaveProperty('uniqueCategoryCount');
        expect(result).toHaveProperty('numberOfSeries');
        expect(result).toHaveProperty('hasTimeDimension');
        expect(result).toHaveProperty('numericDimensionCount');
        expect(result).toHaveProperty('hierarchicalDepth');
        expect(result).toHaveProperty('volatilityIndex');
        expect(result).toHaveProperty('distributionSkew');
        expect(result).toHaveProperty('cardinalityLevel');
        expect(result).toHaveProperty('isSequentialChange');
    });
});

// ─── Types Contract Tests ─────────────────────────────────────────

describe('Module 5B — Response Contract', () => {
    it('should define KPIExecutionResult shape', async () => {
        // Verify the type can be imported and used
        const types = await import('../../src/lib/execution/types');
        expect(types).toBeDefined();

        // Verify the type shape by creating a mock object
        const mock: import('../../src/lib/execution/types').KPIExecutionResult = {
            kpiId: 'test',
            kpiName: 'Test KPI',
            category: 'revenue',
            primaryValue: 100,
            previousValue: 90,
            delta: 10,
            deltaPercent: 11.11,
            deltaDirection: 'up',
            dataset: [],
            datasetSize: 0,
            profiling: {
                recordCount: 0,
                uniqueCategoryCount: 0,
                numberOfSeries: 1,
                hasTimeDimension: false,
                numericDimensionCount: 1,
                hierarchicalDepth: 0,
                volatilityIndex: 0,
                distributionSkew: 0,
                cardinalityLevel: 'low',
                isSequentialChange: false,
            },
            recommendedChartType: 'bar',
            recommendedChartLibrary: 'chartjs',
            disableAnimation: false,
            aiExplanation: null,
            lineage: {
                tables: [],
                joins: [],
                formula: 'SUM(amount)',
                aggregations: [],
            },
            performance: {
                totalTimeMs: 50,
                dataLoadTimeMs: 20,
                computeTimeMs: 25,
                profilingTimeMs: 5,
                cacheHit: false,
                cacheKey: null,
            },
        };

        expect(mock.kpiId).toBe('test');
        expect(mock.deltaDirection).toBe('up');
        expect(mock.performance.cacheHit).toBe(false);
    });
});
