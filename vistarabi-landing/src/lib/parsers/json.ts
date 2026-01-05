// JSON Parser - Flattens nested JSON to tabular format

import { ParseResult } from './csv';

// Flatten a nested object into a single-level object with dot notation keys
function flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (obj === null || obj === undefined) {
        return result;
    }

    if (typeof obj !== 'object') {
        if (prefix) {
            result[prefix] = obj;
        }
        return result;
    }

    if (Array.isArray(obj)) {
        // For arrays, we'll stringify them
        if (prefix) {
            result[prefix] = JSON.stringify(obj);
        }
        return result;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
            // Check if it's an array of primitives or objects
            if (value.length > 0 && typeof value[0] === 'object') {
                result[newKey] = JSON.stringify(value);
            } else {
                result[newKey] = value.join(', ');
            }
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

export async function parseJSON(content: string): Promise<ParseResult> {
    try {
        const parsed = JSON.parse(content);

        // Handle array of objects (most common case)
        let dataArray: unknown[];

        if (Array.isArray(parsed)) {
            dataArray = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
            // Find the first array property or wrap the object
            const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
            if (arrayProp && Array.isArray(arrayProp)) {
                dataArray = arrayProp;
            } else {
                dataArray = [parsed];
            }
        } else {
            throw new Error('JSON must be an array or object');
        }

        // Flatten each object
        const flattenedData = dataArray.map(item => flattenObject(item));

        // Collect all unique columns
        const columnSet = new Set<string>();
        for (const row of flattenedData) {
            Object.keys(row).forEach(key => columnSet.add(key));
        }
        const columns = Array.from(columnSet);

        // Normalize data to have all columns
        const normalizedData = flattenedData.map(row => {
            const normalized: Record<string, unknown> = {};
            for (const col of columns) {
                normalized[col] = row[col] ?? '';
            }
            return normalized;
        });

        return {
            columns,
            data: normalizedData,
            rowCount: normalizedData.length,
            colCount: columns.length,
        };
    } catch (error) {
        throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
