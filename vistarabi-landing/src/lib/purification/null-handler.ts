// Null value handler - fills missing values using statistical strategies

import { ColumnMeta, DataType } from '@/lib/prisma';

export interface NullHandlerResult {
    cleanedData: Record<string, unknown>[];
    nullsFilled: number;
}

export function handleNulls(
    data: Record<string, unknown>[],
    columnMeta: ColumnMeta[]
): NullHandlerResult {
    if (data.length === 0) {
        return { cleanedData: data, nullsFilled: 0 };
    }

    let nullsFilled = 0;
    const cleanedData = data.map(row => ({ ...row }));

    for (const col of columnMeta) {
        const columnName = col.originalName;
        const dataType = col.dataType;

        // Extract non-null values for this column
        const nonNullValues = cleanedData
            .map(row => row[columnName])
            .filter(v => v !== null && v !== undefined && v !== '');

        if (nonNullValues.length === 0) continue;

        // Determine fill strategy based on data type
        let fillValue: unknown;

        switch (dataType) {
            case 'NUMBER':
                fillValue = calculateMean(nonNullValues as number[]);
                break;
            case 'DATE':
                fillValue = calculateMedianDate(nonNullValues);
                break;
            case 'BOOLEAN':
                fillValue = calculateMode(nonNullValues);
                break;
            case 'TEXT':
            default:
                fillValue = calculateMode(nonNullValues);
                break;
        }

        // Fill nulls in cleaned data
        for (const row of cleanedData) {
            if (row[columnName] === null || row[columnName] === undefined || row[columnName] === '') {
                row[columnName] = fillValue;
                nullsFilled++;
            }
        }
    }

    return { cleanedData, nullsFilled };
}

// Calculate mean for numeric columns
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + Number(v), 0);
    return Math.round((sum / values.length) * 100) / 100; // Round to 2 decimal places
}

// Calculate median date
function calculateMedianDate(values: unknown[]): string {
    if (values.length === 0) return new Date().toISOString().split('T')[0];

    const dates = values
        .map(v => new Date(String(v)).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

    if (dates.length === 0) return new Date().toISOString().split('T')[0];

    const mid = Math.floor(dates.length / 2);
    const medianTime = dates.length % 2 === 0
        ? (dates[mid - 1] + dates[mid]) / 2
        : dates[mid];

    return new Date(medianTime).toISOString().split('T')[0];
}

// Calculate mode (most frequent value)
function calculateMode(values: unknown[]): unknown {
    if (values.length === 0) return '';

    const frequency = new Map<string, number>();
    for (const value of values) {
        const key = String(value);
        frequency.set(key, (frequency.get(key) || 0) + 1);
    }

    let maxFreq = 0;
    let mode = values[0];

    for (const [value, freq] of frequency.entries()) {
        if (freq > maxFreq) {
            maxFreq = freq;
            mode = value;
        }
    }

    return mode;
}
