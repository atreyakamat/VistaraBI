// Date normalizer - converts various date formats to ISO 8601 (YYYY-MM-DD)

export interface DateNormalizerResult {
    cleanedData: Record<string, unknown>[];
    datesNormalized: number;
}

export function normalizeDates(
    data: Record<string, unknown>[],
    dateColumns: string[]
): DateNormalizerResult {
    if (data.length === 0 || dateColumns.length === 0) {
        return { cleanedData: data, datesNormalized: 0 };
    }

    let datesNormalized = 0;
    const cleanedData = data.map(row => ({ ...row }));

    for (const row of cleanedData) {
        for (const colName of dateColumns) {
            const value = row[colName];
            if (value === null || value === undefined || value === '') continue;

            const normalized = parseAndNormalizeDate(String(value));
            if (normalized && normalized !== value) {
                row[colName] = normalized;
                datesNormalized++;
            }
        }
    }

    return { cleanedData, datesNormalized };
}

// Parse various date formats and return ISO date string
function parseAndNormalizeDate(dateStr: string): string | null {
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // Try parsing as Date
    const parsed = new Date(trimmed);

    if (!isNaN(parsed.getTime())) {
        // Valid date - convert to ISO format (YYYY-MM-DD)
        return parsed.toISOString().split('T')[0];
    }

    // Try common date patterns
    const patterns = [
        // MM/DD/YYYY or DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // DD-MM-YYYY or MM-DD-YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        // YYYY.MM.DD
        /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            // Assume US format (MM/DD/YYYY) for now
            const [, part1, part2, part3] = match;

            // Try creating date (assumes MM/DD/YYYY)
            const date = new Date(`${part1}/${part2}/${part3}`);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
    }

    // Return original if can't parse
    return null;
}
