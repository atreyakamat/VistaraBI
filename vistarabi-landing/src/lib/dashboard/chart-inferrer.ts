// Module 5A — Chart Intelligence Engine
// Data-profiling based decision engine for automatic chart type selection
// Analyzes KPI datasets and selects optimal visualization from 15 chart types

import type {
    ChartType,
    ChartLibrary,
    ChartSelection,
    DataProfile,
    DistributionType,
    CardinalityLevel,
} from './types';
import type { DataRow } from '../visualization/types';

// ─── Data Profiling ───────────────────────────────────────────────

/**
 * Profile a dataset to extract characteristics that drive chart selection.
 */
export function profileData(
    rows: DataRow[],
    columns: string[],
    formula: string
): DataProfile {
    const numericColumns: string[] = [];
    const categoryColumns: string[] = [];
    let dateColumn: string | undefined;
    let hasTimeDimension = false;

    // Classify columns by type
    for (const col of columns) {
        const sampleValues = rows.slice(0, 100).map(r => r[col]).filter(v => v != null);
        if (sampleValues.length === 0) continue;

        if (isDateColumn(col, sampleValues)) {
            hasTimeDimension = true;
            if (!dateColumn) dateColumn = col;
        } else if (isNumericColumn(sampleValues)) {
            numericColumns.push(col);
        } else {
            categoryColumns.push(col);
        }
    }

    // Compute unique category count (max across categorical columns)
    let uniqueCategoryCount = 0;
    for (const col of categoryColumns) {
        const unique = new Set(rows.map(r => String(r[col] ?? '')));
        uniqueCategoryCount = Math.max(uniqueCategoryCount, unique.size);
    }

    // Compute volatility index for primary numeric column
    const primaryNumCol = extractFormulaColumn(formula) || numericColumns[0];
    let volatilityIndex = 0;
    if (primaryNumCol) {
        const values = rows
            .map(r => parseFloat(String(r[primaryNumCol.toLowerCase()] ?? '')))
            .filter(v => !isNaN(v));
        if (values.length > 1) {
            const mean = values.reduce((s, v) => s + v, 0) / values.length;
            if (mean !== 0) {
                const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
                volatilityIndex = Math.sqrt(variance) / Math.abs(mean);
            }
        }
    }

    // Determine distribution type
    const distributionType = computeDistribution(rows, primaryNumCol);

    // Cardinality level
    const cardinalityLevel = getCardinalityLevel(uniqueCategoryCount);

    // Hierarchical depth (number of categorical dimensions)
    const hierarchicalDepth = categoryColumns.length;

    // Sequential change detection
    const isSequentialChange = hasTimeDimension && formula.toLowerCase().includes('count');

    // Number of series (categorical columns with <10 unique values -> potential series)
    let numberOfSeries = 1;
    for (const col of categoryColumns) {
        const unique = new Set(rows.map(r => String(r[col] ?? '')));
        if (unique.size >= 2 && unique.size <= 10) {
            numberOfSeries = Math.max(numberOfSeries, unique.size);
            break;
        }
    }

    return {
        hasTimeDimension,
        numberOfSeries,
        uniqueCategoryCount,
        numericDimensionCount: numericColumns.length,
        hierarchicalDepth,
        recordCount: rows.length,
        volatilityIndex,
        distributionType,
        cardinalityLevel,
        isSequentialChange,
        dateColumn,
        categoryColumns,
        numericColumns,
    };
}

// ─── Chart Selection Engine ───────────────────────────────────────

/**
 * Select the optimal chart type based on data profile.
 * Uses a deterministic rule engine inspired by visualization best practices.
 */
export function selectChart(profile: DataProfile): ChartSelection {
    // Rule 1: Time-series data
    if (profile.hasTimeDimension) {
        return selectTimeSeriesChart(profile);
    }

    // Rule 2: Hierarchical data
    if (profile.hierarchicalDepth >= 2) {
        return makeSelection(
            'treemap', 'plotly',
            'bar', 'chartjs',
            0.85, 'Hierarchical data with multiple category levels'
        );
    }

    // Rule 3: Multi-numeric dimensions
    if (profile.numericDimensionCount >= 3) {
        return makeSelection(
            'bubble', 'chartjs',
            'scatter', 'chartjs',
            0.80, '3+ numeric dimensions ideal for bubble chart'
        );
    }

    // Rule 4: Distribution analysis
    if (profile.distributionType === 'skewed') {
        return makeSelection(
            'box_plot', 'plotly',
            'bar', 'chartjs',
            0.75, 'Skewed distribution benefits from box plot visualization'
        );
    }

    if (profile.distributionType === 'bimodal') {
        return makeSelection(
            'violin', 'plotly',
            'box_plot', 'plotly',
            0.70, 'Complex distribution needs violin plot'
        );
    }

    // Rule 5: Categorical data
    if (profile.uniqueCategoryCount > 0) {
        return selectCategoricalChart(profile);
    }

    // Rule 6: Scatter for 2 numeric dimensions
    if (profile.numericDimensionCount === 2) {
        return makeSelection(
            'scatter', 'chartjs',
            'bar', 'chartjs',
            0.75, 'Two numeric dimensions suit scatter plot'
        );
    }

    // Default: metric card
    return makeSelection(
        'metric_card', 'chartjs',
        'bar', 'chartjs',
        0.60, 'Default metric card for single-value KPIs'
    );
}

