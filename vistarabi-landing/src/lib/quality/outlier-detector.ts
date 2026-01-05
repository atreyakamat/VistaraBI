// Outlier detector using IQR and Z-Score methods

export interface OutlierDetectionResult {
    outliers: Array<{
        rowIndex: number;
        value: number;
        severity: 'MILD' | 'MODERATE' | 'EXTREME';
        method: 'IQR' | 'Z_SCORE';
        expectedRange?: string;
    }>;
    totalOutliers: number;
}

export function detectOutliers(
    data: Record<string, unknown>[],
    columnName: string
): OutlierDetectionResult {
    // Extract numeric values with their row indices
    const numericData: Array<{ rowIndex: number; value: number }> = [];

    data.forEach((row, index) => {
        const value = row[columnName];
        const num = Number(value);
        if (!isNaN(num) && isFinite(num)) {
            numericData.push({ rowIndex: index, value: num });
        }
    });

    if (numericData.length < 4) {
        // Not enough data for statistical outlier detection
        return { outliers: [], totalOutliers: 0 };
    }

    // Combine results from both methods
    const iqrOutliers = detectOutliersIQR(numericData);
    const zScoreOutliers = detectOutliersZScore(numericData);

    // Merge and deduplicate (prefer more severe classification)
    const outlierMap = new Map<number, {
        rowIndex: number;
        value: number;
        severity: 'MILD' | 'MODERATE' | 'EXTREME';
        method: 'IQR' | 'Z_SCORE';
        expectedRange?: string;
    }>();

    for (const outlier of iqrOutliers.outliers) {
        outlierMap.set(outlier.rowIndex, { ...outlier, method: 'IQR' });
    }

    for (const outlier of zScoreOutliers.outliers) {
        const existing = outlierMap.get(outlier.rowIndex);
        if (!existing || getSeverityScore(outlier.severity) > getSeverityScore(existing.severity)) {
            outlierMap.set(outlier.rowIndex, { ...outlier, method: 'Z_SCORE' });
        }
    }

    const outliers = Array.from(outlierMap.values()).sort((a, b) =>
        getSeverityScore(b.severity) - getSeverityScore(a.severity)
    );

    return {
        outliers,
        totalOutliers: outliers.length,
    };
}

// IQR (Interquartile Range) method
function detectOutliersIQR(data: Array<{ rowIndex: number; value: number }>) {
    const values = data.map(d => d.value).sort((a, b) => a - b);

    // Calculate quartiles
    const q1 = percentile(values, 25);
    const q3 = percentile(values, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const extremeLowerBound = q1 - 3 * iqr;
    const extremeUpperBound = q3 + 3 * iqr;

    const outliers = data
        .filter(d => d.value < lowerBound || d.value > upperBound)
        .map(d => ({
            rowIndex: d.rowIndex,
            value: d.value,
            severity: (d.value < extremeLowerBound || d.value > extremeUpperBound)
                ? ('EXTREME' as const)
                : ('MILD' as const),
            method: 'IQR' as const,
            expectedRange: `${lowerBound.toFixed(2)} to ${upperBound.toFixed(2)}`,
        }));

    return { outliers };
}

// Z-Score method
function detectOutliersZScore(data: Array<{ rowIndex: number; value: number }>) {
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
        // No variation = no outliers
        return { outliers: [] };
    }

    const outliers = data
        .map(d => {
            const zScore = Math.abs((d.value - mean) / stdDev);
            return { ...d, zScore };
        })
        .filter(d => d.zScore > 2)
        .map(d => ({
            rowIndex: d.rowIndex,
            value: d.value,
            severity: d.zScore > 3 ? ('EXTREME' as const) : ('MODERATE' as const),
            method: 'Z_SCORE' as const,
            expectedRange: `${(mean - 2 * stdDev).toFixed(2)} to ${(mean + 2 * stdDev).toFixed(2)}`,
        }));

    return { outliers };
}

// Calculate percentile
function percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
        return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// Severity scoring for deduplication
function getSeverityScore(severity: 'MILD' | 'MODERATE' | 'EXTREME'): number {
    const scores = { MILD: 1, MODERATE: 2, EXTREME: 3 };
    return scores[severity];
}
