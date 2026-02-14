// Module 5C — Trend Analyzer
// Period-over-period trend analysis and top contributor identification

import type { KPIDataPoint } from '../visualization/types';
import type { TrendSummary, TrendDirection, TopContributor } from './types';

// ─── Trend Computation ────────────────────────────────────────────

/**
 * Compute period-over-period trend from time-series data.
 * Compares the last period to the second-to-last period.
 */
export function computeTrend(dataPoints: KPIDataPoint[]): TrendSummary | null {
    if (dataPoints.length < 2) return null;

    const current = dataPoints[dataPoints.length - 1];
    const previous = dataPoints[dataPoints.length - 2];

    const percentChange = previous.value === 0
        ? (current.value > 0 ? 100 : 0)
        : ((current.value - previous.value) / Math.abs(previous.value)) * 100;

    const direction: TrendDirection =
        percentChange > 1 ? 'up' :
            percentChange < -1 ? 'down' :
                'flat';

    return {
        direction,
        currentPeriodValue: current.value,
        previousPeriodValue: previous.value,
        percentChange: Math.round(percentChange * 100) / 100,
        currentPeriodLabel: current.label,
        previousPeriodLabel: previous.label,
    };
}

/**
 * Compute multi-period trend (overall direction over N periods).
 * Uses linear regression slope to determine if KPI is generally rising/falling.
 */
export function computeOverallTrend(dataPoints: KPIDataPoint[]): {
    direction: TrendDirection;
    slope: number;
    confidence: number;
} {
    if (dataPoints.length < 3) {
        return { direction: 'flat', slope: 0, confidence: 0 };
    }

    const n = dataPoints.length;
    const values = dataPoints.map(dp => dp.value);

    // Simple linear regression: y = mx + b
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (xValues[i] - xMean) * (values[i] - yMean);
        denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;

    // R² for confidence
    const predictions = xValues.map(x => yMean + slope * (x - xMean));
    const ssRes = values.reduce((s, v, i) => s + (v - predictions[i]) ** 2, 0);
    const ssTot = values.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    // Normalize slope relative to mean for direction classification
    const normalizedSlope = yMean === 0 ? 0 : (slope / Math.abs(yMean)) * 100;

    const direction: TrendDirection =
        normalizedSlope > 1 ? 'up' :
            normalizedSlope < -1 ? 'down' :
                'flat';

    return {
        direction,
        slope: Math.round(slope * 100) / 100,
        confidence: Math.round(Math.max(0, rSquared) * 100) / 100,
    };
}

// ─── Top Contributors ─────────────────────────────────────────────

/**
 * Identify top contributors from grouped KPI data points.
 * Used to answer "What drove this KPI's value?"
 */
export function identifyTopContributors(
    dataPoints: KPIDataPoint[],
    limit: number = 5
): TopContributor[] {
    if (dataPoints.length === 0) return [];

    const total = dataPoints.reduce((sum, dp) => sum + Math.abs(dp.value), 0);
    if (total === 0) return [];

    // Sort by value descending (largest contributors first)
    const sorted = [...dataPoints].sort((a, b) => b.value - a.value);

    return sorted.slice(0, limit).map((dp, index) => ({
        label: dp.label,
        value: dp.value,
        percentOfTotal: Math.round((Math.abs(dp.value) / total) * 10000) / 100,
        rank: index + 1,
    }));
}

/**
 * Find the biggest change contributors between two grouped datasets.
 * Compare current period groups to previous period groups.
 */
export function findChangeDrivers(
    currentGroups: KPIDataPoint[],
    previousGroups: KPIDataPoint[],
    limit: number = 3
): { label: string; currentValue: number; previousValue: number; change: number; percentChange: number }[] {
    const previousMap = new Map(previousGroups.map(dp => [dp.label, dp.value]));

    const changes = currentGroups.map(dp => {
        const prevValue = previousMap.get(dp.label) ?? 0;
        const change = dp.value - prevValue;
        const percentChange = prevValue === 0
            ? (dp.value > 0 ? 100 : 0)
            : ((change) / Math.abs(prevValue)) * 100;

        return {
            label: dp.label,
            currentValue: dp.value,
            previousValue: prevValue,
            change: Math.round(change * 100) / 100,
            percentChange: Math.round(percentChange * 100) / 100,
        };
    });

    // Sort by absolute change descending
    return changes
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, limit);
}
