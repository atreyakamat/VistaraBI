// Module 5B — Data Profiling Engine
// Computes 10 statistical features from query results for chart intelligence

import type { DataProfilingResult } from './types';
import type { KPIDataPoint } from '../visualization/types';

/**
 * Profile a dataset to compute statistical features.
 * These features drive the chart selection logic in the frontend.
 */
export function profileDataset(
    dataPoints: KPIDataPoint[],
    metadata?: {
        dateColumn?: string;
        categoryColumns?: string[];
        numericColumns?: string[];
    }
): DataProfilingResult {
    const values = dataPoints.map(dp => dp.value).filter(v => v !== null && v !== undefined && !isNaN(v));
    const labels = dataPoints.map(dp => dp.label);

    return {
        recordCount: dataPoints.length,
        uniqueCategoryCount: computeUniqueCategoryCount(labels),
        numberOfSeries: computeNumberOfSeries(dataPoints),
        hasTimeDimension: detectTimeDimension(labels, metadata?.dateColumn),
        numericDimensionCount: metadata?.numericColumns?.length ?? countNumericDimensions(dataPoints),
        hierarchicalDepth: computeHierarchicalDepth(labels),
        volatilityIndex: computeVolatilityIndex(values),
        distributionSkew: computeSkewness(values),
        cardinalityLevel: classifyCardinality(new Set(labels).size, dataPoints.length),
        isSequentialChange: detectSequentialChange(values),
    };
}

// ─── Feature Computations ─────────────────────────────────────────

function computeUniqueCategoryCount(labels: string[]): number {
    return new Set(labels).size;
}

function computeNumberOfSeries(dataPoints: KPIDataPoint[]): number {
    // Check if metadata contains series info
    const seriesKeys = new Set<string>();
    for (const dp of dataPoints) {
        if (dp.metadata && typeof dp.metadata === 'object') {
            const series = (dp.metadata as Record<string, unknown>)['series'];
            if (series) seriesKeys.add(String(series));
        }
    }
    return seriesKeys.size > 0 ? seriesKeys.size : 1;
}

function detectTimeDimension(labels: string[], dateColumn?: string): boolean {
    if (dateColumn) return true;

    // Sample labels for date-like patterns
    const sampleSize = Math.min(labels.length, 5);
    let dateCount = 0;

    for (let i = 0; i < sampleSize; i++) {
        const label = labels[i];
        if (!label) continue;

        // ISO date, yyyy-mm, yyyy-Qn, Mon yyyy, etc.
        if (/^\d{4}[-\/]\d{2}([-\/]\d{2})?$/.test(label)) { dateCount++; continue; }
        if (/^\d{4}-Q[1-4]$/.test(label)) { dateCount++; continue; }
        if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(label)) { dateCount++; continue; }
        if (/^W\d{1,2}\s+\d{4}$/.test(label)) { dateCount++; continue; }
    }

    return dateCount >= sampleSize * 0.6;
}

function countNumericDimensions(dataPoints: KPIDataPoint[]): number {
    if (dataPoints.length === 0) return 1;

    // Check metadata for extra numeric fields
    let numericCount = 1; // value is always numeric
    const dp = dataPoints[0];
    if (dp.metadata && typeof dp.metadata === 'object') {
        for (const val of Object.values(dp.metadata as Record<string, unknown>)) {
            if (typeof val === 'number') numericCount++;
        }
    }
    return numericCount;
}

function computeHierarchicalDepth(labels: string[]): number {
    // Look for hierarchy separators: "/" or " > " or " → "
    let maxDepth = 0;
    for (const label of labels.slice(0, 20)) {
        if (!label) continue;
        const separators = [' > ', ' → ', ' / ', '/'];
        for (const sep of separators) {
            const parts = label.split(sep);
            if (parts.length > maxDepth) maxDepth = parts.length;
        }
    }
    return maxDepth;
}

/**
 * Volatility Index = stddev / mean (coefficient of variation).
 * Higher values indicate more volatile data → better for line/scatter.
 */
function computeVolatilityIndex(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return 0;

    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    return Number((stddev / Math.abs(mean)).toFixed(4));
}

/**
 * Pearson skewness: 3 * (mean - median) / stddev.
 * Positive = right-skewed, Negative = left-skewed, 0 = symmetric.
 */
function computeSkewness(values: number[]): number {
    if (values.length < 3) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((s, v) => s + v, 0) / n;
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return 0;

    return Number((3 * (mean - median) / stddev).toFixed(4));
}

/**
 * Classify cardinality based on unique-to-total ratio.
 */
function classifyCardinality(
    uniqueCount: number,
    totalCount: number
): 'low' | 'medium' | 'high' | 'very_high' {
    if (totalCount === 0) return 'low';
    const ratio = uniqueCount / totalCount;

    if (uniqueCount <= 5) return 'low';
    if (uniqueCount <= 20 || ratio < 0.3) return 'medium';
    if (uniqueCount <= 100 || ratio < 0.7) return 'high';
    return 'very_high';
}

/**
 * Detect if values represent sequential changes (deltas).
 * True if values alternate between positive and negative.
 */
function detectSequentialChange(values: number[]): boolean {
    if (values.length < 4) return false;

    let signChanges = 0;
    for (let i = 1; i < values.length; i++) {
        const prev = values[i - 1];
        const curr = values[i];
        if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
            signChanges++;
        }
    }

    // If more than 40% of transitions are sign changes, it's sequential change data
    return signChanges / (values.length - 1) > 0.4;
}
