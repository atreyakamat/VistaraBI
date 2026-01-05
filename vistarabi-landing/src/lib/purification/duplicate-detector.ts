// Duplicate detector - removes duplicate rows using hashing

import crypto from 'crypto';

export interface DuplicateDetectorResult {
    cleanedData: Record<string, unknown>[];
    duplicatesRemoved: number;
}

export function removeDuplicates(
    data: Record<string, unknown>[]
): DuplicateDetectorResult {
    if (data.length === 0) {
        return { cleanedData: data, duplicatesRemoved: 0 };
    }

    const seen = new Set<string>();
    const cleanedData: Record<string, unknown>[] = [];
    let duplicatesRemoved = 0;

    for (const row of data) {
        const hash = hashRow(row);

        if (!seen.has(hash)) {
            seen.add(hash);
            cleanedData.push(row);
        } else {
            duplicatesRemoved++;
        }
    }

    return { cleanedData, duplicatesRemoved };
}

// Create deterministic hash of row data
function hashRow(row: Record<string, unknown>): string {
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(row).sort();
    const values = sortedKeys.map(key => String(row[key] ?? '').trim().toLowerCase());
    const rowString = values.join('|');

    return crypto.createHash('md5').update(rowString).digest('hex');
}
