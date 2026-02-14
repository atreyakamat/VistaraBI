// Module 5B — Data Loader
// Fetches Source + CleanedDataset data and builds in-memory maps for fast KPI computation

import db from '../prisma';
import type { DataRow, SourceDataMap, ProjectDataMap } from './types';

/**
 * Load all project data into memory for KPI computation.
 * Prefers CleanedDataset (cleaned, normalized rows) over raw Source.data.
 */
export async function loadProjectData(projectId: string): Promise<ProjectDataMap> {
    console.log('[DataLoader] Loading project data for:', projectId);

    // Fetch all sources with their cleaned datasets
    const sources = await db.source.findMany({
        where: { projectId, status: 'READY' },
        select: {
            id: true,
            fileName: true,
            columns: true,
            data: true,
            cleanedDataset: {
                select: {
                    cleanedData: true,
                    cleanedColumns: true,
                    cleanedRowCount: true,
                },
            },
        },
    });

    const sourceMap = new Map<string, SourceDataMap>();

    for (const source of sources) {
        // Prefer cleaned data over raw data
        const useCleaned = source.cleanedDataset &&
            Array.isArray(source.cleanedDataset.cleanedData) &&
            (source.cleanedDataset.cleanedData as unknown[]).length > 0;

        const rows: DataRow[] = useCleaned
            ? (source.cleanedDataset!.cleanedData as unknown as DataRow[])
            : (Array.isArray(source.data) ? (source.data as unknown as DataRow[]) : []);

        const columns = useCleaned
            ? source.cleanedDataset!.cleanedColumns
            : source.columns;

        // Normalize column names to lowercase for consistent lookups
        const normalizedRows = rows.map(row => {
            const normalized: DataRow = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[key.toLowerCase()] = value;
            }
            return normalized;
        });

        const normalizedColumns = columns.map(c => c.toLowerCase());

        sourceMap.set(source.id, {
            sourceId: source.id,
            sourceName: source.fileName,
            columns: normalizedColumns,
            rows: normalizedRows,
        });
    }

    console.log(`[DataLoader] Loaded ${sourceMap.size} sources, ` +
        `${Array.from(sourceMap.values()).reduce((sum, s) => sum + s.rows.length, 0)} total rows`);

    return {
        projectId,
        sources: sourceMap,
    };
}

/**
 * Get column values from a specific source.
 * Returns an array of values for the given column, filtering nulls.
 */
export function getColumnValues(
    dataMap: ProjectDataMap,
    sourceId: string,
    column: string
): unknown[] {
    const source = dataMap.sources.get(sourceId);
    if (!source) return [];

    const col = column.toLowerCase();
    return source.rows
        .map(row => row[col])
        .filter(v => v !== null && v !== undefined);
}

/**
 * Get unique values for a column — used for filter option discovery.
 */
export function getUniqueColumnValues(
    dataMap: ProjectDataMap,
    sourceId: string,
    column: string
): unknown[] {
    const values = getColumnValues(dataMap, sourceId, column);
    return [...new Set(values.map(v => String(v)))];
}

/**
 * Find which source contains a given column.
 * Searches across all loaded sources.
 */
export function findSourceForColumn(
    dataMap: ProjectDataMap,
    column: string
): SourceDataMap | null {
    const col = column.toLowerCase();
    for (const source of dataMap.sources.values()) {
        if (source.columns.includes(col)) {
            return source;
        }
    }
    return null;
}

/**
 * Get rows from a source, optionally finding it by column name.
 */
export function getSourceRows(
    dataMap: ProjectDataMap,
    sourceId: string
): DataRow[] {
    return dataMap.sources.get(sourceId)?.rows ?? [];
}
