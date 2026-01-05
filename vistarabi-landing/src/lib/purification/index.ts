// Main purification orchestrator - runs full cleaning pipeline

import db from '@/lib/prisma';
import { handleNulls } from './null-handler';
import { removeDuplicates } from './duplicate-detector';
import { normalizeDates } from './date-normalizer';
import { normalizeCurrencies } from './currency-normalizer';
import { standardizeText } from './text-standardizer';

export async function purifyDataset(sourceId: string): Promise<void> {
    try {
        console.log('[Purification] Starting purification for source:', sourceId);

        // 1. Get source and verify it's ready
        const source = await db.source.findUnique({ where: { id: sourceId } });
        if (!source || source.status !== 'READY') {
            console.log('[Purification] Source not ready, skipping');
            return;
        }

        // Create cleaning status record
        await db.cleanedDataset.create({
            data: {
                sourceId,
                cleanedData: [],
                cleanedRowCount: 0,
                cleanedColCount: 0,
                cleanedColumns: [],
                status: 'CLEANING',
                cleanedAt: new Date(),
            },
        });

        // 2. Get column metadata for intelligence
        const columnMeta = await db.columnMeta.findMany({ where: { sourceId } });
        if (columnMeta.length === 0) {
            console.log('[Purification] No column metadata found, using raw columns');
        }

        // Start with source data
        let cleanedData = source.data.map(row => ({ ...row }));
        const originalRowCount = cleanedData.length;

        // Initialize stats
        let nullsFilled = 0;
        let duplicatesRemoved = 0;
        let datesNormalized = 0;
        let currenciesNormalized = 0;
        let textsStandardized = 0;
        let emptyColumnsRemoved = 0;

        // 3. Handle null values (using column metadata for strategy)
        if (columnMeta.length > 0) {
            const nullResult = handleNulls(cleanedData, columnMeta);
            cleanedData = nullResult.cleanedData;
            nullsFilled = nullResult.nullsFilled;
            console.log('[Purification] Nulls filled:', nullsFilled);
        }

        // 4. Remove duplicates
        const dupResult = removeDuplicates(cleanedData);
        cleanedData = dupResult.cleanedData;
        duplicatesRemoved = dupResult.duplicatesRemoved;
        console.log('[Purification] Duplicates removed:', duplicatesRemoved);

        // 5. Normalize dates
        const dateColumns = columnMeta
            .filter(c => c.dataType === 'DATE')
            .map(c => c.originalName);

        if (dateColumns.length > 0) {
            const dateResult = normalizeDates(cleanedData, dateColumns);
            cleanedData = dateResult.cleanedData;
            datesNormalized = dateResult.datesNormalized;
            console.log('[Purification] Dates normalized:', datesNormalized);
        }

        // 6. Normalize currencies (auto-detect in all columns)
        const currResult = normalizeCurrencies(cleanedData);
        cleanedData = currResult.cleanedData;
        currenciesNormalized = currResult.currenciesNormalized;
        console.log('[Purification] Currencies normalized:', currenciesNormalized);

        // 7. Standardize text
        const textColumns = columnMeta
            .filter(c => c.dataType === 'TEXT')
            .map(c => c.originalName);

        if (textColumns.length > 0) {
            const textResult = standardizeText(cleanedData, textColumns);
            cleanedData = textResult.cleanedData;
            textsStandardized = textResult.textsStandardized;
            console.log('[Purification] Texts standardized:', textsStandardized);
        }

        // 8. Remove empty columns (all null/empty)
        const { cleanedData: finalData, columnsRemoved } = removeEmptyColumns(cleanedData);
        cleanedData = finalData;
        emptyColumnsRemoved = columnsRemoved.length;
        console.log('[Purification] Empty columns removed:', columnsRemoved);

        // 9. Store cleaned dataset
        const cleanedColumns = cleanedData.length > 0 ? Object.keys(cleanedData[0]) : [];

        await db.cleanedDataset.update({
            where: { sourceId },
            data: {
                cleanedData,
                cleanedRowCount: cleanedData.length,
                cleanedColCount: cleanedColumns.length,
                cleanedColumns,
                status: 'CLEANED',
                cleanedAt: new Date(),
            },
        });

        // 10. Create cleaning log
        await db.cleaningLog.create({
            data: {
                sourceId,
                nullsFilled,
                duplicatesRemoved,
                datesNormalized,
                currenciesNormalized,
                textsStandardized,
                emptyColumnsRemoved,
                originalRowCount,
                cleanedRowCount: cleanedData.length,
                createdAt: new Date(),
            },
        });

        // 11. Create transformation audit logs for transparency
        const timestamp = new Date();

        if (nullsFilled > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'NULL_FILL',
                    affectedRowCount: nullsFilled,
                    timestamp,
                },
            });
        }

        if (duplicatesRemoved > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'DUPLICATE_REMOVE',
                    affectedRowCount: duplicatesRemoved,
                    timestamp,
                },
            });
        }

        if (datesNormalized > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'DATE_NORMALIZE',
                    affectedRowCount: datesNormalized,
                    beforeValue: 'Various formats',
                    afterValue: 'ISO 8601 (YYYY-MM-DD)',
                    timestamp,
                },
            });
        }

        if (currenciesNormalized > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'CURRENCY_NORMALIZE',
                    affectedRowCount: currenciesNormalized,
                    beforeValue: 'Various currencies',
                    afterValue: 'USD',
                    timestamp,
                },
            });
        }

        if (textsStandardized > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'TEXT_STANDARDIZE',
                    affectedRowCount: textsStandardized,
                    timestamp,
                },
            });
        }

        if (emptyColumnsRemoved > 0) {
            await db.transformationAudit.create({
                data: {
                    sourceId,
                    transformationType: 'EMPTY_COLUMN_REMOVE',
                    affectedColumn: columnsRemoved.join(', '),
                    affectedRowCount: emptyColumnsRemoved,
                    timestamp,
                },
            });
        }

        console.log('[Purification] Completed successfully for source:', sourceId);
        console.log('[Purification] Original rows:', originalRowCount, '→ Cleaned rows:', cleanedData.length);

        // 12. Auto-trigger quality analysis (Phase 2B)
        const { analyzeQuality } = await import('@/lib/quality');
        await analyzeQuality(sourceId);

    } catch (error) {
        console.error('[Purification] Error:', error);

        // Mark as failed
        await db.cleanedDataset.update({
            where: { sourceId },
            data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        }).catch(() => { });
    }
}

// Remove columns that are completely empty
function removeEmptyColumns(data: Record<string, unknown>[]): {
    cleanedData: Record<string, unknown>[];
    columnsRemoved: string[];
} {
    if (data.length === 0) {
        return { cleanedData: data, columnsRemoved: [] };
    }

    const allColumns = Object.keys(data[0]);
    const columnsToKeep: string[] = [];
    const columnsRemoved: string[] = [];

    for (const col of allColumns) {
        const hasValue = data.some(row => {
            const val = row[col];
            return val !== null && val !== undefined && val !== '';
        });

        if (hasValue) {
            columnsToKeep.push(col);
        } else {
            columnsRemoved.push(col);
        }
    }

    // Create new data with only kept columns
    const cleanedData = data.map(row => {
        const newRow: Record<string, unknown> = {};
        for (const col of columnsToKeep) {
            newRow[col] = row[col];
        }
        return newRow;
    });

    return { cleanedData, columnsRemoved };
}
