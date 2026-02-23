// Module 5B — Chart Selection Intelligence Tests
// Tests the selectChart decision tree from chart-inferrer.ts
// Validates all branches: time-series, categorical, hierarchical, distribution, multi-dim

import { describe, it, expect } from 'vitest';
import { selectChart } from '../../src/lib/dashboard/chart-inferrer';
import type { DataProfile } from '../../src/lib/dashboard/types';

// ─── Helpers ──────────────────────────────────────────────────────

function buildProfile(overrides: Partial<DataProfile> = {}): DataProfile {
    return {
        hasTimeDimension: false,
        numberOfSeries: 1,
        uniqueCategoryCount: 0,
        numericDimensionCount: 1,
        hierarchicalDepth: 0,
        recordCount: 10,
        volatilityIndex: 0.1,
        distributionType: 'normal',
        cardinalityLevel: 'low',
        isSequentialChange: false,
        categoryColumns: [],
        numericColumns: ['amount'],
        ...overrides,
    };
}

// ─── Test Suites ──────────────────────────────────────────────────

describe('Module 5B — Chart Selection Decision Tree', () => {

    // ── Time-Series Branch ────────────────────────────────────────

    describe('Time-Series Charts', () => {
        it('single-series low volatility → line chart', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: true,
                numberOfSeries: 1,
                volatilityIndex: 0.1,
            }));
            expect(selection.chartType).toBe('line');
            expect(selection.chartLibrary).toBe('chartjs');
            expect(selection.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it('single-series high volatility → area chart', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: true,
                numberOfSeries: 1,
                volatilityIndex: 0.5,
            }));
            expect(selection.chartType).toBe('area');
            expect(selection.chartLibrary).toBe('chartjs');
        });

        it('2-3 series → multi-line chart', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: true,
                numberOfSeries: 3,
            }));
            expect(selection.chartType).toBe('line');
        });

        it('4-6 series → stacked area', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: true,
                numberOfSeries: 5,
            }));
            expect(selection.chartType).toBe('area');
        });

        it('>6 series → heatmap', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: true,
                numberOfSeries: 8,
            }));
            expect(selection.chartType).toBe('heatmap');
            expect(selection.chartLibrary).toBe('plotly');
        });
    });

    // ── Categorical Branch ────────────────────────────────────────

    describe('Categorical Charts', () => {
        it('≤5 categories → doughnut', () => {
            const selection = selectChart(buildProfile({
                uniqueCategoryCount: 4,
            }));
            expect(selection.chartType).toBe('doughnut');
            expect(selection.chartLibrary).toBe('chartjs');
        });

        it('5-10 categories → bar chart', () => {
            const selection = selectChart(buildProfile({
                uniqueCategoryCount: 8,
            }));
            expect(selection.chartType).toBe('bar');
        });

        it('10-20 categories → horizontal bar', () => {
            const selection = selectChart(buildProfile({
                uniqueCategoryCount: 15,
            }));
            expect(selection.chartType).toBe('horizontal_bar');
        });

        it('20-50 categories → treemap', () => {
            const selection = selectChart(buildProfile({
                uniqueCategoryCount: 35,
            }));
            expect(selection.chartType).toBe('treemap');
            expect(selection.chartLibrary).toBe('plotly');
        });

        it('>50 categories → table', () => {
            const selection = selectChart(buildProfile({
                uniqueCategoryCount: 60,
            }));
            expect(selection.chartType).toBe('table');
        });
    });

    // ── Hierarchical Branch ───────────────────────────────────────

    describe('Hierarchical Charts', () => {
        it('depth ≥2 → treemap', () => {
            const selection = selectChart(buildProfile({
                hierarchicalDepth: 3,
            }));
            expect(selection.chartType).toBe('treemap');
            expect(selection.chartLibrary).toBe('plotly');
        });
    });

    // ── Multi-Numeric Dimensions ──────────────────────────────────

    describe('Multi-Dimensional Charts', () => {
        it('3+ numeric dims → bubble', () => {
            const selection = selectChart(buildProfile({
                numericDimensionCount: 3,
            }));
            expect(selection.chartType).toBe('bubble');
            expect(selection.chartLibrary).toBe('chartjs');
        });

        it('2 numeric dims (no categories) → scatter', () => {
            const selection = selectChart(buildProfile({
                numericDimensionCount: 2,
                uniqueCategoryCount: 0,
            }));
            expect(selection.chartType).toBe('scatter');
        });
    });

    // ── Distribution Analysis ─────────────────────────────────────

    describe('Distribution Charts', () => {
        it('skewed distribution → box_plot', () => {
            const selection = selectChart(buildProfile({
                distributionType: 'skewed',
            }));
            expect(selection.chartType).toBe('box_plot');
            expect(selection.chartLibrary).toBe('plotly');
        });

        it('bimodal distribution → violin', () => {
            const selection = selectChart(buildProfile({
                distributionType: 'bimodal',
            }));
            expect(selection.chartType).toBe('violin');
            expect(selection.chartLibrary).toBe('plotly');
        });
    });

    // ── Default Fallback ──────────────────────────────────────────

    describe('Default Fallback', () => {
        it('no features → metric_card', () => {
            const selection = selectChart(buildProfile({
                hasTimeDimension: false,
                uniqueCategoryCount: 0,
                numericDimensionCount: 1,
                hierarchicalDepth: 0,
                distributionType: 'normal',
            }));
            expect(selection.chartType).toBe('metric_card');
        });

        it('should always have a fallback type and library', () => {
            const profiles = [
                buildProfile(),
                buildProfile({ hasTimeDimension: true, numberOfSeries: 1 }),
                buildProfile({ uniqueCategoryCount: 25 }),
                buildProfile({ distributionType: 'skewed' }),
            ];

            for (const profile of profiles) {
                const selection = selectChart(profile);
                expect(selection.chartType).toBeDefined();
                expect(selection.chartLibrary).toBeDefined();
                expect(selection.fallbackType).toBeDefined();
                expect(selection.fallbackLibrary).toBeDefined();
                expect(selection.confidence).toBeGreaterThan(0);
                expect(selection.reason).toBeTruthy();
            }
        });
    });

    // ── Confidence Ordering ───────────────────────────────────────

    describe('Confidence Ordering', () => {
        it('line chart should have highest confidence for clean time-series', () => {
            const lineSelection = selectChart(buildProfile({
                hasTimeDimension: true, numberOfSeries: 1, volatilityIndex: 0.05,
            }));
            const areaSelection = selectChart(buildProfile({
                hasTimeDimension: true, numberOfSeries: 1, volatilityIndex: 0.5,
            }));

            expect(lineSelection.confidence).toBeGreaterThanOrEqual(areaSelection.confidence);
        });

        it('heatmap should have lower confidence than single-series line', () => {
            const line = selectChart(buildProfile({
                hasTimeDimension: true, numberOfSeries: 1,
            }));
            const heatmap = selectChart(buildProfile({
                hasTimeDimension: true, numberOfSeries: 8,
            }));

            expect(line.confidence).toBeGreaterThan(heatmap.confidence);
        });
    });
});
