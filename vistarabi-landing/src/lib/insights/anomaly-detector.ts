// Module 5C — Anomaly Detector
// Deterministic statistical anomaly detection for KPI time-series data
// Uses mean ± standard deviation thresholds

import type { KPIDataPoint } from '../visualization/types';
import type { AnomalyResult, AnomalySeverity, AnomalyDirection } from './types';

// ─── Configuration ────────────────────────────────────────────────

const SIGMA_THRESHOLDS = {
    info: 1.5,      // 1.5σ — notable
    warning: 2.0,   // 2σ   — significant
    critical: 3.0,  // 3σ   — extreme
};

const MIN_DATA_POINTS = 3; // Need at least 3 points for meaningful stats

// ─── Core Detection ───────────────────────────────────────────────

/**
 * Detect anomalies in time-series KPI data.
 * Uses z-score method: flags points deviating beyond σ thresholds from the mean.
 */
export function detectAnomalies(dataPoints: KPIDataPoint[]): AnomalyResult[] {
    if (dataPoints.length < MIN_DATA_POINTS) return [];

    const values = dataPoints.map(dp => dp.value);
    const { mean, stdDev } = computeStats(values);

    // If std dev is 0 (all same values), no anomalies
    if (stdDev === 0) return [];

    const anomalies: AnomalyResult[] = [];

    for (let i = 0; i < dataPoints.length; i++) {
        const value = dataPoints[i].value;
        const deviation = Math.abs(value - mean) / stdDev;

        if (deviation >= SIGMA_THRESHOLDS.info) {
            const direction: AnomalyDirection = value > mean ? 'spike' : 'drop';
            const severity = classifySeverity(deviation);
            const percentFromMean = ((value - mean) / Math.abs(mean)) * 100;

            anomalies.push({
                dataPointIndex: i,
                label: dataPoints[i].label,
                value,
                expectedValue: Math.round(mean * 100) / 100,
                deviation: Math.round(deviation * 100) / 100,
                direction,
                severity,
                percentFromMean: Math.round(percentFromMean * 100) / 100,
            });
        }
    }

    // Sort by severity (critical first) then by deviation
    anomalies.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const diff = severityOrder[a.severity] - severityOrder[b.severity];
        return diff !== 0 ? diff : b.deviation - a.deviation;
    });

    return anomalies;
}

/**
 * Detect anomalies in the most recent data point only.
 * Useful for real-time alerting on the latest period.
 */
export function detectLatestAnomaly(dataPoints: KPIDataPoint[]): AnomalyResult | null {
    if (dataPoints.length < MIN_DATA_POINTS) return null;

    // Use all points except the last to compute baseline stats
    const baselineValues = dataPoints.slice(0, -1).map(dp => dp.value);
    const { mean, stdDev } = computeStats(baselineValues);

    if (stdDev === 0) return null;

    const latest = dataPoints[dataPoints.length - 1];
    const deviation = Math.abs(latest.value - mean) / stdDev;

    if (deviation < SIGMA_THRESHOLDS.info) return null;

    const direction: AnomalyDirection = latest.value > mean ? 'spike' : 'drop';
    const percentFromMean = ((latest.value - mean) / Math.abs(mean)) * 100;

    return {
        dataPointIndex: dataPoints.length - 1,
        label: latest.label,
        value: latest.value,
        expectedValue: Math.round(mean * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        direction,
        severity: classifySeverity(deviation),
        percentFromMean: Math.round(percentFromMean * 100) / 100,
    };
}

// ─── Statistical Helpers ──────────────────────────────────────────

/**
 * Compute mean and standard deviation for a set of values.
 */
export function computeStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    const squaredDiffs = values.map(v => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
}

/**
 * Classify anomaly severity based on sigma deviation.
 */
function classifySeverity(deviation: number): AnomalySeverity {
    if (deviation >= SIGMA_THRESHOLDS.critical) return 'critical';
    if (deviation >= SIGMA_THRESHOLDS.warning) return 'warning';
    return 'info';
}
