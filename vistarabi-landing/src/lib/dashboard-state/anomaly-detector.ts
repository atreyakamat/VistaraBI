// Module 5.5 — Anomaly Detector
// Lightweight statistical anomaly detection using Z-scores.
// Appended to KPIExecutionResult post-execution; never persisted.
// Only runs on datasets with sufficient points (configurable minimum, default: 5).

import type { KPIDataPoint } from '@/lib/visualization/types';
import type { AnomalyReport, AnomalyPoint, AnomalySeverity, AnomalyConfig } from './types';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AnomalyConfig = {
    zLowThreshold: 2.0,
    zHighThreshold: 3.0,
    minDataPoints: 5,
    rollingWindowSize: 5,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run anomaly detection on a KPI dataset.
 * Returns null if dataset is too small or has zero variance.
 */
export function detectAnomalies(
    dataset: KPIDataPoint[],
    config: Partial<AnomalyConfig> = {}
): AnomalyReport | null {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Guard: minimum dataset size
    if (dataset.length < cfg.minDataPoints) return null;

    const values = dataset.map(d => d.value);

    // Use global mean and stddev (simplest valid baseline)
    const mean = computeMean(values);
    const stddev = computeStdDev(values, mean);

    // Guard: zero stddev = completely flat data — not anomalous
    if (stddev === 0) return null;

    // Score every data point
    const anomalyPoints: AnomalyPoint[] = [];
    for (let i = 0; i < dataset.length; i++) {
        const z = Math.abs((values[i] - mean) / stddev);
        if (z >= cfg.zLowThreshold) {
            anomalyPoints.push({
                label: dataset[i].label,
                value: values[i],
                zScore: Number(z.toFixed(3)),
                severity: classifySeverity(z, cfg),
            });
        }
    }

    if (anomalyPoints.length === 0) return null;

    // Pick worst (highest z-score) as representative
    const worst = anomalyPoints.reduce(
        (acc, p) => p.zScore > acc.zScore ? p : acc,
        anomalyPoints[0]
    );

    return {
        detected: true,
        severity: worst.severity,
        worstPoint: worst,
        affectedPoints: anomalyPoints,
        reasoning: buildReasoning(worst, mean, stddev, dataset.length),
    };
}

/**
 * Convenience function: detect and return null if nothing found,
 * or AnomalyReport if anomaly detected.
 */
export function tryDetectAnomalies(
    dataset: KPIDataPoint[],
    config?: Partial<AnomalyConfig>
): AnomalyReport | null {
    try {
        return detectAnomalies(dataset, config);
    } catch {
        return null;
    }
}

// ─── Statistics ───────────────────────────────────────────────────────────────

function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

// ─── Severity Classification ──────────────────────────────────────────────────

function classifySeverity(z: number, cfg: AnomalyConfig): AnomalySeverity {
    if (z >= cfg.zHighThreshold) return 'high';
    if (z >= cfg.zLowThreshold) return 'medium';
    return 'low';
}

// ─── Reasoning String ─────────────────────────────────────────────────────────

function buildReasoning(
    worst: AnomalyPoint,
    mean: number,
    stddev: number,
    datasetSize: number
): string {
    const formattedVal = worst.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const formattedMean = mean.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const formattedStddev = stddev.toLocaleString(undefined, { maximumFractionDigits: 2 });

    return (
        `At "${worst.label}", value ${formattedVal} is ${worst.zScore}σ from the mean ` +
        `(mean=${formattedMean}, stddev=${formattedStddev}, n=${datasetSize}). ` +
        `Severity: ${worst.severity.toUpperCase()}.`
    );
}
