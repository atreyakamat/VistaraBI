// Column Intelligence Engine
// Analyzes column names, infers data types, calculates statistics

import { DataType, QualityScore } from '@/lib/prisma';

// Normalize column names to snake_case
export function normalizeColumnName(name: string): string {
    return name
        // Replace spaces, hyphens, dots with underscores
        .replace(/[\s\-\.]+/g, '_')
        // Insert underscore before uppercase letters (camelCase)
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        // Convert to lowercase
        .toLowerCase()
        // Remove any non-alphanumeric characters except underscores
        .replace(/[^a-z0-9_]/g, '')
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '')
        // Collapse multiple underscores
        .replace(/_+/g, '_');
}

// Infer data type from values
export function inferDataType(values: unknown[]): DataType {
    // Filter out null/undefined/empty values
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (validValues.length === 0) return 'TEXT';

    // Sample up to 100 values for inference
    const sample = validValues.slice(0, 100);

    let dateCount = 0;
    let numberCount = 0;
    let booleanCount = 0;

    for (const value of sample) {
        const str = String(value).trim();

        // Check boolean
        if (/^(true|false|yes|no|0|1)$/i.test(str)) {
            booleanCount++;
            continue;
        }

        // Check number
        if (/^-?\d+\.?\d*$/.test(str) || /^-?\d*\.?\d+$/.test(str)) {
            numberCount++;
            continue;
        }

        // Check date patterns
        if (isDateLike(str)) {
            dateCount++;
            continue;
        }
    }

    const total = sample.length;
    const threshold = 0.8; // 80% must match

    if (dateCount / total >= threshold) return 'DATE';
    if (numberCount / total >= threshold) return 'NUMBER';
    if (booleanCount / total >= threshold) return 'BOOLEAN';

    return 'TEXT';
}

// Check if string looks like a date
function isDateLike(str: string): boolean {
    // Common date patterns
    const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // ISO: 2024-01-15
        /^\d{2}\/\d{2}\/\d{4}/, // US: 01/15/2024
        /^\d{2}-\d{2}-\d{4}/, // EU: 15-01-2024
        /^\d{1,2}\s+\w+\s+\d{4}/, // 15 Jan 2024
        /^\w+\s+\d{1,2},?\s+\d{4}/, // Jan 15, 2024
    ];

    for (const pattern of datePatterns) {
        if (pattern.test(str)) {
            // Verify it's actually parseable
            const parsed = Date.parse(str);
            if (!isNaN(parsed)) return true;
        }
    }

    return false;
}

// Calculate column statistics
export function calculateColumnStats(values: unknown[]): {
    nullPercent: number;
    uniquePercent: number;
    sampleValues: unknown[];
} {
    const total = values.length;
    if (total === 0) {
        return { nullPercent: 100, uniquePercent: 0, sampleValues: [] };
    }

    // Count nulls
    const nullCount = values.filter(v =>
        v === null || v === undefined || v === ''
    ).length;

    // Count unique values
    const uniqueValues = new Set(values.map(v => String(v)));

    // Get sample values (first 5 non-null unique values)
    const sampleSet = new Set<string>();
    const samples: unknown[] = [];
    for (const v of values) {
        if (v !== null && v !== undefined && v !== '') {
            const str = String(v);
            if (!sampleSet.has(str) && samples.length < 5) {
                sampleSet.add(str);
                samples.push(v);
            }
        }
    }

    return {
        nullPercent: Math.round((nullCount / total) * 100),
        uniquePercent: Math.round((uniqueValues.size / total) * 100),
        sampleValues: samples,
    };
}

// Calculate overall quality score for a source
export function calculateQualityScore(columnStats: { nullPercent: number; uniquePercent: number }[]): QualityScore {
    if (columnStats.length === 0) return 'POOR';

    const avgNullPercent = columnStats.reduce((sum, c) => sum + c.nullPercent, 0) / columnStats.length;

    if (avgNullPercent < 5) return 'GOOD';
    if (avgNullPercent < 20) return 'PARTIAL';
    return 'POOR';
}
