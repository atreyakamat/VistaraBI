// Module 5C — Anomaly Detector (Upgraded)
// Deterministic rule engine — runs BEFORE any AI
// Rules: stddev threshold, spike >35%, drop >25%, missing data, distribution skew

import type { AnomalyResult, AnomalySeverity, AnomalyDirection, AnomalyFlag } from './types';

// ─── Configuration ────────────────────────────────────────────────

const RULES = {
    STDDEV_MULTIPLIER: 2,        // delta > 2 * rolling stddev -> anomaly
    SPIKE_THRESHOLD: 0.35,       // >35% spike
    DROP_THRESHOLD: -0.25,       // >25% drop
    SKEW_THRESHOLD: 2.0,         // distribution skew > 2.0
    MIN_RECORDS_FOR_ANOMALY: 3,  // need at least 3 records
};

// ─── Core Detection ───────────────────────────────────────────────

/**
 * Run all deterministic anomaly rules against a KPI result.
 * Returns severity classification + individual flags.
 */
export function detectAnomaly(params: {
    currentValue: number;
    previousValue?: number;
    delta?: number;
    deltaPercent?: number;
    dataPoints: Array<{ label: string; value: number }>;
    volatilityIndex?: number;
    distributionSkew?: number;
    recordCount?: number;
}): AnomalyResult {
    const {
        currentValue, previousValue, delta, deltaPercent,
        dataPoints, volatilityIndex, distributionSkew, recordCount,
    } = params;

    const flags: AnomalyFlag[] = [];
    let maxScore = 0;
    let direction: AnomalyDirection = 'none';

    // Rule 1: Low record count — disable anomaly detection
    if ((recordCount ?? dataPoints.length) < RULES.MIN_RECORDS_FOR_ANOMALY) {
        return {
            severity: 'normal',
            score: 0,
            flags: [],
            reason: 'Insufficient data for anomaly detection',
            direction: 'none',
            detectedAt: new Date().toISOString(),
        };
    }

    // Rule 2: Delta > 2 * rolling standard deviation
    if (dataPoints.length >= 3) {
        const values = dataPoints.map(d => d.value);
        const { mean, stdDev } = computeStats(values);
        const deviationFromMean = Math.abs(currentValue - mean);

        if (stdDev > 0 && deviationFromMean > RULES.STDDEV_MULTIPLIER * stdDev) {
            const sigma = deviationFromMean / stdDev;
            const score = Math.min(100, Math.round(sigma * 25));
            maxScore = Math.max(maxScore, score);
            direction = currentValue > mean ? 'spike' : 'drop';

            flags.push({
                rule: 'stddev_breach',
                description: `Value deviates ${sigma.toFixed(1)}σ from rolling mean`,
                threshold: RULES.STDDEV_MULTIPLIER * stdDev,
                actual: deviationFromMean,
            });
        }
    }

    // Rule 3: Sudden spike > 35%
    if (deltaPercent !== undefined && deltaPercent > RULES.SPIKE_THRESHOLD * 100) {
        const score = Math.min(100, Math.round(deltaPercent * 1.2));
        maxScore = Math.max(maxScore, score);
        direction = 'spike';

        flags.push({
            rule: 'spike_threshold',
            description: `Spike of ${deltaPercent.toFixed(1)}% exceeds ${RULES.SPIKE_THRESHOLD * 100}% threshold`,
            threshold: RULES.SPIKE_THRESHOLD * 100,
            actual: deltaPercent,
        });
    }

    // Rule 4: Drop > 25%
    if (deltaPercent !== undefined && deltaPercent < RULES.DROP_THRESHOLD * 100) {
        const score = Math.min(100, Math.round(Math.abs(deltaPercent) * 1.5));
        maxScore = Math.max(maxScore, score);
        direction = 'drop';

        flags.push({
            rule: 'drop_threshold',
            description: `Drop of ${Math.abs(deltaPercent).toFixed(1)}% exceeds ${Math.abs(RULES.DROP_THRESHOLD) * 100}% threshold`,
            threshold: Math.abs(RULES.DROP_THRESHOLD) * 100,
            actual: Math.abs(deltaPercent),
        });
    }

    // Rule 5: Missing data (empty dataset or zero current value with history)
    if (dataPoints.length === 0 || (currentValue === 0 && previousValue && previousValue !== 0)) {
        maxScore = Math.max(maxScore, 80);
        flags.push({
            rule: 'missing_data',
            description: dataPoints.length === 0
                ? 'No data points available'
                : 'Current value dropped to zero from a non-zero previous value',
            threshold: 1,
            actual: dataPoints.length === 0 ? 0 : currentValue,
        });
    }

    // Rule 6: Abnormal distribution skew
    if (distributionSkew !== undefined && Math.abs(distributionSkew) > RULES.SKEW_THRESHOLD) {
        const score = Math.min(100, Math.round(Math.abs(distributionSkew) * 20));
        maxScore = Math.max(maxScore, score);

        flags.push({
            rule: 'distribution_skew',
            description: `Distribution skew of ${distributionSkew.toFixed(2)} exceeds ±${RULES.SKEW_THRESHOLD} threshold`,
            threshold: RULES.SKEW_THRESHOLD,
            actual: Math.abs(distributionSkew),
        });
    }

    // Classify severity
    const severity = classifySeverity(maxScore, flags);

    // Build reason string
    const reason = flags.length === 0
        ? 'No anomalies detected'
        : flags.map(f => f.description).join('; ');

    return {
        severity,
        score: maxScore,
        flags,
        reason,
        direction,
        detectedAt: new Date().toISOString(),
    };
}

// ─── Severity Classification ──────────────────────────────────────

function classifySeverity(score: number, flags: AnomalyFlag[]): AnomalySeverity {
    if (score >= 70 || flags.some(f => f.rule === 'missing_data')) return 'critical';
    if (score >= 40) return 'warning';
    return 'normal';
}

// ─── Statistical Helpers ──────────────────────────────────────────

export function computeStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    const squaredDiffs = values.map(v => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
}