// ─── Time-Series Selection ────────────────────────────────────────

function selectTimeSeriesChart(profile: DataProfile): ChartSelection {
    const { numberOfSeries, volatilityIndex } = profile;

    if (numberOfSeries === 1) {
        if (volatilityIndex > 0.3) {
            return makeSelection(
                'area', 'chartjs',
                'line', 'chartjs',
                0.90, 'High volatility time-series -> area chart for visual weight'
            );
        }
        return makeSelection(
            'line', 'chartjs',
            'area', 'chartjs',
            0.95, 'Single-series time data -> clean line chart'
        );
    }

    if (numberOfSeries >= 2 && numberOfSeries <= 3) {
        return makeSelection(
            'line', 'chartjs',
            'bar', 'chartjs',
            0.90, 'Multi-series (2–3) time data -> multi-line chart'
        );
    }

    if (numberOfSeries >= 4 && numberOfSeries <= 6) {
        return makeSelection(
            'area', 'chartjs',
            'line', 'chartjs',
            0.85, '4–6 series -> stacked area for composition'
        );
    }

    // >6 series -> heatmap
    return makeSelection(
        'heatmap', 'plotly',
        'line', 'chartjs',
        0.80, 'Many series (>6) -> heatmap for density view'
    );
}

// ─── Categorical Selection ────────────────────────────────────────

function selectCategoricalChart(profile: DataProfile): ChartSelection {
    const { uniqueCategoryCount } = profile;

    if (uniqueCategoryCount <= 5) {
        return makeSelection(
            'doughnut', 'chartjs',
            'pie', 'chartjs',
            0.92, '≤5 categories -> doughnut for clear proportions'
        );
    }

    if (uniqueCategoryCount <= 10) {
        return makeSelection(
            'bar', 'chartjs',
            'horizontal_bar', 'chartjs',
            0.90, '5–10 categories -> vertical bar chart'
        );
    }

    if (uniqueCategoryCount <= 20) {
        return makeSelection(
            'horizontal_bar', 'chartjs',
            'bar', 'chartjs',
            0.85, '10–20 categories -> horizontal bar for label readability'
        );
    }

    if (uniqueCategoryCount <= 50) {
        return makeSelection(
            'treemap', 'plotly',
            'horizontal_bar', 'chartjs',
            0.80, '20–50 categories -> treemap for area comparison'
        );
    }

    // >50 -> table
    return makeSelection(
        'table', 'chartjs',
        'horizontal_bar', 'chartjs',
        0.70, '50+ categories -> table view with filtering'
    );
}

// ─── Helpers ──────────────────────────────────────────────────────

function makeSelection(
    chartType: ChartType,
    chartLibrary: ChartLibrary,
    fallbackType: ChartType,
    fallbackLibrary: ChartLibrary,
    confidence: number,
    reason: string
): ChartSelection {
    return { chartType, chartLibrary, fallbackType, fallbackLibrary, confidence, reason };
}

function isDateColumn(name: string, values: unknown[]): boolean {
    const datePat = /date|time|day|month|year|period|quarter|week|created|updated/i;
    if (datePat.test(name)) return true;

    // Check first few values
    const sample = values.slice(0, 10);
    let dateCount = 0;
    for (const v of sample) {
        const s = String(v);
        if (/\d{4}-\d{2}-\d{2}/.test(s) || /\d{2}\/\d{2}\/\d{4}/.test(s) || !isNaN(Date.parse(s))) {
            dateCount++;
        }
    }
    return dateCount >= sample.length * 0.6;
}

function isNumericColumn(values: unknown[]): boolean {
    const sample = values.slice(0, 20);
    let numCount = 0;
    for (const v of sample) {
        if (typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)) && v.trim() !== '')) {
            numCount++;
        }
    }
    return numCount >= sample.length * 0.7;
}

function extractFormulaColumn(formula: string): string | null {
    const match = formula.match(/(?:SUM|AVG|COUNT|MIN|MAX|MEAN)\s*\(\s*(\w+)\s*\)/i);
    return match ? match[1] : null;
}

function computeDistribution(rows: DataRow[], column?: string): DistributionType {
    if (!column || rows.length < 10) return 'unknown';

    const values = rows
        .map(r => parseFloat(String(r[column.toLowerCase()] ?? '')))
        .filter(v => !isNaN(v));

    if (values.length < 10) return 'unknown';

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const median = sorted[Math.floor(n / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return 'uniform';

    // Skewness (Pearson's second coefficient)
    const skewness = 3 * (mean - median) / stddev;

    if (Math.abs(skewness) < 0.3) {
        // Check for bimodality using histogram approach
        const bins = 10;
        const min = sorted[0];
        const max = sorted[n - 1];
        const binSize = (max - min) / bins;

        if (binSize === 0) return 'uniform';

        const histogram = new Array(bins).fill(0);
        for (const v of values) {
            const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
            histogram[idx]++;
        }

        // Look for valley between two peaks
        let peaks = 0;
        for (let i = 1; i < bins - 1; i++) {
            if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
                peaks++;
            }
        }

        return peaks >= 2 ? 'bimodal' : 'normal';
    }

    return 'skewed';
}

function getCardinalityLevel(count: number): CardinalityLevel {
    if (count <= 5) return 'low';
    if (count <= 20) return 'medium';
    if (count <= 100) return 'high';
    return 'very_high';
}
