import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const db = new PrismaClient();

// Accept projectId from CLI args or use default
const projectId = process.argv[2] || 'bf6aaa8b-c0b0-4901-b348-6f3c93f10589';

async function main() {
    console.log(`Materializing data for project: ${projectId}`);

    // Fetch ALL sources for this project
    const sources = await db.source.findMany({
        where: { projectId },
        select: { id: true, fileName: true, columns: true, data: true, cleanedDataset: { select: { cleanedData: true, cleanedColumns: true } } }
    });

    if (!sources.length) {
        console.error('No sources found for project:', projectId);
        process.exit(1);
    }

    console.log(`Found ${sources.length} source(s)`);

    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vistarabi' });

    // Drop and recreate
    console.log('Dropping existing "merged_data" table...');
    await pool.query('DROP TABLE IF EXISTS "merged_data" CASCADE;');

    // Collect all unique columns across all sources
    const allColumnsSet = new Set<string>();
    const allRows: any[] = [];

    for (const source of sources) {
        const useCleaned = source.cleanedDataset && Array.isArray((source.cleanedDataset as any).cleanedData) && (source.cleanedDataset as any).cleanedData.length > 0;
        const columns: string[] = useCleaned ? (source.cleanedDataset as any).cleanedColumns : source.columns;
        const rows: any[] = useCleaned ? (source.cleanedDataset as any).cleanedData : (source.data as any[]);

        if (!Array.isArray(rows)) {
            console.warn(`Source ${source.fileName}: rows not an array, skipping`);
            continue;
        }

        console.log(`Source: ${source.fileName} — ${columns.length} cols, ${rows.length} rows`);
        columns.forEach(c => allColumnsSet.add(c.toLowerCase()));
        allRows.push(...rows);
    }

    const allColumns = Array.from(allColumnsSet);
    console.log(`Merged schema: ${allColumns.length} columns, ${allRows.length} total rows`);

    // Create table with all columns as TEXT
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

        if (i % 5000 === 0 && i > 0) console.log(`  Inserted ${i}/${allRows.length}...`);
    }

    // Type date columns
    const dateCol = allColumns.find(c => c.includes('date'));
    if (dateCol) {
        try {
            await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${dateCol}" TYPE TIMESTAMP USING "${dateCol}"::TIMESTAMP;`);
            console.log(`Typed "${dateCol}" as TIMESTAMP`);
        } catch (e) { console.warn(`Could not cast ${dateCol} to TIMESTAMP`); }
    }

    // Type numeric columns
    for (const c of allColumns) {
        if (c.includes('date') || c.includes('name') || c === 'category' || c === 'id' || c.includes('email') || c.includes('address') || c.includes('city') || c.includes('state') || c.includes('country')) continue;
        try {
            await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${c}" TYPE NUMERIC USING "${c}"::NUMERIC;`);
        } catch (e) { /* not numeric, skip */ }
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM "merged_data"');
    console.log(`✅ Data materialized! ${countRes.rows[0].count} rows in merged_data`);

    await pool.end();
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
