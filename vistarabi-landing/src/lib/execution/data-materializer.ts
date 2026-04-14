
import db from '../prisma';
import pool from './pool';

// Singleton promise to prevent concurrent materialization runs for the same project
let materializationPromise: Promise<void> | null = null;
const MATERIALIZATION_META_TABLE = 'merged_data_materialization_meta';

interface MaterializationMetaRow {
    project_id: string;
    last_source_update: Date;
    row_count: number;
}

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

export function getMaterializedTableName(projectId: string): string {
    return `merged_data_${projectId.replace(/-/g, '_')}`;
}

async function ensureMaterializationMetaTable(): Promise<void> {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS "${MATERIALIZATION_META_TABLE}" (
            project_id TEXT PRIMARY KEY,
            last_source_update TIMESTAMPTZ NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            materialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

async function readMaterializationMeta(projectId: string): Promise<MaterializationMetaRow | null> {
    const res = await pool.query<MaterializationMetaRow>(
        `SELECT project_id, last_source_update, row_count
         FROM "${MATERIALIZATION_META_TABLE}"
         WHERE project_id = $1`,
        [projectId]
    );
    return res.rows[0] ?? null;
}

async function upsertMaterializationMeta(projectId: string, lastSourceUpdate: Date, rowCount: number): Promise<void> {
    await pool.query(
        `
            INSERT INTO "${MATERIALIZATION_META_TABLE}" (project_id, last_source_update, row_count, materialized_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (project_id) DO UPDATE
            SET last_source_update = EXCLUDED.last_source_update,
                row_count = EXCLUDED.row_count,
                materialized_at = NOW();
        `,
        [projectId, lastSourceUpdate, rowCount]
    );
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
            const tableName = getMaterializedTableName(projectId);
            await ensureMaterializationMetaTable();

            const sourceFreshness = await db.source.findMany({
                where: { projectId },
                select: {
                    uploadedAt: true,
                    cleanedDataset: {
                        select: {
                            cleanedAt: true,
                        },
                    },
                },
            });

            const hasSources = sourceFreshness.length > 0;
            const latestSourceUpdate = sourceFreshness.reduce((latest, source) => {
                const sourceUpdatedAt = source.uploadedAt ?? new Date(0);
                const cleanedUpdatedAt = source.cleanedDataset?.cleanedAt ?? new Date(0);
                const candidate = sourceUpdatedAt > cleanedUpdatedAt ? sourceUpdatedAt : cleanedUpdatedAt;
                return candidate > latest ? candidate : latest;
            }, new Date(0));

            // 1. Check if table exists
            const tableCheck = await pool.query<{ exists: boolean }>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                );
            `, [tableName]);

            const tableExists = tableCheck.rows[0].exists;

            if (tableExists) {
                const countCheck = await pool.query<{ count: string }>(`SELECT COUNT(*) FROM "${tableName}"`);
                const rowCount = parseInt(countCheck.rows[0].count, 10);
                const meta = await readMaterializationMeta(projectId);
                const tableIsFresh =
                    hasSources &&
                    rowCount > 0 &&
                    !!meta &&
                    meta.last_source_update.getTime() >= latestSourceUpdate.getTime();

                if (tableIsFresh) {
                    return;
                }
            }

            // 2. Materialize data
            console.log(`[Materializer] Materializing data for project: ${projectId} into table: ${tableName}`);

            // Fetch ALL sources for this project
            const sources = await db.source.findMany({
                where: { projectId },
                include: { cleanedDataset: true }
            });

            if (!sources.length) {
                console.warn(`[Materializer] No sources found for project: ${projectId}`);
                if (tableExists) {
                    await pool.query(`DELETE FROM "${tableName}"`);
                }
                await upsertMaterializationMeta(projectId, new Date(), 0);
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
            await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);

            const colDefs = allColumns.map(c => `"${c}" TEXT`).join(', ');
            await pool.query(`CREATE TABLE "${tableName}" (${colDefs});`);

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

                await pool.query(`INSERT INTO "${tableName}" (${insertCols}) VALUES ${valuesPart};`);
            }

            // Type date columns
            const dateCol = allColumns.find(c => c.includes('date'));
            if (dateCol) {
                try {
                    await pool.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${dateCol}" TYPE TIMESTAMP USING "${dateCol}"::TIMESTAMP;`);
                } catch (e: any) {
                    console.warn(`[Materializer] Failed to cast date column "${dateCol}" to TIMESTAMP: ${e.message}`);
                    // Try alternative casting approaches
                    try {
                        await pool.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${dateCol}" TYPE TIMESTAMPTZ USING "${dateCol}"::TIMESTAMPTZ;`);
                    } catch (e2: any) {
                        console.warn(`[Materializer] Failed to cast date column "${dateCol}" to TIMESTAMPTZ: ${e2.message}`);
                    }
                }
            }

            // Type numeric columns
            for (const c of allColumns) {
                if (c.includes('date') || c.includes('name') || c === 'category' || c === 'id' || c.includes('email') || c.includes('address') || c.includes('city') || c.includes('state') || c.includes('country')) continue;
                try {
                    await pool.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${c}" TYPE NUMERIC USING "${c}"::NUMERIC;`);
                } catch (e) { /* not numeric, skip */ }
            }

            await upsertMaterializationMeta(
                projectId,
                latestSourceUpdate.getTime() > 0 ? latestSourceUpdate : new Date(),
                allRows.length
            );

            console.log(`[Materializer] ✅ Data materialized for project ${projectId}`);
        } finally {
            materializationPromise = null;
        }
    })();

    return materializationPromise;
}
