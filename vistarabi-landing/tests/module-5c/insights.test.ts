// Module 5C — Cognitive Insight Layer Tests
// Unit tests for anomaly detection, change attribution, explanation rendering, trend, insight generator

import { describe, it, expect } from 'vitest';

// ─── Anomaly Detector Tests ───────────────────────────────────────

import { detectAnomaly, computeStats } from '@/lib/insights/anomaly-detector';

describe('Module 5C — Anomaly Detector', () => {
    it('should return normal for insufficient data (<3 points)', () => {
        const result = detectAnomaly({
            currentValue: 100,
            dataPoints: [{ label: 'Jan', value: 100 }],
        });
        expect(result.severity).toBe('normal');
        expect(result.score).toBe(0);
        expect(result.flags).toHaveLength(0);
        expect(result.direction).toBe('none');
    });

    it('should detect a spike >35%', () => {
        const result = detectAnomaly({
            currentValue: 150,
            previousValue: 100,
            delta: 50,
            deltaPercent: 50,
            dataPoints: [
                { label: 'Jan', value: 100 },
                { label: 'Feb', value: 105 },
                { label: 'Mar', value: 98 },
                { label: 'Apr', value: 150 },
            ],
        });
        expect(result.severity).not.toBe('normal');
        expect(result.direction).toBe('spike');
        expect(result.flags.some(f => f.rule === 'spike_threshold')).toBe(true);
    });

    it('should detect a drop >25%', () => {
        const result = detectAnomaly({
            currentValue: 70,
            previousValue: 100,
            delta: -30,
            deltaPercent: -30,
            dataPoints: [
                { label: 'Jan', value: 100 },
                { label: 'Feb', value: 98 },
                { label: 'Mar', value: 102 },
                { label: 'Apr', value: 70 },
            ],
        });
        expect(result.flags.some(f => f.rule === 'drop_threshold')).toBe(true);
        expect(result.direction).toBe('drop');
    });

    it('should detect stddev breach (>4σ)', () => {
        const result = detectAnomaly({
            currentValue: 2000,
            dataPoints: [
                { label: 'A', value: 100 },
                { label: 'B', value: 100 },
                { label: 'C', value: 100 },
                { label: 'D', value: 100 },
                { label: 'E', value: 100 },
                { label: 'F', value: 100 },
                { label: 'G', value: 100 },
                { label: 'H', value: 100 },
                { label: 'I', value: 100 },
                { label: 'J', value: 100 },
                { label: 'K', value: 100 },
                { label: 'L', value: 100 },
                { label: 'M', value: 100 },
                { label: 'N', value: 100 },
                { label: 'O', value: 100 },
                { label: 'P', value: 100 },
                { label: 'Q', value: 100 },
                { label: 'R', value: 100 },
                { label: 'S', value: 100 },
                { label: 'T', value: 2000 },
            ],
        });
        expect(result.flags.some(f => f.rule === 'stddev_breach')).toBe(true);
        expect(result.score).toBeGreaterThan(0);
    });

    it('should detect missing data (current=0 from non-zero)', () => {
        const result = detectAnomaly({
            currentValue: 0,
            previousValue: 100,
            dataPoints: [
                { label: 'Jan', value: 100 },
                { label: 'Feb', value: 95 },
                { label: 'Mar', value: 105 },
            ],
        });
        expect(result.flags.some(f => f.rule === 'missing_data')).toBe(true);
    });

    it('should detect abnormal distribution skew', () => {
        const result = detectAnomaly({
            currentValue: 100,
            dataPoints: [
                { label: 'A', value: 100 },
                { label: 'B', value: 95 },
                { label: 'C', value: 105 },
            ],
            distributionSkew: 4.5,
        });
        expect(result.flags.some(f => f.rule === 'distribution_skew')).toBe(true);
    });

    it('should classify severity: critical for score ≥70', () => {
        const result = detectAnomaly({
            currentValue: 500,
            previousValue: 100,
            delta: 400,
            deltaPercent: 400,
            dataPoints: [
                { label: 'A', value: 100 },
                { label: 'B', value: 95 },
                { label: 'C', value: 105 },
                { label: 'D', value: 500 },
            ],
        });
        expect(result.severity).toBe('critical');
        expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('computeStats should compute mean and stddev', () => {
        const { mean, stdDev } = computeStats([10, 20, 30]);
        expect(mean).toBeCloseTo(20);
        expect(stdDev).toBeCloseTo(8.165, 2);
    });
});

// ─── Change Attribution Tests ─────────────────────────────────────

import { computeChangeAttribution } from '@/lib/insights/change-attribution';

describe('Module 5C — Change Attribution', () => {
    it('should return null for single-dimension data', () => {
        const result = computeChangeAttribution(
            [{ label: 'Total', value: 100 }],
            [{ label: 'Total', value: 80 }],
        );
        expect(result).toBeNull();
    });

    it('should compute segment contributions correctly', () => {
        const result = computeChangeAttribution(
            [
                { label: 'Electronics', value: 500 },
                { label: 'Clothing', value: 200 },
            ],
            [
                { label: 'Electronics', value: 300 },
                { label: 'Clothing', value: 200 },
            ],
            'total_revenue',
        );
        expect(result).not.toBeNull();
        expect(result!.totalDelta).toBe(200);
        expect(result!.topPositive?.segment).toBe('Electronics');
        expect(result!.topPositive?.contributionPercent).toBe(100);
        expect(result!.sentence).toContain('Electronics');
    });

    it('should handle disappeared segments', () => {
        const result = computeChangeAttribution(
            [{ label: 'A', value: 100 }, { label: 'B', value: 50 }],
            [{ label: 'A', value: 80 }, { label: 'B', value: 60 }, { label: 'C', value: 30 }],
        );
        expect(result).not.toBeNull();
        const cSegment = result!.segments.find(s => s.segment === 'C');
        expect(cSegment).toBeDefined();
        expect(cSegment!.currentValue).toBe(0);
        expect(cSegment!.deltaPercent).toBe(-100);
    });

    it('should handle no change', () => {
        const result = computeChangeAttribution(
            [{ label: 'A', value: 100 }, { label: 'B', value: 50 }],
            [{ label: 'A', value: 100 }, { label: 'B', value: 50 }],
        );
        expect(result).not.toBeNull();
        expect(result!.totalDelta).toBe(0);
        expect(result!.sentence).toContain('No change');
    });
});

// ─── Explanation Renderer Tests ──────────────────────────────────

import { renderLineageExplanation, renderTrendSummary } from '@/lib/insights/explanation-renderer';

describe('Module 5C — Explanation Renderer', () => {
    it('should render formula-based explanation without lineage', () => {
        const result = renderLineageExplanation('total_revenue', null);
        expect(result).toContain('Total Revenue');
        expect(result).toContain('computed from');
    });

    it('should render full lineage explanation', () => {
        const result = renderLineageExplanation('monthly_revenue', {
            tables: ['orders', 'order_items'],
            joins: [{ from: 'orders', to: 'order_items', on: 'order_id' }],
            formula: 'SUM(total)',
            aggregations: [{ function: 'SUM', column: 'total' }],
        });
        expect(result).toContain('Monthly Revenue');
        expect(result).toContain('sum(total)');
        expect(result).toContain('orders');
        expect(result).toContain('order_items');
        expect(result).toContain('order_id');
    });

    it('should render trend summary with increase', () => {
        const result = renderTrendSummary({
            kpiName: 'avg_order_value',
            currentValue: 150,
            previousValue: 120,
            deltaPercent: 25,
            trend: 'up',
        });
        expect(result).toContain('increased');
        expect(result).toContain('25.0%');
        expect(result).toContain('150');
    });

    it('should render flat trend', () => {
        const result = renderTrendSummary({
            kpiName: 'revenue',
            currentValue: 100,
            previousValue: 100,
            deltaPercent: 0,
            trend: 'flat',
        });
        expect(result).toContain('stable');
    });
});

// ─── Trend Analyzer Tests ────────────────────────────────────────

import { computeTrend, computeOverallTrend, identifyTopContributors, findChangeDrivers } from '@/lib/insights/trend-analyzer';

describe('Module 5C — Trend Analyzer', () => {
    it('should compute period-over-period trend', () => {
        const result = computeTrend([
            { label: 'Jan', value: 100 },
            { label: 'Feb', value: 120 },
        ]);
        expect(result).not.toBeNull();
        expect(result!.direction).toBe('up');
        expect(result!.percentChange).toBe(20);
    });

    it('should compute overall trend direction via linear regression', () => {
        const result = computeOverallTrend([
            { label: 'Q1', value: 100 },
            { label: 'Q2', value: 110 },
            { label: 'Q3', value: 120 },
            { label: 'Q4', value: 130 },
        ]);
        expect(result.direction).toBe('up');
        expect(result.slope).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should identify top contributors', () => {
        const result = identifyTopContributors([
            { label: 'Electronics', value: 500 },
            { label: 'Clothing', value: 200 },
            { label: 'Books', value: 100 },
        ], 2);
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('Electronics');
        expect(result[0].rank).toBe(1);
    });

    it('should find change drivers between periods', () => {
        const result = findChangeDrivers(
            [{ label: 'A', value: 200 }, { label: 'B', value: 100 }],
            [{ label: 'A', value: 100 }, { label: 'B', value: 90 }],
        );
        expect(result[0].label).toBe('A');
        expect(result[0].change).toBe(100);
    });
});

// ─── Insight Generator Tests ─────────────────────────────────────

import { generateKPIInsight, generateDashboardInsights } from '@/lib/insights/insight-generator';

describe('Module 5C — Insight Generator', () => {
    it('should generate a complete KPIInsight with all fields', () => {
        const insight = generateKPIInsight({
            kpiId: 'total_revenue',
            kpiName: 'total_revenue',
            category: 'financial',
            currentValue: 150000,
            previousValue: 120000,
            delta: 30000,
            deltaPercent: 25,
            trend: 'up',
            dataPoints: [
                { label: 'Jan', value: 100000 },
                { label: 'Feb', value: 110000 },
                { label: 'Mar', value: 120000 },
                { label: 'Apr', value: 150000 },
            ],
        });

        expect(insight.kpiId).toBe('total_revenue');
        expect(insight.anomaly).toBeDefined();
        expect(insight.anomaly.severity).toBeDefined();
        expect(insight.lineageExplanation).toContain('Total Revenue');
        expect(insight.trendSummary).toContain('increased');
        expect(insight.trend).not.toBeNull();
        expect(insight.dataFreshness).toBe('fresh');
        expect(insight.lastUpdated).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should generate dashboard-wide insights with feed and alerts', () => {
        const kpiInsights = [
            generateKPIInsight({
                kpiId: 'kpi_1',
                kpiName: 'Revenue',
                category: 'financial',
                currentValue: 200000,
                previousValue: 100000,
                deltaPercent: 100,
                trend: 'up',
                dataPoints: [
                    { label: 'Jan', value: 100000 },
                    { label: 'Feb', value: 120000 },
                    { label: 'Mar', value: 200000 },
                ],
            }),
            generateKPIInsight({
                kpiId: 'kpi_2',
                kpiName: 'Costs',
                category: 'financial',
                currentValue: 50000,
                trend: 'flat',
                dataPoints: [
                    { label: 'Jan', value: 50000 },
                    { label: 'Feb', value: 50500 },
                    { label: 'Mar', value: 50000 },
                ],
            }),
        ];

        const response = generateDashboardInsights('project-123', kpiInsights);

        expect(response.projectId).toBe('project-123');
        expect(response.insights).toHaveLength(2);
        expect(response.feed).toBeDefined();
        expect(response.alerts).toBeDefined();
        expect(response.computedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(response.trendingUp + response.trendingDown).toBeLessThanOrEqual(2);
    });

    it('should handle KPI with no previous data gracefully', () => {
        const insight = generateKPIInsight({
            kpiId: 'new_kpi',
            kpiName: 'new_metric',
            category: 'other',
            currentValue: 42,
            dataPoints: [],
        });

        expect(insight.anomaly.severity).toBe('normal');
        expect(insight.attribution).toBeNull();
        expect(insight.trend).toBeNull();
        expect(insight.dataFreshness).toBe('unknown');
    });
});
