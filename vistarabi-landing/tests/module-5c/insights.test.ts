// Module 5C — Explainable Dashboard & AI Insight Engine
// Unit tests for anomaly detection, trend analysis, and insight generation

import { describe, it, expect } from 'vitest';
import { detectAnomalies, detectLatestAnomaly, computeStats } from '../../src/lib/insights/anomaly-detector';
import { computeTrend, computeOverallTrend, identifyTopContributors, findChangeDrivers } from '../../src/lib/insights/trend-analyzer';
import type { KPIDataPoint } from '../../src/lib/visualization/types';

// ─── Test Data ────────────────────────────────────────────────────

const stableTimeSeries: KPIDataPoint[] = [
    { label: '2024-01', value: 100 },
    { label: '2024-02', value: 101 },
    { label: '2024-03', value: 100 },
    { label: '2024-04', value: 101 },
    { label: '2024-05', value: 100 },
    { label: '2024-06', value: 101 },
];

const spikeTimeSeries: KPIDataPoint[] = [
    { label: '2024-01', value: 100 },
    { label: '2024-02', value: 102 },
    { label: '2024-03', value: 98 },
    { label: '2024-04', value: 101 },
    { label: '2024-05', value: 99 },
    { label: '2024-06', value: 100 },
    { label: '2024-07', value: 101 },
    { label: '2024-08', value: 99 },
    { label: '2024-09', value: 102 },
    { label: '2024-10', value: 1000 }, // Massive spike — well above 3σ
];

const dropTimeSeries: KPIDataPoint[] = [
    { label: '2024-01', value: 200 },
    { label: '2024-02', value: 198 },
    { label: '2024-03', value: 202 },
    { label: '2024-04', value: 199 },
    { label: '2024-05', value: 201 },
    { label: '2024-06', value: 50 }, // Massive drop
];

const upwardTimeSeries: KPIDataPoint[] = [
    { label: '2024-01', value: 100 },
    { label: '2024-02', value: 120 },
    { label: '2024-03', value: 140 },
    { label: '2024-04', value: 160 },
    { label: '2024-05', value: 180 },
    { label: '2024-06', value: 200 },
];

const downwardTimeSeries: KPIDataPoint[] = [
    { label: '2024-01', value: 200 },
    { label: '2024-02', value: 180 },
    { label: '2024-03', value: 160 },
    { label: '2024-04', value: 140 },
    { label: '2024-05', value: 120 },
    { label: '2024-06', value: 100 },
];

const groupedData: KPIDataPoint[] = [
    { label: 'Electronics', value: 500 },
    { label: 'Clothing', value: 300 },
    { label: 'Home', value: 150 },
    { label: 'Garden', value: 30 },
    { label: 'Toys', value: 20 },
];

// ─── Anomaly Detection Tests ──────────────────────────────────────

