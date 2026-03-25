
import db from '../prisma';
import pool from './pool';

// Singleton promise to prevent concurrent materialization runs for the same project
let materializationPromise: Promise<void> | null = null;

interface DataRow {
    [key: string]: unknown;
}

function isDataRow(value: unknown): value is DataRow {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDataRows(value: unknown): DataRow[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isDataRow);
}

function resolveColumnValue(row: DataRow, normalizedColumn: string): unknown {
    if (normalizedColumn in row) return row[normalizedColumn];
    const capitalized = `${normalizedColumn.charAt(0).toUpperCase()}${normalizedColumn.slice(1)}`;
    if (capitalized in row) return row[capitalized];

    const matchedKey = Object.keys(row).find(key => key.toLowerCase() === normalizedColumn);
    if (!matchedKey) return undefined;
    return row[matchedKey];
}

/**
 * Ensures the physical "merged_data" table exists and contains data for the specified project.
 * If the table is missing, it will be created.
 * If the project data is missing from the table, it will be materialized.
 */
export async function ensureDataMaterialized(projectId: string): Promise<void> {
    if (materializationPromise) return materializationPromise;

    materializationPromise = (async () => {
        try {
            // 1. Check if table exists
            const tableCheck = await pool.query<{ exists: boolean }>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'merged_data'
                );
            `);

            const tableExists = tableCheck.rows[0].exists;

            if (tableExists) {
                // For now, if table exists, check if it has data.
                const countCheck = await pool.query<{ count: string }>('SELECT COUNT(*) FROM "merged_data"');
                if (parseInt(countCheck.rows[0].count, 10) > 0) {
                    return;
                }
            }

            // 2. Materialize data
            console.log(`[Materializer] Materializing data for project: ${projectId}`);

            // Fetch ALL sources for this project
            const sources = await db.source.findMany({
                where: { projectId },
                include: { cleanedDataset: true }
            });

            if (!sources.length) {
                console.warn(`[Materializer] No sources found for project: ${projectId}`);
                return;
            }

            // Collect all unique columns across all sources
            const allColumnsSet = new Set<string>();
            const allRows: DataRow[] = [];

            for (const source of sources) {
                const cleanedRows = toDataRows(source.cleanedDataset?.cleanedData);
                const useCleaned = cleanedRows.length > 0;
                
                const columns: string[] = useCleaned
                    ? (source.cleanedDataset?.cleanedColumns ?? source.columns)
                    : source.columns;
                const rows = useCleaned ? cleanedRows : toDataRows(source.data);

                columns.forEach(c => allColumnsSet.add(c.toLowerCase()));
                allRows.push(...rows);
            }

            const allColumns = Array.from(allColumnsSet);
            if (allColumns.length === 0) {
                console.warn(`[Materializer] No columns detected for project: ${projectId}`);
                return;
            }

            // Drop and recreate
            await pool.query('DROP TABLE IF EXISTS "merged_data" CASCADE;');

            const colDefs = allColumns.map(c => `"${c}" TEXT`).join(', ');
            await pool.query(`CREATE TABLE "merged_data" (${colDefs});`);

            // Insert rows in batches
            const insertCols = allColumns.map(c => `"${c}"`).join(', ');
            const BATCH = 200;

            for (let i = 0; i < allRows.length; i += BATCH) {
                const chunk = allRows.slice(i, i + BATCH);
                const valuesPart = chunk.map((r: DataRow) => {
                    const vals = allColumns.map(c => {
                        const v = resolveColumnValue(r, c);
                        if (v === null || v === undefined || String(v) === '') return 'NULL';
                        return `'${String(v).replace(/'/g, "''")}'`;
                    });
                    return `(${vals.join(',')})`;
                }).join(', ');

                await pool.query(`INSERT INTO "merged_data" (${insertCols}) VALUES ${valuesPart};`);
            }

            // Type date columns
            const dateCol = allColumns.find(c => c.includes('date'));
            if (dateCol) {
                try {
                    await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${dateCol}" TYPE TIMESTAMP USING "${dateCol}"::TIMESTAMP;`);
                } catch (e) { /* ignore cast errors */ }
            }

            // Type numeric columns
            for (const c of allColumns) {
                if (c.includes('date') || c.includes('name') || c === 'category' || c === 'id' || c.includes('email') || c.includes('address') || c.includes('city') || c.includes('state') || c.includes('country')) continue;
                try {
                    await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${c}" TYPE NUMERIC USING "${c}"::NUMERIC;`);
                } catch (e) { /* not numeric, skip */ }
            }

            console.log(`[Materializer] ✅ Data materialized for project ${projectId}`);
        } finally {
            materializationPromise = null;
        }
    })();

    return materializationPromise;
}
