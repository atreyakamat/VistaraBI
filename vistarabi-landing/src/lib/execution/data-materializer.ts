
import db from '../prisma';
import pool from './pool';

// Singleton promise to prevent concurrent materialization runs for the same project
let materializationPromise: Promise<void> | null = null;

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
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'merged_data'
                );
            `);

            const tableExists = tableCheck.rows[0].exists;

            if (tableExists) {
                // For now, if table exists, check if it has data.
                const countCheck = await pool.query('SELECT COUNT(*) FROM "merged_data"');
                if (parseInt(countCheck.rows[0].count) > 0) {
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
            const allRows: any[] = [];

            for (const source of sources) {
                const useCleaned = source.cleanedDataset && 
                                Array.isArray(source.cleanedDataset.cleanedData) && 
                                source.cleanedDataset.cleanedData.length > 0;
                
                const columns: string[] = useCleaned ? source.cleanedDataset!.cleanedColumns : source.columns;
                const rows: any[] = useCleaned ? (source.cleanedDataset!.cleanedData as any[]) : (source.data as any[]);

                if (!Array.isArray(rows)) continue;

                columns.forEach(c => allColumnsSet.add(c.toLowerCase()));
                allRows.push(...rows);
            }

            const allColumns = Array.from(allColumnsSet);

            // Drop and recreate
            await pool.query('DROP TABLE IF EXISTS "merged_data" CASCADE;');

            const colDefs = allColumns.map(c => `"${c}" TEXT`).join(', ');
            await pool.query(`CREATE TABLE "merged_data" (${colDefs});`);

            // Insert rows in batches
            const insertCols = allColumns.map(c => `"${c}"`).join(', ');
            const BATCH = 200;

            for (let i = 0; i < allRows.length; i += BATCH) {
                const chunk = allRows.slice(i, i + BATCH);
                const valuesPart = chunk.map((r: any) => {
                    const vals = allColumns.map(c => {
                        const v = r[c] ?? r[c.charAt(0).toUpperCase() + c.slice(1)] ?? r[Object.keys(r).find(k => k.toLowerCase() === c) || ''];
                        if (v === null || v === undefined || v === '') return 'NULL';
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
