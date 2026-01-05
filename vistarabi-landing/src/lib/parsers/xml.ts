// XML Parser using xml2js

import { parseStringPromise } from 'xml2js';
import { ParseResult } from './csv';

// Flatten XML object to tabular format
function flattenXMLObject(obj: unknown, prefix = ''): Record<string, unknown> {
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
        if (obj.length === 1) {
            // Single element arrays are common in xml2js output
            return flattenXMLObject(obj[0], prefix);
        }
        if (prefix) {
            result[prefix] = JSON.stringify(obj);
        }
        return result;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Skip $ (attributes) and _ (text content) special keys for simplicity
        if (key === '$' || key === '_') continue;

        const newKey = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value) && value.length === 1 && typeof value[0] !== 'object') {
            result[newKey] = value[0];
        } else if (typeof value === 'object') {
            Object.assign(result, flattenXMLObject(value, newKey));
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

export async function parseXML(content: string): Promise<ParseResult> {
    try {
        const parsed = await parseStringPromise(content);

        // Find the root element and its children
        const rootKey = Object.keys(parsed)[0];
        const root = parsed[rootKey];

        // Find repeated elements (likely the data rows)
        let dataArray: unknown[] = [];

        for (const [key, value] of Object.entries(root)) {
            if (Array.isArray(value) && value.length > 1) {
                dataArray = value;
                break;
            }
        }

        // If no repeated elements found, try to use all children
        if (dataArray.length === 0) {
            const firstArrayProp = Object.values(root).find(v => Array.isArray(v));
            if (firstArrayProp && Array.isArray(firstArrayProp)) {
                dataArray = firstArrayProp;
            } else {
                dataArray = [root];
            }
        }

        // Flatten each element
        const flattenedData = dataArray.map(item => flattenXMLObject(item));

        // Collect all columns
        const columnSet = new Set<string>();
        for (const row of flattenedData) {
            Object.keys(row).forEach(key => columnSet.add(key));
        }
        const columns = Array.from(columnSet);

        // Normalize data
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
        throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
