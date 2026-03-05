import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const db = new PrismaClient();

async function main() {
    console.log('Fetching source data...');
    const source = await db.source.findFirst({
        where: { projectId: 'bf6aaa8b-c0b0-4901-b348-6f3c93f10589' },
        select: { columns: true, data: true, cleanedDataset: { select: { cleanedData: true, cleanedColumns: true } } }
    });

    if (!source) {
        console.error('No source found.');
        return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vistarabi' });

    console.log('Creating table "merged_data"...');
    await pool.query('DROP TABLE IF EXISTS "merged_data" CASCADE;');

    const useCleaned = source.cleanedDataset && Array.isArray((source.cleanedDataset as any).cleanedData) && (source.cleanedDataset as any).cleanedData.length > 0;
    const columns = useCleaned ? (source.cleanedDataset as any).cleanedColumns : source.columns;
    const rows = useCleaned ? (source.cleanedDataset as any).cleanedData : source.data;

    // Normalize column names
    const colDefs = columns.map((c: string) => `"${c.toLowerCase()}" TEXT`).join(', ');
    await pool.query(`CREATE TABLE "merged_data" (${colDefs});`);

    if (!Array.isArray(rows)) {
        console.error('Rows are not an array');
        return;
    }

    console.log(`Inserting ${rows.length} rows...`);
    const insertCols = columns.map((c: string) => `"${c.toLowerCase()}"`).join(', ');

    for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const valuesPart = chunk.map((r: any) => {
            const vals = columns.map((c: string) => {
                const v = r[c] ?? r[c.toLowerCase()];
                if (v === null || v === undefined) return 'NULL';
                return `'${String(v).replace(/'/g, "''")}'`;
            });
            return `(${vals.join(',')})`;
        }).join(', ');

        await pool.query(`INSERT INTO "merged_data" (${insertCols}) VALUES ${valuesPart};`);
    }

    const dateCol = columns.find((c: string) => c.toLowerCase().includes('date'));
    if (dateCol) {
        // Attempt to alter column to date/timestamp to allow DATE_TRUNC to work in the execution engine
        try {
            await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${dateCol.toLowerCase()}" TYPE TIMESTAMP USING "${dateCol.toLowerCase()}"::TIMESTAMP;`);
        } catch (e) { /* ignore */ }
    }

    // Attempt to type numeric columns automatically
    for (const c of columns) {
        if (c.toLowerCase().includes('date') || c.toLowerCase().includes('name') || c.toLowerCase() === 'category') continue;
        try {
            await pool.query(`ALTER TABLE "merged_data" ALTER COLUMN "${c.toLowerCase()}" TYPE NUMERIC USING "${c.toLowerCase()}"::NUMERIC;`);
        } catch (e) { /* ignore */ }
    }

    console.log('Data materialized successfully!');
    process.exit(0);
}

main().catch(console.error);
