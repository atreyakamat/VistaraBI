// Text standardizer - normalizes text fields

export interface TextStandardizerResult {
    cleanedData: Record<string, unknown>[];
    textsStandardized: number;
}

export function standardizeText(
    data: Record<string, unknown>[],
    textColumns: string[]
): TextStandardizerResult {
    if (data.length === 0 || textColumns.length === 0) {
        return { cleanedData: data, textsStandardized: 0 };
    }

    let textsStandardized = 0;
    const cleanedData = data.map(row => ({ ...row }));

    for (const row of cleanedData) {
        for (const colName of textColumns) {
            const value = row[colName];
            if (value === null || value === undefined) continue;

            const strValue = String(value);
            const standardized = standardizeTextValue(strValue, colName);

            if (standardized !== strValue) {
                row[colName] = standardized;
                textsStandardized++;
            }
        }
    }

    return { cleanedData, textsStandardized };
}

// Standardize a single text value
function standardizeTextValue(value: string, columnName: string): string {
    // Trim whitespace
    let cleaned = value.trim();

    // Collapse multiple spaces into single space
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Remove special formatting characters (but keep basic punctuation)
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters

    // Apply title case for name-like columns
    if (isNameColumn(columnName)) {
        cleaned = toTitleCase(cleaned);
    }

    return cleaned;
}

// Check if column is likely a name field
function isNameColumn(columnName: string): boolean {
    const lowerName = columnName.toLowerCase();
    const nameIndicators = ['name', 'customer', 'client', 'vendor', 'supplier', 'person', 'user', 'contact'];
    return nameIndicators.some(indicator => lowerName.includes(indicator));
}

// Convert to title case
function toTitleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}
