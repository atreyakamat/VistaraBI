const LOCATION_COLUMN_PATTERN = /(store|branch|outlet|location|city|region|area|zone|district|pincode|zip)/i;
const MAX_LOCATIONS = 8;
const ROW_SCAN_LIMIT = 500;

export interface SourceLocationSnapshot {
    columns: string[];
    data: unknown;
}

function normalizeColumnName(column: string): string {
    return column
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function toTitleCase(value: string): string {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
}

function normalizeLocationValue(rawValue: unknown): string | null {
    if (rawValue === null || rawValue === undefined) return null;

    const value = String(rawValue).trim();
    if (!value) return null;
    if (value.length > 48) return null;

    // Common non-location placeholders from exports.
    if (/^(na|n\/a|null|unknown|none|-|0)$/i.test(value)) {
        return null;
    }

    if (/^\d+$/.test(value)) {
        return `Store ${value}`;
    }

    const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return null;

    // Keep mixed-case business labels, title-case simple lowercase labels.
    if (normalized === normalized.toLowerCase()) {
        return toTitleCase(normalized);
    }
    return normalized;
}

function collectRowLocationColumns(columns: string[]): string[] {
    return columns.filter((column) => LOCATION_COLUMN_PATTERN.test(normalizeColumnName(column)));
}

export function extractLocationsFromSourceData(sources: SourceLocationSnapshot[]): string[] {
    const uniqueLocations = new Set<string>();

    for (const source of sources) {
        if (uniqueLocations.size >= MAX_LOCATIONS) break;
        if (!Array.isArray(source.columns) || source.columns.length === 0) continue;

        const locationColumns = collectRowLocationColumns(source.columns);
        if (locationColumns.length === 0) continue;

        if (!Array.isArray(source.data)) continue;

        const rows = source.data.slice(0, ROW_SCAN_LIMIT);
        for (const row of rows) {
            if (uniqueLocations.size >= MAX_LOCATIONS) break;
            if (!row || typeof row !== 'object' || Array.isArray(row)) continue;

            const record = row as Record<string, unknown>;

            for (const column of locationColumns) {
                const location = normalizeLocationValue(record[column]);
                if (!location) continue;
                uniqueLocations.add(location);
                if (uniqueLocations.size >= MAX_LOCATIONS) break;
            }
        }
    }

    return Array.from(uniqueLocations);
}

export function fallbackLocationsForDomain(domain: string): string[] {
    if (domain.toUpperCase() === 'RETAIL') {
        return ['Store Alpha', 'Store Beta', 'Store Gamma'];
    }
    return ['Mumbai', 'Delhi', 'Bangalore'];
}