describe('Module 5C: Insight Engine', () => {

    describe('Statistical Helpers', () => {
        it('should compute mean and standard deviation correctly', () => {
            const { mean, stdDev } = computeStats([10, 20, 30, 40, 50]);
            expect(mean).toBe(30);
            expect(stdDev).toBeCloseTo(14.14, 1); // Population std dev
        });

        it('should handle single value', () => {
            const { mean, stdDev } = computeStats([42]);
            expect(mean).toBe(42);
            expect(stdDev).toBe(0);
        });

        it('should handle empty array', () => {
            const { mean, stdDev } = computeStats([]);
            expect(mean).toBe(0);
            expect(stdDev).toBe(0);
        });
    });

    describe('Anomaly Detection', () => {
        it('should detect no anomalies in stable data', () => {
            const anomalies = detectAnomalies(stableTimeSeries);
            expect(anomalies.length).toBe(0);
        });

        it('should detect spike anomaly', () => {
            const anomalies = detectAnomalies(spikeTimeSeries);
            expect(anomalies.length).toBeGreaterThan(0);

            const spike = anomalies.find(a => a.label === '2024-10');
            expect(spike).toBeDefined();
            expect(spike!.direction).toBe('spike');
            // Population-inclusive z-score: outlier inflates σ, so severity is warning
            expect(spike!.severity).toBe('warning');
            expect(spike!.value).toBe(1000);

            // detectLatestAnomaly excludes the outlier from baseline → true critical severity
            const latest = detectLatestAnomaly(spikeTimeSeries);
            expect(latest).not.toBeNull();
            expect(latest!.severity).toBe('critical');
        });

        it('should detect drop anomaly', () => {
            const anomalies = detectAnomalies(dropTimeSeries);
            expect(anomalies.length).toBeGreaterThan(0);

            const drop = anomalies.find(a => a.label === '2024-06');
            expect(drop).toBeDefined();
            expect(drop!.direction).toBe('drop');
            expect(drop!.value).toBe(50);
        });

        it('should return empty for fewer than 3 data points', () => {
            const anomalies = detectAnomalies([
                { label: '2024-01', value: 100 },
                { label: '2024-02', value: 500 },
            ]);
            expect(anomalies.length).toBe(0);
        });

        it('should return empty for all identical values', () => {
            const anomalies = detectAnomalies([
                { label: '2024-01', value: 100 },
                { label: '2024-02', value: 100 },
                { label: '2024-03', value: 100 },
                { label: '2024-04', value: 100 },
            ]);
            expect(anomalies.length).toBe(0);
        });

        it('should sort anomalies by severity (critical first)', () => {
            const anomalies = detectAnomalies(spikeTimeSeries);
            if (anomalies.length > 1) {
                const severityOrder = { critical: 0, warning: 1, info: 2 };
                for (let i = 1; i < anomalies.length; i++) {
                    expect(severityOrder[anomalies[i].severity])
                        .toBeGreaterThanOrEqual(severityOrder[anomalies[i - 1].severity]);
                }
            }
        });
    });

    describe('Latest Anomaly Detection', () => {
        it('should detect latest spike', () => {
            const anomaly = detectLatestAnomaly(spikeTimeSeries);
            expect(anomaly).not.toBeNull();
            expect(anomaly!.direction).toBe('spike');
            expect(anomaly!.label).toBe('2024-10');
        });

        it('should detect latest drop', () => {
            const anomaly = detectLatestAnomaly(dropTimeSeries);
            expect(anomaly).not.toBeNull();
            expect(anomaly!.direction).toBe('drop');
        });

        it('should return null for stable data', () => {
            const anomaly = detectLatestAnomaly(stableTimeSeries);
            expect(anomaly).toBeNull();
        });

        it('should return null for insufficient data', () => {
            const anomaly = detectLatestAnomaly([{ label: '2024-01', value: 100 }]);
            expect(anomaly).toBeNull();
        });
    });

    // ─── Trend Analysis Tests ─────────────────────────────────────

    describe('Trend Analysis', () => {
        it('should detect upward trend', () => {
            const trend = computeTrend(upwardTimeSeries);
            expect(trend).not.toBeNull();
            expect(trend!.direction).toBe('up');
            expect(trend!.percentChange).toBeGreaterThan(0);
            expect(trend!.currentPeriodLabel).toBe('2024-06');
            expect(trend!.previousPeriodLabel).toBe('2024-05');
        });

        it('should detect downward trend', () => {
            const trend = computeTrend(downwardTimeSeries);
            expect(trend).not.toBeNull();
            expect(trend!.direction).toBe('down');
            expect(trend!.percentChange).toBeLessThan(0);
        });

        it('should detect flat trend', () => {
            const trend = computeTrend([
                { label: '2024-01', value: 100 },
                { label: '2024-02', value: 100.5 },
            ]);
            expect(trend).not.toBeNull();
            expect(trend!.direction).toBe('flat');
        });

        it('should return null for insufficient data', () => {
            const trend = computeTrend([{ label: '2024-01', value: 100 }]);
            expect(trend).toBeNull();
        });

        it('should handle previous value of zero', () => {
            const trend = computeTrend([
                { label: '2024-01', value: 0 },
                { label: '2024-02', value: 50 },
            ]);
            expect(trend).not.toBeNull();
            expect(trend!.percentChange).toBe(100);
        });
    });

    describe('Overall Trend (Regression)', () => {
        it('should detect upward overall trend', () => {
            const result = computeOverallTrend(upwardTimeSeries);
            expect(result.direction).toBe('up');
            expect(result.slope).toBeGreaterThan(0);
            expect(result.confidence).toBeGreaterThan(0.9); // Very linear
        });

        it('should detect downward overall trend', () => {
            const result = computeOverallTrend(downwardTimeSeries);
            expect(result.direction).toBe('down');
            expect(result.slope).toBeLessThan(0);
        });

        it('should return flat for stable data', () => {
            const result = computeOverallTrend(stableTimeSeries);
            expect(result.direction).toBe('flat');
        });

        it('should return flat for insufficient data', () => {
            const result = computeOverallTrend([{ label: 'a', value: 1 }]);
            expect(result.direction).toBe('flat');
            expect(result.confidence).toBe(0);
        });
    });

    // ─── Top Contributors Tests ───────────────────────────────────

    describe('Top Contributors', () => {
        it('should identify top contributors in correct order', () => {
            const contributors = identifyTopContributors(groupedData, 3);
            expect(contributors.length).toBe(3);
            expect(contributors[0].label).toBe('Electronics');
            expect(contributors[0].rank).toBe(1);
            expect(contributors[1].label).toBe('Clothing');
            expect(contributors[2].label).toBe('Home');
        });

        it('should calculate percent of total correctly', () => {
            const contributors = identifyTopContributors(groupedData, 5);
            const totalPercent = contributors.reduce((sum, c) => sum + c.percentOfTotal, 0);
            expect(totalPercent).toBe(100);
        });

        it('should handle empty data', () => {
            const contributors = identifyTopContributors([], 5);
            expect(contributors.length).toBe(0);
        });

        it('should respect limit parameter', () => {
            const contributors = identifyTopContributors(groupedData, 2);
            expect(contributors.length).toBe(2);
        });
    });

    describe('Change Drivers', () => {
        it('should find biggest change driver', () => {
            const current: KPIDataPoint[] = [
                { label: 'Electronics', value: 600 },
                { label: 'Clothing', value: 300 },
                { label: 'Home', value: 100 },
            ];

            const previous: KPIDataPoint[] = [
                { label: 'Electronics', value: 400 },
                { label: 'Clothing', value: 290 },
                { label: 'Home', value: 110 },
            ];

            const drivers = findChangeDrivers(current, previous, 3);
            expect(drivers.length).toBe(3);
            // Electronics had +200 change (biggest absolute change)
            expect(drivers[0].label).toBe('Electronics');
            expect(drivers[0].change).toBe(200);
            expect(drivers[0].percentChange).toBe(50);
        });

        it('should handle new categories (no previous)', () => {
            const current: KPIDataPoint[] = [
                { label: 'NewProduct', value: 100 },
            ];
            const drivers = findChangeDrivers(current, [], 3);
            expect(drivers[0].previousValue).toBe(0);
            expect(drivers[0].percentChange).toBe(100);
        });
    });

    // ─── Edge Cases ───────────────────────────────────────────────

    describe('Edge Cases', () => {
        it('should handle all zero values', () => {
            const zeros: KPIDataPoint[] = Array.from({ length: 5 }, (_, i) => ({
                label: `2024-${i + 1}`, value: 0,
            }));
            const anomalies = detectAnomalies(zeros);
            expect(anomalies.length).toBe(0);

            const trend = computeTrend(zeros);
            expect(trend).not.toBeNull();
            expect(trend!.direction).toBe('flat');
        });

        it('should handle negative values', () => {
            const negatives: KPIDataPoint[] = [
                { label: '2024-01', value: -10 },
                { label: '2024-02', value: -12 },
                { label: '2024-03', value: -11 },
                { label: '2024-04', value: -50 }, // Anomaly drop
            ];
            const anomalies = detectAnomalies(negatives);
            expect(anomalies.length).toBeGreaterThan(0);
        });

        it('should handle very large values', () => {
            const large: KPIDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
                label: `2024-${i + 1}`, value: 1e12 + i,
            }));
            const anomalies = detectAnomalies(large);
            // Very small relative differences — should be no anomalies
            expect(anomalies.length).toBe(0);
        });

        it('top contributors should handle all zero values', () => {
            const zeros: KPIDataPoint[] = [
                { label: 'A', value: 0 },
                { label: 'B', value: 0 },
            ];
            const contributors = identifyTopContributors(zeros);
            expect(contributors.length).toBe(0);
        });
    });
});
